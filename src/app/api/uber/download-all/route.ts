export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — long-running Playwright job

import { NextRequest, NextResponse } from 'next/server';
import { ensureSession, downloadReceipt, extractTripId, closeSession } from '@/lib/uber-automation';
import { mergePdfs } from '@/lib/pdf-merge';
import crypto from 'crypto';

// In-memory store for merged PDFs (token → { buffer, expires })
const pdfStore = new Map<string, { buffer: Uint8Array; expires: number }>();

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of pdfStore) {
    if (val.expires < now) pdfStore.delete(key);
  }
}

/**
 * POST: Download all receipts, merge into one PDF, return a download token.
 * Streams SSE events for progress.
 *
 * Body: { invoices: [{ pdfLink: string, date: string }] }
 */
export async function POST(request: NextRequest) {
  cleanExpired();

  let body: { invoices: { pdfLink: string; date: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { invoices } = body;
  if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
    return NextResponse.json({ error: 'No invoices provided' }, { status: 400 });
  }

  if (invoices.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 receipts per batch' }, { status: 400 });
  }

  // Extract trip IDs, filter out invalid ones
  const trips = invoices
    .map(inv => ({ tripId: extractTripId(inv.pdfLink), date: inv.date, pdfLink: inv.pdfLink }))
    .filter(t => t.tripId !== null) as { tripId: string; date: string; pdfLink: string }[];

  if (trips.length === 0) {
    return NextResponse.json({ error: 'No valid Uber receipt links found' }, { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Phase 1: Ensure Uber session
        await ensureSession((status) => {
          send({ type: 'status', message: status });
        });

        // Phase 2: Download each receipt
        const receipts: { buffer: Buffer; date: string }[] = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < trips.length; i++) {
          const trip = trips[i];
          send({
            type: 'progress',
            current: i + 1,
            total: trips.length,
            message: `Downloading receipt ${i + 1} of ${trips.length}...`,
          });

          try {
            const buffer = await downloadReceipt(trip.tripId);
            receipts.push({ buffer, date: trip.date });
            successCount++;
          } catch (err) {
            failCount++;
            send({
              type: 'warning',
              message: `Failed to download receipt for ${trip.date}: ${err instanceof Error ? err.message : 'unknown error'}`,
            });
          }
        }

        if (receipts.length === 0) {
          send({ type: 'error', message: 'All receipt downloads failed.' });
          controller.close();
          return;
        }

        // Phase 3: Merge PDFs
        send({ type: 'status', message: `Merging ${receipts.length} receipts into one PDF...` });
        const merged = await mergePdfs(receipts);

        // Store with token
        const token = crypto.randomUUID();
        pdfStore.set(token, {
          buffer: merged,
          expires: Date.now() + 5 * 60 * 1000, // 5 minute TTL
        });

        send({
          type: 'complete',
          token,
          successCount,
          failCount,
          message: `Combined PDF ready. ${successCount} receipts merged${failCount > 0 ? `, ${failCount} skipped` : ''}.`,
        });
      } catch (err) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
      } finally {
        await closeSession();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * GET: Serve a previously merged PDF by token.
 * Usage: GET /api/uber/download-all?token=xxx
 */
export async function GET(request: NextRequest) {
  cleanExpired();

  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const entry = pdfStore.get(token);
  if (!entry) {
    return NextResponse.json({ error: 'PDF not found or expired' }, { status: 404 });
  }

  // Remove after download (one-time use)
  pdfStore.delete(token);

  const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  return new Response(Buffer.from(entry.buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Combined_Receipts_${dateStr}.pdf"`,
      'Content-Length': entry.buffer.length.toString(),
    },
  });
}

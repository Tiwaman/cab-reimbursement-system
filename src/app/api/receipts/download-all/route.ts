export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import {
  ensureSession,
  downloadReceipt,
  extractTripId,
  closeSession,
} from "@/lib/uber-automation";
import { mergePdfs } from "@/lib/pdf-merge";
import { authOptions } from "@/lib/auth";
import { InvoiceRecord } from "@/lib/invoice-types";
import { extractBodyAndAttachments } from "@/lib/receipt-parsers/gmail-payload";
import { getBrowserLaunchConfig } from "@/lib/browser-runtime";

const pdfStore = new Map<string, { buffer: Uint8Array; expires: number }>();

function cleanExpired() {
  const now = Date.now();
  for (const [key, val] of pdfStore) {
    if (val.expires < now) pdfStore.delete(key);
  }
}

async function getGmailAttachmentBuffer(
  accessToken: string,
  messageId: string,
  attachmentId: string,
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });
  const response = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });

  if (!response.data.data) {
    throw new Error("Attachment data missing");
  }

  return Buffer.from(response.data.data, "base64url");
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function getGmailMessageHtml(accessToken: string, messageId: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const { body } = extractBodyAndAttachments(response.data.payload);
  if (body.html?.trim()) return body.html;
  if (body.text?.trim()) {
    return `<html><body style="font-family: Arial, sans-serif; padding: 24px;"><pre style="white-space: pre-wrap; font: inherit;">${escapeHtml(body.text)}</pre></body></html>`;
  }

  throw new Error("Email body missing");
}

async function renderHtmlToPdf(html: string) {
  const { chromium, executablePath, args, headless } = await getBrowserLaunchConfig(true);
  const browser = await chromium.launch({
    executablePath,
    args,
    headless,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1800 },
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "screen" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.35in",
        right: "0.35in",
        bottom: "0.35in",
        left: "0.35in",
      },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function getSessionAccessToken(session: unknown): string {
  if (!session || typeof session !== "object") {
    return "";
  }

  const token = (session as { accessToken?: unknown }).accessToken;
  return typeof token === "string" ? token : "";
}

export async function POST(request: NextRequest) {
  cleanExpired();

  let body: { invoices: InvoiceRecord[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { invoices } = body;
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return NextResponse.json(
      { error: "No invoices provided" },
      { status: 400 },
    );
  }

  if (invoices.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 receipts per batch" },
      { status: 400 },
    );
  }

  const uberInvoices = invoices.filter(
    (invoice) => invoice.downloadKind === "uber-trip",
  );
  const rapidoInvoices = invoices.filter(
    (invoice) => invoice.downloadKind === "gmail-attachment",
  );

  const validUberInvoices = uberInvoices
    .map((invoice) => ({ ...invoice, tripId: extractTripId(invoice.pdfLink) }))
    .filter((invoice) => Boolean(invoice.messageId || invoice.tripId));

  const validRapidoInvoices = rapidoInvoices.filter(
    (invoice) => invoice.messageId && invoice.attachmentId,
  );

  if (validUberInvoices.length === 0 && validRapidoInvoices.length === 0) {
    return NextResponse.json(
      { error: "No valid receipt sources found" },
      { status: 400 },
    );
  }

  const session = await getServerSession(authOptions);
  const gmailAccessToken = getSessionAccessToken(session);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const total = validUberInvoices.length + validRapidoInvoices.length;

        const receipts: { buffer: Buffer; date: string }[] = [];
        let successCount = 0;
        let failCount = 0;
        let current = 0;
        let uberSessionReady = false;

        for (const invoice of validUberInvoices) {
          current += 1;
          send({
            type: "progress",
            current,
            total,
            message: `Preparing Uber receipt ${current} of ${total}...`,
          });
          try {
            let buffer: Buffer | null = null;

            if (gmailAccessToken && invoice.messageId) {
              send({
                type: "status",
                message: `Rendering Uber receipt ${current} from Gmail content...`,
              });
              const html = await getGmailMessageHtml(gmailAccessToken, invoice.messageId);
              buffer = await renderHtmlToPdf(html);
            }

            if (!buffer && invoice.tripId) {
              if (!uberSessionReady) {
                await ensureSession((status) => {
                  send({ type: "status", message: status });
                });
                uberSessionReady = true;
              }

              send({
                type: "status",
                message: `Downloading official Uber receipt ${current} from Uber...`,
              });
              buffer = await downloadReceipt(invoice.tripId);
            }

            if (!buffer) {
              throw new Error("No usable Uber receipt source found");
            }

            receipts.push({ buffer, date: invoice.date });
            successCount++;
          } catch (err) {
            failCount++;
            send({
              type: "warning",
              message: `Failed to download Uber receipt for ${invoice.date}: ${err instanceof Error ? err.message : "unknown error"}`,
            });
          }
        }

        for (const invoice of validRapidoInvoices) {
          current += 1;
          send({
            type: "progress",
            current,
            total,
            message: `Fetching Rapido receipt ${current} of ${total}...`,
          });
          try {
            if (!gmailAccessToken)
              throw new Error("Missing Gmail access token");
            const buffer = await getGmailAttachmentBuffer(
              gmailAccessToken,
              invoice.messageId!,
              invoice.attachmentId!,
            );
            receipts.push({ buffer, date: invoice.date });
            successCount++;
          } catch (err) {
            failCount++;
            send({
              type: "warning",
              message: `Failed to fetch Rapido receipt for ${invoice.date}: ${err instanceof Error ? err.message : "unknown error"}`,
            });
          }
        }

        if (receipts.length === 0) {
          send({ type: "error", message: "All receipt downloads failed." });
          controller.close();
          return;
        }

        send({
          type: "status",
          message: `Merging ${receipts.length} receipts into one PDF...`,
        });
        const merged = await mergePdfs(receipts);

        const token = crypto.randomUUID();
        pdfStore.set(token, {
          buffer: merged,
          expires: Date.now() + 5 * 60 * 1000,
        });

        send({
          type: "complete",
          token,
          successCount,
          failCount,
          message: `Combined PDF ready. ${successCount} receipts merged${failCount > 0 ? `, ${failCount} skipped` : ""}.`,
        });
      } catch (err) {
        send({
          type: "error",
          message:
            err instanceof Error ? err.message : "An unexpected error occurred",
        });
      } finally {
        await closeSession();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(request: NextRequest) {
  cleanExpired();

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const entry = pdfStore.get(token);
  if (!entry) {
    return NextResponse.json(
      { error: "PDF not found or expired" },
      { status: 404 },
    );
  }

  pdfStore.delete(token);

  const dateStr = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  return new Response(Buffer.from(entry.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Combined_Receipts_${dateStr}.pdf"`,
      "Content-Length": entry.buffer.length.toString(),
    },
  });
}

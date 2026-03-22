import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import { extractBodyAndAttachments } from '@/lib/receipt-parsers/gmail-payload';
import { parseRapidoInvoice } from '@/lib/receipt-parsers/rapido';
import { InvoiceRecord } from '@/lib/invoice-types';

type GmailApi = ReturnType<typeof google.gmail>;
type GmailMessagePayload = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePayload[];
};

function toDayString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function trimLocation(value: string, fallback: string) {
  const text = value.trim() || fallback;
  return text.length > 45 ? `${text.slice(0, 42)}...` : text;
}

async function fetchUberInvoices(gmail: GmailApi, startDate: string | null, endDate: string | null): Promise<(InvoiceRecord & { dateObj: Date; dedupeKey: string })[]> {
  let q = 'from:noreply@uber.com (subject:trip OR subject:receipt)';
  if (startDate) {
    const startBuffer = new Date(startDate);
    startBuffer.setDate(startBuffer.getDate() - 3);
    q += ` after:${startBuffer.toISOString().split('T')[0].replace(/-/g, '/')}`;
  }
  if (endDate) {
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 2);
    q += ` before:${nextDay.toISOString().split('T')[0].replace(/-/g, '/')}`;
  }

  const response = await gmail.users.messages.list({ userId: 'me', q, maxResults: 40 });
  if (!response.data.messages) return [];

  const rawInvoices = await Promise.all(
    response.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
      let body = '';
      const payload = detail.data.payload as GmailMessagePayload | undefined;
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString();
      } else {
        const part = payload?.parts?.find((p) => p.mimeType === 'text/html');
        if (part?.body?.data) body = Buffer.from(part.body.data, 'base64').toString();
      }

      const $ = cheerio.load(body);
      const directPdf = $('a[href*="download-pdf"]').attr('href');
      const viewReceipt = $('a[href*="receipt"]').attr('href');
      const anyPdf = $('a:contains("PDF")').attr('href');
      const finalPdfLink = (directPdf || anyPdf || viewReceipt || '').trim();

      const amountText = $('td:contains("₹"), span:contains("₹")').first().text().trim();
      const amountMatch = amountText.replace(/,/g, '').match(/₹\s?(\d+\.?\d*)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

      const bodyText = $.root().text();
      const dateMatch = bodyText.match(/(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s\d{4})/i);

      let finalDateObj = new Date(parseInt(detail.data.internalDate!, 10));
      if (dateMatch) {
        const parsedDate = new Date(dateMatch[0]);
        if (!isNaN(parsedDate.getTime())) finalDateObj = parsedDate;
      }

      let tripDetailsFound = false;
      const potentialAddresses: string[] = [];
      const allNodes: string[] = [];

      const addressKeywords = ['Road', 'St', 'Ave', 'Sector', 'Phase', 'Building', 'Block', 'Mumbai', 'Maharashtra', 'India', 'Unnamed', 'Gaothan', 'MIDC', 'Apartment', 'Society', 'Chamber'];
      const boilerplateKeywords = ['hope you enjoyed', 'Wait Time', 'Payments', 'Congrats', 'discount', 'Total', 'Subtotal', 'Promotion', 'Uber', 'Invite', 'Rating', 'Fare', 'Cash', '₹'];
      const zipCodeRegex = /\b\d{6}\b/;

      $('td, div, p, span').each((_, el) => {
        const t = $(el).text().trim().replace(/\s+/g, ' ');
        if (t.length > 5 && !allNodes.includes(t)) allNodes.push(t);

        if (t.toLowerCase().includes('trip details')) {
          tripDetailsFound = true;
          return;
        }

        if (tripDetailsFound && t.length > 15 && t.length < 250) {
          const isBoilerplate = boilerplateKeywords.some(key => t.toLowerCase().includes(key.toLowerCase()));
          const hasZip = zipCodeRegex.test(t);
          const hasSpatialSignal = addressKeywords.some(key => t.toLowerCase().includes(key.toLowerCase()));
          if ((hasZip || hasSpatialSignal) && !isBoilerplate && !potentialAddresses.includes(t)) {
            potentialAddresses.push(t);
          }
        }
      });

      const finalAddresses = potentialAddresses.length >= 2
        ? potentialAddresses
        : allNodes.filter((t: string) => {
            const hasZip = zipCodeRegex.test(t);
            const hasSpatialSignal = addressKeywords.some(key => t.toLowerCase().includes(key.toLowerCase()));
            const isBoilerplate = boilerplateKeywords.some(key => t.toLowerCase().includes(key.toLowerCase()));
            return (hasZip || hasSpatialSignal) && !isBoilerplate && t.length > 15;
          });

      const pickup = trimLocation(finalAddresses[0] || '', 'Unknown Pickup');
      const drop = trimLocation(finalAddresses[1] || finalAddresses[finalAddresses.length - 1] || pickup, pickup);

      return {
        id: msg.id!,
        date: finalDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        dateObj: finalDateObj,
        amount,
        pickup,
        drop,
        pdfLink: finalPdfLink,
        platform: 'uber' as const,
        downloadKind: 'uber-trip' as const,
        messageId: msg.id!,
        dedupeKey: `uber-${finalDateObj.toLocaleDateString('en-GB')}-${amount}-${pickup.slice(0, 20)}`,
      };
    })
  );

  return rawInvoices.filter((invoice) => {
    const invDay = toDayString(invoice.dateObj);
    if (startDate && invDay < startDate) return false;
    if (endDate && invDay > endDate) return false;
    return true;
  });
}

async function fetchRapidoInvoices(gmail: GmailApi, startDate: string | null, endDate: string | null): Promise<(InvoiceRecord & { dateObj: Date; dedupeKeys: string[] })[]> {
  const q = 'from:shoutout@rapido.bike subject:"Rapido Invoice"';
  const response = await gmail.users.messages.list({ userId: 'me', q, maxResults: 100 });
  if (!response.data.messages) return [];

  const parsed = await Promise.all(response.data.messages.map(async (msg) => {
    const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
    const { body, attachments } = extractBodyAndAttachments(detail.data.payload as GmailMessagePayload | undefined);

    return parseRapidoInvoice({
      messageId: msg.id!,
      html: body.html,
      text: body.text,
      attachments,
    });
  }));

  return parsed.filter((invoice): invoice is InvoiceRecord & { dateObj: Date; dedupeKeys: string[] } => {
    if (!invoice) return false;
    const rideDay = toDayString(invoice.dateObj);
    if (startDate && rideDay < startDate) return false;
    if (endDate && rideDay > endDate) return false;
    return true;
  });
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const accessToken = typeof (session as { accessToken?: unknown } | null)?.accessToken === 'string'
      ? (session as { accessToken: string }).accessToken
      : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    const [uberInvoices, rapidoInvoices] = await Promise.all([
      fetchUberInvoices(gmail, startDate, endDate),
      fetchRapidoInvoices(gmail, startDate, endDate),
    ]);

    const uniqueMap = new Map<string, InvoiceRecord & { dateObj: Date }>();

    for (const invoice of uberInvoices) {
      if (!uniqueMap.has(invoice.dedupeKey)) uniqueMap.set(invoice.dedupeKey, invoice);
    }

    for (const invoice of rapidoInvoices) {
      if (invoice.dedupeKeys.some((key) => uniqueMap.has(key))) continue;
      uniqueMap.set(invoice.dedupeKeys[0], invoice);
    }

    const finalInvoices = Array.from(uniqueMap.values())
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      .map((invoice) => {
        const { dateObj, ...rest } = invoice;
        void dateObj;
        return rest;
      });

    return NextResponse.json({ invoices: finalInvoices });
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

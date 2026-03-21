import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    let q = 'from:noreply@uber.com (subject:trip OR subject:receipt)';
    if (startDate) q += ` after:${startDate.replace(/-/g, '/')}`;
    if (endDate) {
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      q += ` before:${nextDay.toISOString().split('T')[0].replace(/-/g, '/')}`;
    }

    const response = await gmail.users.messages.list({ userId: 'me', q, maxResults: 15 });
    if (!response.data.messages) return NextResponse.json({ invoices: [] });

    const invoices = await Promise.all(
      response.data.messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' });
        let body = '';
        const payload = detail.data.payload;
        if (payload?.body?.data) {
          body = Buffer.from(payload.body.data, 'base64').toString();
        } else {
          const part = payload?.parts?.find(p => p.mimeType === 'text/html');
          if (part?.body?.data) body = Buffer.from(part.body.data, 'base64').toString();
        }

        const $ = cheerio.load(body);
        const amountText = $('td:contains("₹"), span:contains("₹")').first().text().trim();
        const amountMatch = amountText.replace(/,/g, '').match(/₹\s?(\d+\.?\d*)/);
        
        const addressLines: string[] = [];
        $('td, div').each((_, el) => {
          const t = $(el).text().trim();
          if (t.length > 15 && t.length < 150 && !t.includes('Uber') && !t.includes('Total')) {
            if (/^\d+|[A-Z]/.test(t)) addressLines.push(t);
          }
        });

        const pickup = addressLines[0] || 'Unknown Pickup';
        const drop = addressLines[1] || pickup;

        return {
          id: msg.id,
          date: new Date(parseInt(detail.data.internalDate!)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
          pickup: pickup.slice(0, 40),
          drop: drop.slice(0, 40),
          pdfLink: $('a:contains("PDF")').attr('href') || $('a[href*="receipt"]').attr('href') || ''
        };
      })
    );

    return NextResponse.json({ invoices });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

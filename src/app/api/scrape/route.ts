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

    // 1. Build Gmail search query (Buffer by 3 days behind to catch late receipts)
    let q = 'from:noreply@uber.com (subject:trip OR subject:receipt)';
    if (startDate) {
      const startBuffer = new Date(startDate);
      startBuffer.setDate(startBuffer.getDate() - 3); // Buffer back
      q += ` after:${startBuffer.toISOString().split('T')[0].replace(/-/g, '/')}`;
    }
    if (endDate) {
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 2); // Buffer forward
      q += ` before:${nextDay.toISOString().split('T')[0].replace(/-/g, '/')}`;
    }

    const response = await gmail.users.messages.list({ userId: 'me', q, maxResults: 40 });
    if (!response.data.messages) return NextResponse.json({ invoices: [] });

    const rawInvoices = await Promise.all(
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
        const directPdf = $('a[href*="download-pdf"]').attr('href');
        const viewReceipt = $('a[href*="receipt"]').attr('href');
        const anyPdf = $('a:contains("PDF")').attr('href');
        const finalPdfLink = (directPdf || anyPdf || viewReceipt || '').trim();
        
        // Amount
        const amountText = $('td:contains("₹"), span:contains("₹")').first().text().trim();
        const amountMatch = amountText.replace(/,/g, '').match(/₹\s?(\d+\.?\d*)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        
        // TRUE Trip Date (Search body text)
        const bodyText = $.root().text();
        const dateMatch = bodyText.match(/(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s\d{4})/i);
        
        // Convert to comparable date
        let finalDateObj = new Date(parseInt(detail.data.internalDate!));
        if (dateMatch) {
          const parsedDate = new Date(dateMatch[0]);
          if (!isNaN(parsedDate.getTime())) finalDateObj = parsedDate;
        }

        const formattedDate = finalDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        // Targeted Anchor-Based Extraction
        let tripDetailsFound = false;
        const potentialAddresses: string[] = [];
        const allNodes: string[] = [];
        
        const addressKeywords = ['Road', 'St', 'Ave', 'Sector', 'Phase', 'Building', 'Block', 'Mumbai', 'Maharashtra', 'India', 'Unnamed', 'Gaothan', 'MIDC', 'Apartment', 'Society'];
        const boilerplateKeywords = ['hope you enjoyed', 'Wait Time', 'Payments', 'Congrats', 'discount', 'Total', 'Subtotal', 'Promotion', 'Uber', 'Invite', 'Rating'];
        const zipCodeRegex = /\b\d{6}\b/;

        $('td, div, p, span').each((_, el) => {
          const t = $(el).text().trim().replace(/\s+/g, ' ');
          if (t.length > 5 && !allNodes.includes(t)) allNodes.push(t);
          
          if (t.toLowerCase().includes('trip details')) {
            tripDetailsFound = true;
            return;
          }

          if (tripDetailsFound) {
            // Validate if this node looks like an address
            if (t.length > 10 && t.length < 250) {
              const hasSpatialSignal = addressKeywords.some(key => t.toLowerCase().includes(key.toLowerCase())) || zipCodeRegex.test(t);
              const isBoilerplate = boilerplateKeywords.some(key => t.toLowerCase().includes(key.toLowerCase()));
              const dateCount = (t.match(/\d{4}/g) || []).length;

              if (hasSpatialSignal && !isBoilerplate && dateCount <= 1) {
                if (!potentialAddresses.includes(t)) potentialAddresses.push(t);
              }
            }
          }
        });

        // Fallback to global search if no "Trip details" anchor found
        const finalAddresses = potentialAddresses.length >= 2 ? potentialAddresses : 
          allNodes.filter((t: string) => {
            const hasSpatialSignal = addressKeywords.some(key => t.toLowerCase().includes(key.toLowerCase())) || zipCodeRegex.test(t);
            const isBoilerplate = boilerplateKeywords.some(key => t.toLowerCase().includes(key.toLowerCase()));
            return hasSpatialSignal && !isBoilerplate;
          });

        const pickup = finalAddresses[0] || 'Unknown Pickup';
        const drop = finalAddresses[1] || finalAddresses[finalAddresses.length - 1] || pickup;

        return {
          id: msg.id,
          date: formattedDate,
          dateObj: finalDateObj,
          amount,
          pickup: pickup.length > 45 ? pickup.slice(0, 42) + '...' : pickup,
          drop: drop.length > 45 ? drop.slice(0, 42) + '...' : drop,
          pdfLink: finalPdfLink
        };
      })
    );

    // 2. Surgical Filtering & De-duplication
    const uniqueMap = new Map();
    rawInvoices.forEach(inv => {
      // Timezone-agnostic comparison (Local Day Logic)
      const y = inv.dateObj.getFullYear();
      const m = String(inv.dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(inv.dateObj.getDate()).padStart(2, '0');
      const invDay = `${y}-${m}-${d}`;

      if (startDate && invDay < startDate) return;
      if (endDate && invDay > endDate) return;

      const key = `${inv.date}-${inv.amount}-${inv.pickup.slice(0, 20)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, inv);
      }
    });

    const finalInvoices = Array.from(uniqueMap.values())
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      .map(({ dateObj, ...rest }) => rest);

    return NextResponse.json({ invoices: finalInvoices });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

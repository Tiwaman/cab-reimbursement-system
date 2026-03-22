import * as cheerio from 'cheerio';
import { findPdfAttachment, GmailAttachmentMeta } from './gmail-payload';
import { InvoiceRecord } from '@/lib/invoice-types';

interface RapidoParseInput {
  messageId: string;
  html?: string;
  text?: string;
  attachments: GmailAttachmentMeta[];
}

function cleanText(value: string) {
  return value.replace(/[\s\r\n]+/g, ' ').trim();
}

function parseAmount(content: string): number | null {
  const patterns = [
    /Selected Price[\s\S]*?₹\s*([0-9,]+(?:\.\d+)?)/i,
    /ride-cost[\s\S]*?₹\s*([0-9,]+(?:\.\d+)?)/i,
    /₹\s*([0-9,]+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      const value = Number.parseFloat(match[1].replace(/,/g, ''));
      if (!Number.isNaN(value) && value > 0) return value;
    }
  }

  return null;
}

function extractWithPatterns(content: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }
}

function parseJourneyDate(value?: string): Date | null {
  if (!value) return null;
  const normalized = value.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function truncateLocation(value?: string, fallback?: string) {
  const text = cleanText(value || fallback || '');
  if (!text) return '';
  return text.length > 45 ? `${text.slice(0, 42)}...` : text;
}

export function parseRapidoInvoice(input: RapidoParseInput): (InvoiceRecord & { dateObj: Date; dedupeKeys: string[] }) | null {
  const bodyHtml = input.html || '';
  const bodyText = input.text || '';
  const combined = `${bodyHtml}\n${bodyText}`;

  if (!combined.trim()) return null;

  const rideId = extractWithPatterns(combined, [
    /Ride ID[\s\S]*?align-right[^>]*>\s*([A-Z0-9]+)/i,
    /Ride ID[\s\S]*?([A-Z0-9]{8,})/i,
  ]);

  const journeyLabel = extractWithPatterns(combined, [
    /Time of Ride[\s\S]*?align-right[^>]*>\s*([^<\r\n]+)/i,
    /Time of Ride[:\s]*([A-Za-z]{3}\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4},\s+\d{1,2}:\d{2}\s*(?:AM|PM))/i,
  ]);
  const dateObj = parseJourneyDate(journeyLabel);
  if (!dateObj) return null;

  const amount = parseAmount(combined);
  if (!amount) return null;

  let pickup = extractWithPatterns(bodyHtml, [
    /pickup\.png[\s\S]*?class="[^"]*location[^"]*"[^>]*>\s*([^<]+)/i,
    /Pickup(?: Location)?[:\s]*([^<\r\n]+)/i,
  ]);
  let drop = extractWithPatterns(bodyHtml, [
    /drop\.png[\s\S]*?class="[^"]*location[^"]*"[^>]*>\s*([^<]+)/i,
    /Drop(?:off)?(?: Location)?[:\s]*([^<\r\n]+)/i,
  ]);

  if ((!pickup || !drop) && bodyHtml) {
    const $ = cheerio.load(bodyHtml);
    const locations = $('div, td, p')
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((text) => text.length > 10);
    pickup ||= locations.find((text) => /pickup/i.test(text)) || locations[0];
    drop ||= locations.find((text) => /drop/i.test(text)) || locations[1];
  }

  const pdfAttachment = findPdfAttachment(input.attachments);
  const attachmentFilename = pdfAttachment?.filename || 'rapido-receipt.pdf';
  const pdfLink = pdfAttachment?.attachmentId
    ? `/api/attachments/download?messageId=${encodeURIComponent(input.messageId)}&attachmentId=${encodeURIComponent(pdfAttachment.attachmentId)}&filename=${encodeURIComponent(attachmentFilename)}`
    : '';

  const normalizedPickup = truncateLocation(pickup, 'Unknown Pickup') || 'Unknown Pickup';
  const normalizedDrop = truncateLocation(drop, 'Unknown Drop') || 'Unknown Drop';
  const pickupPrefix = normalizedPickup.slice(0, 20).toLowerCase();
  const rideDay = dateObj.toISOString().slice(0, 10);

  return {
    id: rideId || input.messageId,
    date: formatDisplayDate(dateObj),
    dateObj,
    amount,
    pickup: normalizedPickup,
    drop: normalizedDrop,
    pdfLink,
    platform: 'rapido',
    downloadKind: 'gmail-attachment',
    messageId: input.messageId,
    attachmentId: pdfAttachment?.attachmentId,
    attachmentFilename,
    dedupeKeys: [
      rideId ? `rapido-ride-${rideId}` : '',
      `rapido-message-${input.messageId}`,
      `rapido-fallback-${rideDay}-${amount}-${pickupPrefix}`,
    ].filter(Boolean),
  };
}

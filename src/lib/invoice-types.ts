export type InvoicePlatform = 'uber' | 'rapido';
export type InvoiceDownloadKind = 'uber-trip' | 'gmail-attachment';

export interface InvoiceRecord {
  id: string;
  date: string;
  amount: number;
  pickup: string;
  drop: string;
  pdfLink: string;
  platform: InvoicePlatform;
  downloadKind: InvoiceDownloadKind;
  messageId?: string;
  attachmentId?: string;
  attachmentFilename?: string;
  selected?: boolean;
}

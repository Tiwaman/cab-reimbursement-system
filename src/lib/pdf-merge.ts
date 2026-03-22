import { PDFDocument } from 'pdf-lib';

interface ReceiptPdf {
  buffer: Buffer | Uint8Array;
  date: string; // "DD Mon YYYY" format
}

/**
 * Merges multiple PDF buffers into a single PDF, sorted by date (oldest first).
 */
export async function mergePdfs(receipts: ReceiptPdf[]): Promise<Uint8Array> {
  // Sort by date (oldest first so the PDF reads chronologically)
  const sorted = [...receipts].sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);
    return da.getTime() - db.getTime();
  });

  const merged = await PDFDocument.create();

  for (const receipt of sorted) {
    try {
      const donor = await PDFDocument.load(receipt.buffer, { ignoreEncryption: true });
      const pages = await merged.copyPages(donor, donor.getPageIndices());
      pages.forEach(page => merged.addPage(page));
    } catch (err) {
      console.warn(`Skipping PDF for ${receipt.date}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  if (merged.getPageCount() === 0) {
    throw new Error('No valid PDF pages to merge');
  }

  return await merged.save();
}

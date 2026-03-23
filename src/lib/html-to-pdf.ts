import type { Browser, Page } from "playwright-core";
import { PDFDocument } from "pdf-lib";
import { getBrowserLaunchConfig } from "./browser-runtime";

let browser: Browser | null = null;
let page: Page | null = null;

export async function launchRenderer() {
  if (browser) return;

  const { chromium, executablePath, args } = await getBrowserLaunchConfig(true);
  browser = await chromium.launch({
    executablePath,
    args: [...args],
    headless: true,
  });
  page = await browser.newPage();
}

async function stripBlankTrailingPages(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = doc.getPages();

  // Walk backwards and drop pages that have no meaningful content stream
  for (let i = pages.length - 1; i > 0; i--) {
    const pg = pages[i];
    const contents = pg.node.get(pg.node.context.obj("Contents"));
    if (!contents) {
      doc.removePage(i);
      continue;
    }

    // Check if the content stream is trivially small (just default graphics state)
    const ref = pg.node.lookup(pg.node.context.obj("Contents"));
    // Encoded stream bytes — a blank Chromium page is typically < 200 bytes
    try {
      const raw = (ref as { getContents?: () => Uint8Array }).getContents?.();
      if (raw && raw.length < 200) {
        const text = new TextDecoder().decode(raw);
        // A truly blank page only has graphics state operators (q, Q, cm, etc.)
        // with no text (Tj, TJ, Td) or image (Do) operators
        if (!/\b(Tj|TJ|Td|TD|Do)\b/.test(text)) {
          doc.removePage(i);
          continue;
        }
      }
    } catch {
      // If we can't inspect the stream, keep the page
    }

    break; // Stop at the first non-blank page
  }

  return doc.save();
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  if (!page) throw new Error("HTML renderer not launched — call launchRenderer() first");

  await page.setContent(html, { waitUntil: "networkidle", timeout: 30_000 });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
  });

  const trimmed = await stripBlankTrailingPages(pdf);
  return Buffer.from(trimmed);
}

export async function closeRenderer() {
  try {
    await browser?.close();
  } catch {
    // ignore close errors
  }
  browser = null;
  page = null;
}

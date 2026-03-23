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

async function trimToTwoPages(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  while (doc.getPageCount() > 2) {
    doc.removePage(doc.getPageCount() - 1);
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

  const trimmed = await trimToTwoPages(pdf);
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

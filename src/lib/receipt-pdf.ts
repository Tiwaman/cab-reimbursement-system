import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

interface ReceiptPdfInput {
  title: string;
  date: string;
  amount?: number;
  pickup?: string;
  drop?: string;
  bodyText?: string;
  footerNote?: string;
}

const PDF_REPLACEMENTS: Record<string, string> = {
  "₹": "INR ",
  "→": "->",
  "←": "<-",
  "—": "-",
  "–": "-",
  "•": "-",
  "…": "...",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "\u00A0": " ",
};

function canEncode(font: PDFFont, value: string) {
  try {
    font.encodeText(value);
    return true;
  } catch {
    return false;
  }
}

function sanitizeForPdf(text: string, font: PDFFont) {
  const normalized = text.normalize("NFKD");
  let result = "";

  for (const char of normalized) {
    if (char === "\n") {
      result += char;
      continue;
    }

    if (canEncode(font, char)) {
      result += char;
      continue;
    }

    const replacement = PDF_REPLACEMENTS[char] ?? "";
    for (const replacementChar of replacement) {
      if (canEncode(font, replacementChar)) {
        result += replacementChar;
      }
    }
  }

  return result;
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number) {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines;
}

function sanitizeBody(bodyText?: string) {
  if (!bodyText) return "";
  return bodyText
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function createReceiptSummaryPdf(input: ReceiptPdfInput) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const width = 595.28;
  const height = 841.89;
  const margin = 40;
  const lineHeight = 16;
  const bodyFontSize = 10;
  const maxWidth = width - margin * 2;

  let page = doc.addPage([width, height]);
  let y = height - margin;

  const newPage = () => {
    page = doc.addPage([width, height]);
    y = height - margin;
  };

  const ensureSpace = (lines = 1) => {
    if (y - lines * lineHeight < margin) {
      newPage();
    }
  };

  page.drawText(sanitizeForPdf(input.title, fontBold), {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.1),
  });
  y -= 28;

  const metaLines = [
    `Trip date: ${input.date}`,
    typeof input.amount === "number" ? `Amount: INR ${input.amount.toFixed(2)}` : "",
    input.pickup ? `Pickup: ${input.pickup}` : "",
    input.drop ? `Drop: ${input.drop}` : "",
    input.footerNote || "",
  ].filter(Boolean);

  for (const meta of metaLines) {
    ensureSpace();
    page.drawText(sanitizeForPdf(meta, font), {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.24),
    });
    y -= lineHeight;
  }

  y -= 10;

  const bodyLines = wrapText(
    sanitizeForPdf(sanitizeBody(input.bodyText), font),
    maxWidth,
    font,
    bodyFontSize,
  );
  for (const line of bodyLines) {
    ensureSpace();
    page.drawText(line, {
      x: margin,
      y,
      size: bodyFontSize,
      font,
      color: rgb(0.12, 0.12, 0.16),
    });
    y -= lineHeight;
  }

  const pdf = await doc.save();
  return Buffer.from(pdf);
}

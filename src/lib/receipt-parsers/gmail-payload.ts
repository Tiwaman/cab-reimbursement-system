export interface GmailAttachmentMeta {
  filename: string;
  mimeType: string;
  attachmentId?: string;
}

export interface GmailBodyContent {
  text?: string;
  html?: string;
}

interface GmailPayloadPart {
  mimeType?: string | null;
  filename?: string | null;
  body?: {
    data?: string | null;
    attachmentId?: string | null;
  };
  parts?: GmailPayloadPart[] | null;
}

function decodeBase64(data?: string): string {
  if (!data) return "";
  return Buffer.from(data, "base64").toString();
}

function walkParts(
  part: GmailPayloadPart | undefined,
  body: GmailBodyContent,
  attachments: GmailAttachmentMeta[],
) {
  if (!part) return;

  if (part.mimeType === "text/plain" && part.body?.data && !body.text) {
    body.text = decodeBase64(part.body.data);
  }

  if (part.mimeType === "text/html" && part.body?.data && !body.html) {
    body.html = decodeBase64(part.body.data);
  }

  if (part.filename) {
    attachments.push({
      filename: part.filename,
      mimeType: part.mimeType || "application/octet-stream",
      attachmentId: part.body?.attachmentId,
    });
  }

  if (Array.isArray(part.parts)) {
    for (const nested of part.parts) {
      walkParts(nested, body, attachments);
    }
  }
}

export function extractBodyAndAttachments(
  payload: GmailPayloadPart | undefined,
): {
  body: GmailBodyContent;
  attachments: GmailAttachmentMeta[];
} {
  const body: GmailBodyContent = {};
  const attachments: GmailAttachmentMeta[] = [];

  if (payload?.body?.data) {
    if (payload.mimeType === "text/plain") {
      body.text = decodeBase64(payload.body.data);
    } else if (payload.mimeType === "text/html") {
      body.html = decodeBase64(payload.body.data);
    }
  }

  walkParts(payload, body, attachments);

  return { body, attachments };
}

export function findPdfAttachment(
  attachments: GmailAttachmentMeta[],
): GmailAttachmentMeta | undefined {
  return attachments.find(
    (attachment) =>
      attachment.mimeType === "application/pdf" && attachment.attachmentId,
  );
}

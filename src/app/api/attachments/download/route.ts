import { getServerSession } from 'next-auth';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const messageId = request.nextUrl.searchParams.get('messageId');
    const attachmentId = request.nextUrl.searchParams.get('attachmentId');
    const filename = request.nextUrl.searchParams.get('filename') || 'attachment.pdf';

    if (!messageId || !attachmentId) {
      return NextResponse.json({ error: 'Missing messageId or attachmentId' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const accessToken = typeof (session as { accessToken?: unknown } | null)?.accessToken === 'string'
      ? (session as { accessToken: string }).accessToken
      : '';

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    if (!response.data.data) {
      return NextResponse.json({ error: 'No attachment data found' }, { status: 404 });
    }

    const buffer = Buffer.from(response.data.data, 'base64url');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 });
  }
}

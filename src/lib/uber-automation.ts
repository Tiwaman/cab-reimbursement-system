import type { BrowserContext, Page } from 'playwright-core';
import path from 'path';
import os from 'os';
import { getBrowserLaunchConfig, isVercelRuntime } from '@/lib/browser-runtime';

const PROFILE_DIR = path.join(os.homedir(), '.cab-reimbursement', 'uber-session');
const UBER_TRIPS_URL = 'https://riders.uber.com/trips';
const LOGIN_TIMEOUT = 120_000; // 2 minutes for user to log in manually

let activeContext: BrowserContext | null = null;
let activePage: Page | null = null;

async function getPlaywright() {
  return getBrowserLaunchConfig(true);
}

/**
 * Extract Uber trip UUID from a pdfLink URL.
 * e.g. "https://riders.uber.com/trips/abc-123-def/receipt" → "abc-123-def"
 */
export function extractTripId(pdfLink: string): string | null {
  const match = pdfLink.match(/trips\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

/**
 * Get the current session status.
 */
export function getSessionStatus(): 'idle' | 'ready' {
  return activeContext && activePage ? 'ready' : 'idle';
}

/**
 * Close the active browser session.
 */
export async function closeSession() {
  try {
    await activeContext?.close();
  } catch {
    // ignore close errors
  }
  activeContext = null;
  activePage = null;
}

/**
 * Launch a persistent browser context using a saved profile.
 * If `headed` is true, the browser window is visible (for manual login).
 */
async function launchContext(headed: boolean): Promise<{ context: BrowserContext; page: Page }> {
  if (activeContext) {
    await closeSession();
  }

  const { chromium, executablePath, args, headless } = await getPlaywright();

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath,
    headless: headless ?? !headed,
    args: [
      ...args,
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--disable-default-apps',
    ],
    viewport: { width: 1280, height: 800 },
  });

  const page = context.pages()[0] || await context.newPage();
  activeContext = context;
  activePage = page;

  return { context, page };
}

/**
 * Check if the saved session is still valid (Uber cookies not expired).
 * Returns true if we can access Uber trips without hitting a login page.
 */
async function isSessionValid(page: Page): Promise<boolean> {
  try {
    await page.goto(UBER_TRIPS_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    const url = page.url();
    if (url.includes('auth.uber.com') || url.includes('/login')) {
      return false;
    }
    return url.includes('riders.uber.com');
  } catch {
    return false;
  }
}

/**
 * Ensure an active, authenticated Uber session exists.
 * - First tries headless with the saved profile (instant if session is valid).
 * - If session is expired, launches a VISIBLE browser for the user to log in manually.
 * - Returns once authenticated.
 */
export async function ensureSession(
  onStatus: (status: string) => void
): Promise<void> {
  if (isVercelRuntime()) {
    throw new Error('Uber receipt download is not supported on Vercel. It requires a persistent browser session and manual login.');
  }

  onStatus('Checking saved Uber session...');
  const { page } = await launchContext(false);

  if (await isSessionValid(page)) {
    onStatus('Uber session is active.');
    return;
  }

  await closeSession();
  onStatus('Session expired. Opening browser for Uber login...');
  onStatus('LOGIN_REQUIRED');

  const { page: headedPage } = await launchContext(true);
  await headedPage.goto(UBER_TRIPS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  onStatus('Waiting for you to log in to Uber in the browser window...');
  const startTime = Date.now();

  while (Date.now() - startTime < LOGIN_TIMEOUT) {
    await headedPage.waitForTimeout(2000);
    const currentUrl = headedPage.url();
    if (currentUrl.includes('riders.uber.com') && !currentUrl.includes('auth.uber.com') && !currentUrl.includes('/login')) {
      onStatus('Uber login successful. Closing browser window...');
      await closeSession();

      const { page: freshPage } = await launchContext(false);
      await freshPage.goto(UBER_TRIPS_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      onStatus('Uber session established.');
      return;
    }
  }

  await closeSession();
  throw new Error('Uber login timed out. Please try again.');
}

/**
 * Download a single receipt as PDF using the active Playwright session.
 */
export async function downloadReceipt(tripId: string): Promise<Buffer> {
  if (!activePage) throw new Error('No active Uber session');

  const receiptUrl = `https://riders.uber.com/trips/${tripId}/receipt`;
  await activePage.goto(receiptUrl, { waitUntil: 'networkidle', timeout: 30_000 });
  await activePage.waitForTimeout(1500);

  const pdfBuffer = await activePage.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
  });

  return Buffer.from(pdfBuffer);
}

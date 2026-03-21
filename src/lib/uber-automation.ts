import { chromium, Page } from 'playwright-core';
import chromium_pkg from 'chromium';

let activeBrowser: any = null;
let activePage: Page | null = null;
let otpPromiseResolver: ((otp: string) => void) | null = null;

export async function startUberSession(onStatus: (status: string) => void) {
  if (activeBrowser) return { status: 'Already running' };

  onStatus('Initializing secure browser session...');
  
  try {
    const browser = await chromium.launch({
      executablePath: (chromium_pkg as any).path,
      headless: true, // Run in background
    });
    activeBrowser = browser;
    const context = await browser.newContext();
    const page = await context.newPage();
    activePage = page;

    onStatus('Navigating to Uber Trips...');
    await page.goto('https://riders.uber.com/trips');

    // Handle Login
    onStatus('Authenticating with Uber...');
    await page.fill('input[name="answer"]', process.env.UBER_EMAIL!);
    await page.click('button[type="submit"]');

    // Wait for password or OTP
    await page.waitForTimeout(3000);
    
    if (await page.isVisible('input[name="password"]')) {
      onStatus('Entering password...');
      await page.fill('input[name="password"]', process.env.UBER_PASSWORD!);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    // Check for OTP
    if (await page.isVisible('input[name="otp"]')) {
      onStatus('OTP_REQUIRED');
      const otp = await new Promise<string>((resolve) => {
        otpPromiseResolver = resolve;
      });
      onStatus(`Verifying OTP: ${otp}...`);
      await page.fill('input[name="otp"]', otp);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
    }

    onStatus('Uber session established.');
    return { status: 'Ready' };
  } catch (err: any) {
    onStatus(`Error: ${err.message}`);
    await activeBrowser?.close();
    activeBrowser = null;
    throw err;
  }
}

export async function downloadReceipt(tripId: string) {
  if (!activePage) throw new Error('No active session');
  const receiptUrl = `https://riders.uber.com/trips/${tripId}/receipt`;
  await activePage.goto(receiptUrl);
  // Download logic...
  const pdfBuffer = await activePage.pdf({ format: 'A4' });
  return pdfBuffer;
}

export function provideOTP(otp: string) {
  if (otpPromiseResolver) {
    otpPromiseResolver(otp);
    otpPromiseResolver = null;
    return true;
  }
  return false;
}

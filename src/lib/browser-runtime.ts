import fs from 'fs';

const IS_VERCEL = process.env.VERCEL === '1';

function findLocalChromeExecutable(): string {
  const candidates = [
    process.env.LOCAL_CHROME_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean) as string[];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('No local Chrome/Chromium executable found. Set LOCAL_CHROME_EXECUTABLE to a browser binary path.');
  }

  return found;
}

export async function getBrowserLaunchConfig(headless: boolean) {
  const playwright = await import('playwright-core');

  if (IS_VERCEL) {
    const chromiumPkg = await import('@sparticuz/chromium');
    return {
      chromium: playwright.chromium,
      executablePath: await chromiumPkg.default.executablePath(),
      args: chromiumPkg.default.args,
      headless: true,
    };
  }

  return {
    chromium: playwright.chromium,
    executablePath: findLocalChromeExecutable(),
    args: [] as string[],
    headless,
  };
}

export function isVercelRuntime() {
  return IS_VERCEL;
}

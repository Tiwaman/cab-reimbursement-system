import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Prevent webpack from bundling heavy native packages used server-side only.
  // playwright-core and chromium contain native binaries that cannot be bundled.
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  // Ensure @sparticuz/chromium brotli-compressed binaries are included in
  // the serverless function bundles that need them.
  outputFileTracingIncludes: {
    '/api/receipts/download-all': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
};

export default nextConfig;

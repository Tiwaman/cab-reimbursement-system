import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Prevent webpack from bundling heavy native packages used server-side only.
  // playwright-core and chromium contain native binaries that cannot be bundled.
  serverExternalPackages: ['playwright-core', 'chromium'],
};

export default nextConfig;

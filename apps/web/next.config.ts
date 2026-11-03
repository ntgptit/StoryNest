import type { NextConfig } from "next";

// Workspace packages (@storynest/*) ship TypeScript source; Next compiles them automatically.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;

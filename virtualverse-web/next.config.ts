import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 uses Turbopack by default.
  // Phaser is loaded only in browser via GameCanvas ("use client" + dynamic import),
  // so it never runs on the server. No special bundler exclusion needed.
  turbopack: {
    // Empty config signals we've intentionally chosen Turbopack
    // with no custom rules — the default handles Phaser fine since
    // GameCanvas is a client-only component.
  },
};

export default nextConfig;

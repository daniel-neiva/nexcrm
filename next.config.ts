import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-expect-error: Bypassing strict typescript validation for ESLint config in Next.js 16.1.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

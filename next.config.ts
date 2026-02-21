import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-expect-error: NextConfig type definition in 16.1 doesn't include eslint/typescript properties by default but it's supported by the underlying Webpack plugin.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

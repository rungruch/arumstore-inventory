import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds with ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

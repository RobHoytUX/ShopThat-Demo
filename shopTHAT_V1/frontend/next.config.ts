import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // allow production builds to successfully complete even if
    // your project has ESLint errors
    ignoreDuringBuilds: true,
  },
  // …any other config options you already had
};

export default nextConfig;

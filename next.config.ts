import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_PUBLIC_STATIC_MODE === 'true' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;

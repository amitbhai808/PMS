import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.167.69.124'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

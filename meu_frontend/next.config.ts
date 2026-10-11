import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  allowedDevOrigins: [
    "doomfully-gastric-nestor.ngrok-free.dev"
  ],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/agents",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

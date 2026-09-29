import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["application"],
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
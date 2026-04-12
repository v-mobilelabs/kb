import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true, // Enables PPR (Partial Pre-Rendering) for async components
};

export default nextConfig;

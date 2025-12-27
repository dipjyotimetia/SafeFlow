import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Enable static export for GitHub Pages deployment
  output: "export",
  // Base path for GitHub Pages subdirectory deployment
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
  // Trailing slash recommended for static hosting
  trailingSlash: true,
  // Optimize images
  images: {
    unoptimized: true, // Required for static export
  },
  // Note: Security headers must be configured at the hosting level for static exports
  // For GitHub Pages, consider using meta tags in layout.tsx for CSP if needed
};

export default nextConfig;

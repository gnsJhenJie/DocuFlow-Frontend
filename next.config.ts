import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone', // Added for optimized Docker builds
  output: "export", // Use 'export' for static export builds
  // trailingSlash: true, // Ensure trailing slashes for static export
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Disable Next.js image optimization for static export
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ddfedtuc7b3xl.cloudfront.net",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

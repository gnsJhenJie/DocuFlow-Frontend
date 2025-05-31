import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // output: 'standalone', // Added for optimized Docker builds
  output: 'export', // Use 'export' for static export builds
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ddfedtuc7b3xl.cloudfront.net',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;

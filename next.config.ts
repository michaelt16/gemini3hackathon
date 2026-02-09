import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Supabase storage images in next/image if needed later
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Increase serverless function timeout for AI generation routes
  serverExternalPackages: ['sharp'],
};

export default nextConfig;

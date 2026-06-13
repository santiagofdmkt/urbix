import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'zrtaffecubpwoxjycyse.supabase.co',
      'www.argenprop.com',
      'imgar.zonapropcdn.com',
    ],
  },
  async redirects() {
    return [
      {
        source: '/localidad/:ciudad',
        destination: '/:ciudad',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
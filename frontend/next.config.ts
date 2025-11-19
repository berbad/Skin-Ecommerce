import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "skin-ecommerce.onrender.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "www.eternalbotanic.com",
        pathname: "/images/**",
      },
    ],
    unoptimized: true,
  },

  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://skin-ecommerce.onrender.com/api/:path*",
      },
      {
        source: "/images/:path*",
        destination: "https://skin-ecommerce.onrender.com/images/:path*",
      },
    ];
  },
};

export default nextConfig;

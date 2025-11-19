import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "skin-ecommerce.onrender.com",
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
    ];
  },
};

export default nextConfig;

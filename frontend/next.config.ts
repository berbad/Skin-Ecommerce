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

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
    ];
  },

  async rewrites() {
    return [
      ...(process.env.CHAT_INTERNAL_ORIGIN
        ? [
            {
              source: "/chat",
              destination: `${process.env.CHAT_INTERNAL_ORIGIN}/chat`,
            },
          ]
        : []),
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_ORIGIN || "https://skin-ecommerce.onrender.com"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

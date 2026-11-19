// ZERO GROUP — Next.js Configuration

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for catching React bugs early
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // High-performance tree-shaking & fast RSC compilation
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "date-fns-tz",
      "recharts",
      "@prisma/client",
      "clsx",
      "tailwind-merge",
      "dexie",
    ],
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "*.vercel.app",
        "zero-group-machine.vercel.app",
      ],
    },
  },
  images: {
    remotePatterns: [],
    unoptimized: false,
    localPatterns: [{ pathname: "/**" }],
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(icons|images|fonts)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/admin/:path*",
        destination: "/api/adminApi/:path*",
      },
    ];
  },
};

export default nextConfig;

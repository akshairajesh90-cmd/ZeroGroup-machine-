// ZERO GROUP — Next.js Configuration

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for catching React bugs early
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Needed for next-auth server actions & fast local compilation
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
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
    // Allow locally served uploaded images
    remotePatterns: [],
    // Serve images from /public/uploads without optimization issues
    unoptimized: false,
    localPatterns: [
      { pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;

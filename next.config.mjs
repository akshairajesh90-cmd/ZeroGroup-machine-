// ZERO GROUP — Next.js + PWA Configuration
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  // Only enable Service Worker in production
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Cache the driver orders page for offline use
  runtimeCaching: [
    {
      urlPattern: /^https?.*(\/driver\/orders).*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "driver-orders-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for catching React bugs early
  reactStrictMode: true,
  // Needed for next-auth server actions
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default pwaConfig(nextConfig);

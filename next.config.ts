import type { NextConfig } from "next"
import withPWA from "@ducanh2912/next-pwa"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless", "@prisma/adapter-neon", "ws"],

  // Required in Next.js 16: PWA plugin adds a webpack config, so we must declare
  // an explicit turbopack config (even empty) to silence the mismatch error.
  turbopack: {},

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|woff|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]
  },
}

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
})(nextConfig)

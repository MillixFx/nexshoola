import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless", "@prisma/adapter-neon", "ws"],

  // Performance: tree-shake icon libraries so we only ship icons we actually use.
  // Cuts client JS bundle by 100-200kb on most pages.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  // Allow Unsplash + common CDNs for next/image (used for hero school photo)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },

  // Long-cache static asset extensions (handled by Vercel edge)
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|woff|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]
  },
}

export default nextConfig

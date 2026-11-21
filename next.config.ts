import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Semua halaman client-side (Firestore dari browser) -> export statis untuk Firebase Hosting (folder "out").
  output: "export",
  // Pada export statis, hasil build ditulis ke distDir -> "out" (dipakai Firebase Hosting).
  // `next dev` tetap memakai .next sehingga tidak bentrok dengan build.
  distDir: process.env.NODE_ENV === "production" ? "out" : ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

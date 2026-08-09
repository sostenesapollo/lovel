import type { NextConfig } from "next";

const pedegasOrigin =
  process.env.PEDEGAS_INTERNAL_URL?.replace(/\/$/, "") ||
  "http://pedegas-app:3000";

function pedegasProxy(path: string) {
  return `${pedegasOrigin}${path}`;
}

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    const catalogBase = "/catalog/lovelessence";
    return {
      beforeFiles: [
        { source: "/catalogo", destination: pedegasProxy(catalogBase) },
        { source: "/catalogo/:path*", destination: pedegasProxy(`${catalogBase}/:path*`) },
        { source: "/assets/:path*", destination: pedegasProxy("/assets/:path*") },
        { source: "/api/v1/:path*", destination: pedegasProxy("/api/v1/:path*") },
        {
          source: "/catalog/lovelessence/:path*",
          destination: pedegasProxy("/catalog/lovelessence/:path*"),
        },
      ],
    };
  },
};

export default nextConfig;

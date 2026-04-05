import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node DNS / mongodb sürücüsünün paketlenmesini azalt (VPS DNS yolu)
  serverExternalPackages: ["mongodb"],
  poweredByHeader: false,
  images: {
    localPatterns: [
      { pathname: "/products/**", search: "" },
      { pathname: "/uploads/**", search: "" },
      { pathname: "/logo.png", search: "" },
      { pathname: "/file.svg", search: "" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

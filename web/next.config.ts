import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@tetrastack/react-glass-components",
    "@catalyst/kubernetes-client",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "github.com",
        port: "",
        pathname: "/identicons/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  output: "standalone",
  experimental: {
    // Enable WebSocket support via next-ws
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

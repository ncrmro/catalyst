import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@tetrastack/backend",
    "@tetrastack/react-glass-components",
    "@tetrastack/react-agent-chat",
    "@tetrastack/react-markdown",
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
};

export default nextConfig;

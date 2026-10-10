import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Prisma usa un motore nativo: non va incluso nel bundle server.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;

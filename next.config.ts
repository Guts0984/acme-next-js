import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: "incremental",
  },
  async redirects() {
    return [
      {
        source: "/", // Redirect from root
        destination: "/dashboard", // Redirect to /dashboard
        permanent: true, // Permanent redirect (308)
      },
    ];
  },
};

export default nextConfig;

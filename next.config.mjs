/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tree-shake icon imports instead of bundling the whole library per route
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

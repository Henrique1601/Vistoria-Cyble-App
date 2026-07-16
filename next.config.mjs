/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
export default nextConfig;

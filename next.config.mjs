/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: { ignoreDuringBuilds: true },
  // Photos are already resized when uploaded; Cloudflare serves them as-is
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};
export default nextConfig;

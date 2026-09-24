/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "@napi-rs/canvas"
    ]
  }
};

export default nextConfig;

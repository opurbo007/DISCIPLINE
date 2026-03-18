/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow images from external domains if needed
  images: {
    domains: ["assets.coingecko.com"],
  },
};

module.exports = nextConfig;

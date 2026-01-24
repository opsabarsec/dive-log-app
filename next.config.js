/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.geoapify.com',
      },
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
    ],
  },
}

module.exports = nextConfig

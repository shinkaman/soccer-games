const isProd = process.env.NODE_ENV === 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: isProd ? '/soccer-games' : '',
  assetPrefix: isProd ? '/soccer-games/' : '',
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages用のbasePath設定
  // 環境変数 BASE_PATH が指定されていればそれを使用、なければ '/soccer-games' をデフォルト
  basePath: process.env.BASE_PATH || '/soccer-games',
  assetPrefix: process.env.BASE_PATH ? `${process.env.BASE_PATH}/` : '/soccer-games/',
}

module.exports = nextConfig

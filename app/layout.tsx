import type { Metadata } from 'next'
import './globals.css'

// basePathを取得（環境変数から、またはデフォルト値）
const basePath = process.env.BASE_PATH || '/soccer-games'

export const metadata: Metadata = {
  title: 'サッカー試合日程一覧',
  description: '欧州5大リーグ、Jリーグ、日本代表などの試合日程を一覧表示',
  icons: {
    icon: `${basePath}/favicon.ico`,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'サッカー試合日程一覧',
  description: '欧州5大リーグ、Jリーグ、日本代表などの試合日程を一覧表示',
  icons: {
    icon: '/favicon.png',
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

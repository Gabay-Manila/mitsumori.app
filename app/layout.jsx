export const metadata = {
  title: '内装見積アプリ',
  description: '現場で使えるシンプル見積システム',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

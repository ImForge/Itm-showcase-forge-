import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forge',
  description: 'Discover, share, and build on student projects.',
  icons: {
    icon: '/forge-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  )
}
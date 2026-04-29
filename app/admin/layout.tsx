import type { Metadata } from 'next'
import './globals.css'
import { ToastContainer } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Forge',
  description: 'Discover and build on student projects from ITM department',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}
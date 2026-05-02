'use client'
// components/layout/MainContent.tsx
// Tiny client wrapper around the page content.
// Its only job: add paddingTop: 52px on mobile so content
// doesn't hide under the fixed hamburger top bar.
// layout.tsx stays a Server Component — this handles the JS bit.

import { useEffect, useState } from 'react'

export default function MainContent({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth <= 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <main style={{
      flex: 1,
      minWidth: 0,
      overflowY: 'auto',
      background: '#0e0e10',
      paddingTop: isMobile ? '52px' : '0px',
    }}>
      {children}
    </main>
  )
}

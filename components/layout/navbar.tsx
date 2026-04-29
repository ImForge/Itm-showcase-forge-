'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(14,14,16,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px',
            background: 'var(--accent)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: '#fff',
          }}>I</div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            ITM <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>Showcase</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { label: 'Projects', href: '/projects' },
            { label: 'Submit', href: '/projects/submit' },
          ].map(({ label, href }) => (
            <Link key={href} href={href} style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              borderRadius: '6px',
              transition: 'color 0.15s, background 0.15s',
            }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.color = 'var(--text-primary)'
                ;(e.target as HTMLElement).style.background = 'var(--bg-elevated)'
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.color = 'var(--text-secondary)'
                ;(e.target as HTMLElement).style.background = 'transparent'
              }}
            >{label}</Link>
          ))}
        </div>

        {/* Auth buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/login" style={{
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            transition: 'all 0.15s',
          }}>Log in</Link>
          <Link href="/signup" style={{
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '6px',
            background: 'var(--accent)',
            transition: 'background 0.15s',
          }}>Sign up</Link>
        </div>

      </div>
    </nav>
  )
}
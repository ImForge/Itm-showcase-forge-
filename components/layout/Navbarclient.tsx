'use client'
// components/layout/NavbarClient.tsx
//
// This is the Client Component part of the Navbar.
// It receives user data from the Server Component (Navbar.tsx)
// and handles the interactive parts:
//   - logout button (needs onClick)
//   - any hover/animation effects
//
// Props:
//   user   — the Supabase auth user object (or null if logged out)
//   profile — our profiles table row (username, avatar_url, etc.)

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type Profile = {
  username: string | null
  avatar_url: string | null
  full_name: string | null
} | null

type Props = {
  user: User | null
  profile: Profile
}

export default function NavbarClient({ user, profile }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    // Redirect to homepage and refresh server data
    router.push('/')
    router.refresh()
  }

  // Get first letter of username for avatar placeholder
  const avatarLetter = profile?.username?.[0]?.toUpperCase() ?? 
                       profile?.full_name?.[0]?.toUpperCase() ?? '?'

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(14, 14, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: Logo */}
      <a
        href="/"
        style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'var(--accent)',
          textDecoration: 'none',
          letterSpacing: '-0.5px',
        }}
      >
        Forge
      </a>

      {/* Center: Nav links */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {[
          { label: 'Projects', href: '/projects' },
          { label: 'Submit', href: '/projects/submit' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.color = 'var(--text-primary)'
              el.style.background = 'var(--bg-elevated)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.color = 'var(--text-secondary)'
              el.style.background = 'transparent'
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Right: Auth area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          // ---- LOGGED IN STATE ----
          <>
            {/* Username */}
            <a
              href={`/profile/${profile?.username ?? user.id}`}
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: '500',
              }}
            >
              {profile?.username ?? 'Profile'}
            </a>

            {/* Avatar circle */}
            <a
              href={`/profile/${profile?.username ?? user.id}`}
              style={{ textDecoration: 'none' }}
            >
              {profile?.avatar_url ? (
                // If they have a real avatar image
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    border: '2px solid var(--border)',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                // Fallback: colored circle with their initial
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--accent)',
                  }}
                >
                  {avatarLetter}
                </div>
              )}
            </a>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--danger)'
                e.currentTarget.style.color = 'var(--danger)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          // ---- LOGGED OUT STATE ----
          <>
            <a
              href="/login"
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Log in
            </a>
            <a
              href="/signup"
              style={{
                padding: '7px 16px',
                background: 'var(--accent)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#fff',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            >
              Sign up
            </a>
          </>
        )}
      </div>
    </nav>
  )
}

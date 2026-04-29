'use client'
// app/(auth)/login/page.tsx
//
// 'use client' means this runs in the browser (not on server).
// We need it because:
//   1. We use useState to track form inputs
//   2. We use useRouter to redirect after login
//   3. We use the browser Supabase client (not server)

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  // State for form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // State for UI feedback
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // useRouter lets us navigate programmatically (redirect after login)
  const router = useRouter()

  // The browser Supabase client
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    // Prevent the browser from reloading the page on form submit
    e.preventDefault()

    setLoading(true)
    setError(null)

    // Call Supabase's built-in email+password login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Show the error message to the user
      setError(error.message)
      setLoading(false)
      return
    }

    // Login succeeded! Redirect to homepage.
    // router.refresh() tells Next.js to re-fetch server data
    // (so the Navbar sees the new session immediately)
    router.push('/')
    router.refresh()
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '400px',
      }}
    >
      {/* Card container */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          Welcome back
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '28px',
          }}
        >
          Sign in to your Forge account
        </p>

        {/* Error message box — only shows when there's an error */}
        {error && (
          <div
            style={{
              background: '#ef444420',
              border: '1px solid #ef444440',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {/* The login form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: loading ? 'var(--bg-overlay)' : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>

      {/* Link to signup */}
      <p
        style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}
      >
        Don&apos;t have an account?{' '}
        <a
          href="/signup"
          style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}
        >
          Sign up
        </a>
      </p>
    </div>
  )
}

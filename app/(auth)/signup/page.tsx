'use client'
// app/(auth)/signup/page.tsx
//
// Similar to login but uses supabase.auth.signUp() instead.
// After signup, Supabase sends a confirmation email by default.
// We show a "check your email" message instead of redirecting.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // This flag flips to true after successful signup
  // so we can show the "check your email" screen
  const [signedUp, setSignedUp] = useState(false)

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // supabase.auth.signUp creates the user in Supabase Auth
    // The `data` field in options gets passed to your profile trigger
    // so the database knows the username too
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // This gets stored in auth.users.raw_user_meta_data
          // Your profile trigger can read it to set username
          username: username,
          full_name: username, // using username as display name for now
        },
      },
    })



if (error) {
  setError(error.message)
  setLoading(false)
  return
}

if (data.session) {
  window.location.href = '/'
} else {
  setSignedUp(true)
}

setLoading(false)
} // ✅ THIS WAS MISSING
  // ---- SUCCESS STATE ----
  if (signedUp) {
    return (
      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '40px 32px',
          }}
        >
          {/* Checkmark icon */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#22c55e20',
              border: '1px solid #22c55e40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '24px',
            }}
          >
            ✉️
          </div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '10px',
            }}
          >
            Check your email
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            Click it to activate your account, then come back to sign in.
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              marginTop: '24px',
              padding: '10px 24px',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Go to login
          </a>
        </div>
      </div>
    )
  }

  // ---- SIGNUP FORM ----
  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
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
          Create an account
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '28px',
          }}
        >
          Join Forge and share your projects
        </p>

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

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Username field */}
          <div>
            <label
              htmlFor="username"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="coolstudent42"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

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
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>

      <p
        style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}
      >
        Already have an account?{' '}
        <a
          href="/login"
          style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}
        >
          Sign in
        </a>
      </p>
    </div>
  )
}

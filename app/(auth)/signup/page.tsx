'use client'
// app/(auth)/signup/page.tsx
//
// 3-step signup flow:
// Step 1: User enters email + username → Supabase sends OTP to that email
// Step 2: User enters the 6-digit OTP → email verified
// Step 3: User sets their password → account created → redirected to home
//
// How the Supabase calls work:
// Step 1: signInWithOtp({ email }) — sends OTP, creates a pending session
// Step 2: verifyOtp({ email, token, type: 'email' }) — confirms the OTP, user is now verified
// Step 3: updateUser({ password, data: { username } }) — sets password + username metadata

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Which step of the flow we're on
type Step = 'email' | 'otp' | 'password'

export default function SignupPage() {
  const supabase = createClient()

  const [step, setStep] = useState<Step>('email')

  // Form values
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // ── SHARED INPUT STYLE ──
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  }

  // ── STEP 1: Send OTP ──
  // User submits email + username.
  // We call signInWithOtp which sends a 6-digit code to their email.
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Basic username validation — only letters, numbers, underscores
    if (!/^[a-z0-9_]+$/.test(username)) {
      setError('Username can only contain lowercase letters, numbers, and underscores')
      setLoading(false)
      return
    }

    // Check if username is already taken before sending OTP
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existing) {
      setError('That username is already taken — try another one')
      setLoading(false)
      return
    }

    // Send OTP to email
    // shouldCreateUser: true means Supabase creates the user if they don't exist
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // OTP sent — move to step 2
    setStep('otp')
    setLoading(false)

    // Start a 60-second cooldown for the resend button
    startResendCooldown()
  }

  // ── STEP 2: Verify OTP ──
  // User submits the 6-digit code from their email.
  // verifyOtp checks the code and logs the user in if correct.
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (error) {
      setError('Invalid or expired code — check your email or request a new one')
      setLoading(false)
      return
    }

    // OTP verified — move to step 3
    setStep('password')
    setLoading(false)
  }

  // ── STEP 3: Set Password ──
  // At this point the user is authenticated (OTP created a session).
  // We update their account with a password and username.
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Update password + username metadata on the authenticated user
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        username,
        full_name: username,
      },
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Also update the profiles table directly to make sure username is set
    // (the trigger handles new users but updateUser metadata might not re-trigger it)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ username, full_name: username })
        .eq('id', user.id)
    }

    // Done — redirect to home
    window.location.href = '/'
  }

  // ── RESEND OTP ──
  async function handleResend() {
    if (resendCooldown > 0) return
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    if (error) {
      setError(error.message)
      return
    }

    startResendCooldown()
  }

  function startResendCooldown() {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // ── SHARED WRAPPER ──
  function Card({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px' }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
            {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700,
                  background: step === s ? 'var(--accent)' : (
                    (['email', 'otp', 'password'].indexOf(step) > i) ? '#22c55e' : 'var(--bg-elevated)'
                  ),
                  color: step === s || (['email', 'otp', 'password'].indexOf(step) > i) ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${step === s ? 'var(--accent)' : ((['email', 'otp', 'password'].indexOf(step) > i) ? '#22c55e' : 'var(--border)')}`,
                  transition: 'all 0.2s',
                }}>
                  {(['email', 'otp', 'password'].indexOf(step) > i) ? '✓' : i + 1}
                </div>
                {i < 2 && <div style={{ width: '24px', height: '1px', background: (['email', 'otp', 'password'].indexOf(step) > i) ? '#22c55e' : 'var(--border)' }} />}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13.5px', color: '#ef4444', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {children}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
        </p>
      </div>
    )
  }

  // ── STEP 1 UI: Email + Username ──
  if (step === 'email') {
    return (
      <Card>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Create an account
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
          Join Forge and share your projects with ITM
        </p>

        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="coolstudent42"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
              Lowercase letters, numbers, underscores only
            </p>
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@university.edu"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px' }}>
              A verification code will be sent to this email
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? 'var(--bg-overlay)' : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : '#000',
              border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px', transition: 'background 0.15s',
            }}
          >
            {loading ? 'Sending code...' : 'Send verification code →'}
          </button>
        </form>
      </Card>
    )
  }

  // ── STEP 2 UI: OTP Verification ──
  if (step === 'otp') {
    return (
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f59e0b15', border: '1px solid #f59e0b30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '14px' }}>
            ✉️
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Check your email
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            We sent a 6-digit code to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            Enter it below to verify your email.
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Verification code</label>
            <input
              type="text"
              required
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{
                ...inputStyle,
                fontSize: '24px',
                letterSpacing: '0.3em',
                textAlign: 'center',
                fontWeight: 600,
                padding: '14px',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            style={{
              width: '100%', padding: '11px',
              background: (loading || otp.length !== 6) ? 'var(--bg-overlay)' : 'var(--accent)',
              color: (loading || otp.length !== 6) ? 'var(--text-muted)' : '#000',
              border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 600,
              cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Verifying...' : 'Verify email →'}
          </button>
        </form>

        {/* Resend + back */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          <button
            onClick={() => { setStep('email'); setOtp(''); setError(null) }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
          >
            ← Change email
          </button>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent)', fontSize: '13px', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', padding: 0, fontWeight: 500 }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>
      </Card>
    )
  }

  // ── STEP 3 UI: Set Password ──
  return (
    <Card>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#22c55e15', border: '1px solid #22c55e30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '14px' }}>
          ✅
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Email verified!
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          One last step — set a password for your account.
        </p>
      </div>

      <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />

          {/* Password strength bars */}
          {password.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              {[1, 2, 3, 4].map(level => {
                const strength = password.length < 6 ? 1 : password.length < 8 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
                return (
                  <div key={level} style={{
                    flex: 1, height: '3px', borderRadius: '2px',
                    background: level <= strength
                      ? (strength === 1 ? '#ef4444' : strength === 2 ? '#f59e0b' : strength === 3 ? '#3b82f6' : '#22c55e')
                      : 'var(--border)',
                    transition: 'background 0.2s',
                  }} />
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Confirm password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Same password again"
            style={{
              ...inputStyle,
              borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' : 'var(--border)',
            }}
            onFocus={e => (e.target.style.borderColor = confirmPassword !== password ? '#ef4444' : 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = confirmPassword && confirmPassword !== password ? '#ef4444' : 'var(--border)')}
          />
          {confirmPassword && confirmPassword !== password && (
            <p style={{ fontSize: '11.5px', color: '#ef4444', marginTop: '5px' }}>Passwords don't match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || password !== confirmPassword || password.length < 6}
          style={{
            width: '100%', padding: '11px',
            background: (loading || password !== confirmPassword || password.length < 6) ? 'var(--bg-overlay)' : 'var(--accent)',
            color: (loading || password !== confirmPassword || password.length < 6) ? 'var(--text-muted)' : '#000',
            border: 'none', borderRadius: '8px',
            fontSize: '14px', fontWeight: 600,
            cursor: (loading || password !== confirmPassword || password.length < 6) ? 'not-allowed' : 'pointer',
            marginTop: '4px', transition: 'background 0.15s',
          }}
        >
          {loading ? 'Creating account...' : 'Create account →'}
        </button>
      </form>
    </Card>
  )
}

'use client'
// app/(main)/profile/settings/page.tsx
// Tabbed settings page: Profile tab + Account tab (change password)

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tab = 'profile' | 'account'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userIdRef = useRef<string | null>(null)
  const usernameRef = useRef<string>('')

  const [tab, setTab] = useState<Tab>('profile')
  const [authChecked, setAuthChecked] = useState(false)

  // ── Profile tab state ──
  const [displayUsername, setDisplayUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // ── Account tab state ──
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  // ── Load user data on mount ──
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      userIdRef.current = user.id
      setUserEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (profile) {
        usernameRef.current = profile.username ?? ''
        setDisplayUsername(profile.username ?? '')
        setFullName(profile.full_name ?? '')
        setBio(profile.bio ?? '')
        setRollNumber(profile.roll_number ?? '')
        setGraduationYear(profile.graduation_year?.toString() ?? '')
        setCurrentAvatarUrl(profile.avatar_url ?? null)
      }
      setAuthChecked(false) // we use this as "done loading"
      setAuthChecked(true)
    }
    load()
  }, [])

  // ── Avatar handler ──
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setProfileError('Avatar must be an image'); return }
    if (file.size > 3 * 1024 * 1024) { setProfileError('Avatar must be under 3MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setProfileError(null)
  }

  // ── Save profile ──
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const userId = userIdRef.current
    if (!userId) return

    setProfileLoading(true)
    setProfileError(null)

    try {
      let avatarUrl = currentAvatarUrl

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const filePath = `avatars/${userId}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('project-thumbnails')
          .upload(filePath, avatarFile, { upsert: true })
        if (uploadError) throw new Error('Avatar upload failed: ' + uploadError.message)
        const { data: urlData } = supabase.storage
          .from('project-thumbnails').getPublicUrl(filePath)
        avatarUrl = urlData.publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          bio: bio || null,
          roll_number: rollNumber || null,
          graduation_year: graduationYear ? parseInt(graduationYear) : null,
          avatar_url: avatarUrl,
        })
        .eq('id', userId)

      if (updateError) throw new Error(updateError.message)

      setProfileSaved(true)
      window.location.replace(`/profile/${usernameRef.current}`)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Something went wrong')
      setProfileLoading(false)
    }
  }

  // ── Change password ──
  // WHY: Supabase's updateUser() changes the password directly for the
  // currently authenticated session. We don't need the old password via
  // the API — but we ask for it as a UX safety check and re-authenticate
  // before changing, so someone can't change the password if they just
  // walked up to an unlocked laptop.
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordLoading(true)

    try {
      // Step 1: Re-authenticate with current password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })

      if (signInError) {
        throw new Error('Current password is incorrect')
      }

      // Step 2: Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw new Error(updateError.message)

      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // Auto-clear success after 3 seconds
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    )
  }

  const displayAvatar = avatarPreview ?? currentAvatarUrl
  const avatarLetter = displayUsername?.[0]?.toUpperCase() ?? '?'
  const b = (field: string) => focusedField === field ? 'var(--accent)' : 'var(--border)'

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <a href={`/profile/${displayUsername}`} style={{
          fontSize: '13px', color: 'var(--text-muted)',
          textDecoration: 'none', display: 'inline-block', marginBottom: '16px',
        }}>
          ← Back to profile
        </a>
        <h1 style={{
          fontSize: '26px', fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.5px',
        }}>
          Settings
        </h1>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '28px',
      }}>
        {(['profile', 'account'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px', borderRadius: '8px 8px 0 0',
              border: 'none', background: 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13.5px', fontWeight: tab === t ? 600 : 500,
              cursor: 'pointer', transition: 'all 0.15s',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t === 'profile' ? '👤 Profile' : '🔐 Account'}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {profileSaved && (
            <Banner type="success" message="✓ Saved! Taking you back to your profile..." />
          )}
          {profileError && (
            <Banner type="error" message={profileError} />
          )}

          {/* Avatar section */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '24px',
            display: 'flex', alignItems: 'center', gap: '24px',
          }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'var(--accent-dim)', border: '2px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: 800, color: 'var(--accent)',
                cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
            >
              {displayAvatar
                ? <img src={displayAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : avatarLetter
              }
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                @{displayUsername}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Username cannot be changed
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '6px 14px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  color: 'var(--text-secondary)', fontSize: '12px',
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                Change avatar
              </button>
              {avatarFile && (
                <button
                  type="button"
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                  style={{
                    marginLeft: '8px', padding: '6px 10px',
                    background: 'transparent', border: 'none',
                    color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  ✕ Cancel
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>

          {/* Personal info */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Personal Info
            </h2>

            <FormField label="Full Name">
              <input
                value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                style={{ ...inputStyle, borderColor: b('fullName') }}
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
              />
            </FormField>

            <FormField label="Bio">
              <textarea
                value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Tell other students about yourself..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', borderColor: b('bio') }}
                onFocus={() => setFocusedField('bio')}
                onBlur={() => setFocusedField(null)}
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField label="Roll Number">
                <input
                  value={rollNumber} onChange={e => setRollNumber(e.target.value)}
                  placeholder="e.g. ITM2021001"
                  style={{ ...inputStyle, borderColor: b('roll') }}
                  onFocus={() => setFocusedField('roll')}
                  onBlur={() => setFocusedField(null)}
                />
              </FormField>
              <FormField label="Graduation Year">
                <input
                  type="number" value={graduationYear}
                  onChange={e => setGraduationYear(e.target.value)}
                  placeholder="e.g. 2026" min="2000" max="2040"
                  style={{ ...inputStyle, borderColor: b('year') }}
                  onFocus={() => setFocusedField('year')}
                  onBlur={() => setFocusedField(null)}
                />
              </FormField>
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading || profileSaved}
            style={{
              padding: '12px', borderRadius: '10px', border: 'none',
              background: profileSaved ? '#22c55e30' : profileLoading ? 'var(--bg-overlay)' : 'var(--accent)',
              color: profileSaved ? '#22c55e' : profileLoading ? 'var(--text-muted)' : '#000',
              fontSize: '15px', fontWeight: 700,
              cursor: profileLoading || profileSaved ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {profileSaved ? '✓ Saved!' : profileLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}

      {/* ── ACCOUNT TAB ── */}
      {tab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Email display — read only */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '24px',
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Email Address
            </h2>
            <div style={{
              padding: '10px 14px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: '8px',
              fontSize: '14px', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{userEmail}</span>
              <span style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                background: '#22c55e18', border: '1px solid #22c55e40', color: '#22c55e',
              }}>
                Verified
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Email is managed through your Supabase auth account.
            </p>
          </div>

          {/* Change password */}
          <form
            onSubmit={handleChangePassword}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}
          >
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Change Password
            </h2>

            {passwordSaved && (
              <Banner type="success" message="✓ Password changed successfully!" />
            )}
            {passwordError && (
              <Banner type="error" message={passwordError} />
            )}

            <FormField label="Current Password">
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                style={{ ...inputStyle, borderColor: b('currentPw') }}
                onFocus={() => setFocusedField('currentPw')}
                onBlur={() => setFocusedField(null)}
              />
            </FormField>

            <FormField label="New Password" hint="Minimum 8 characters">
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                style={{ ...inputStyle, borderColor: b('newPw') }}
                onFocus={() => setFocusedField('newPw')}
                onBlur={() => setFocusedField(null)}
              />
            </FormField>

            <FormField label="Confirm New Password">
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && confirmPassword !== newPassword
                    ? 'var(--danger)'
                    : b('confirmPw'),
                }}
                onFocus={() => setFocusedField('confirmPw')}
                onBlur={() => setFocusedField(null)}
              />
              {/* Live mismatch warning */}
              {confirmPassword && confirmPassword !== newPassword && (
                <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                  Passwords do not match
                </p>
              )}
            </FormField>

            {/* Password strength indicator */}
            {newPassword.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: '3px', borderRadius: '999px',
                      background: i <= passwordStrength(newPassword)
                        ? strengthColor(passwordStrength(newPassword))
                        : 'var(--bg-overlay)',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: strengthColor(passwordStrength(newPassword)) }}>
                  {strengthLabel(passwordStrength(newPassword))}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              style={{
                padding: '11px', borderRadius: '10px', border: 'none',
                background: passwordLoading
                  ? 'var(--bg-overlay)'
                  : (!currentPassword || !newPassword || !confirmPassword)
                  ? 'var(--bg-overlay)'
                  : 'var(--accent)',
                color: (!currentPassword || !newPassword || !confirmPassword) || passwordLoading
                  ? 'var(--text-muted)'
                  : '#000',
                fontSize: '14px', fontWeight: 700,
                cursor: passwordLoading || !currentPassword || !newPassword || !confirmPassword
                  ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ── Password strength helpers ─────────────────────────────────────────────────
// WHY: gives users instant feedback on how strong their password is.
// Score 1-4 based on length, numbers, symbols, uppercase.

function passwordStrength(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  return Math.max(1, score)
}

function strengthColor(score: number): string {
  return ['', 'var(--danger)', '#f59e0b', '#f59e0b', 'var(--success)'][score]
}

function strengthLabel(score: number): string {
  return ['', 'Weak', 'Fair', 'Good', 'Strong'][score]
}

// ── Small reusable components ─────────────────────────────────────────────────

function Banner({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success'
  return (
    <div style={{
      background: isSuccess ? '#22c55e18' : '#ef444420',
      border: `1px solid ${isSuccess ? '#22c55e50' : '#ef444440'}`,
      borderRadius: '10px', padding: '12px 16px',
      fontSize: '13.5px',
      color: isSuccess ? '#22c55e' : '#ef4444',
      fontWeight: 500,
    }}>
      {message}
    </div>
  )
}

function FormField({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '13px', fontWeight: 500,
        color: 'var(--text-secondary)', marginBottom: '6px',
      }}>
        {label}
        {hint && (
          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)',
  fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
}
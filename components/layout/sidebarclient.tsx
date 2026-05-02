'use client'
// components/layout/SidebarClient.tsx
// Replit-style sidebar — dark, minimal, tight spacing, flat icons
// Mobile: uses JS window width detection (not CSS media queries) for reliability
// On mobile (≤768px): sidebar is hidden, a top bar with hamburger is shown instead

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { openSearch } from '@/components/search/SearchModel'
import type { User } from '@supabase/supabase-js'

type Profile = {
  username: string | null
  avatar_url: string | null
  full_name: string | null
} | null

type Team = {
  id: string
  name: string
}

type Props = {
  user: User | null
  profile: Profile
  pendingInvitations?: number
}

const NAV_LINKS = [
  {
    label: 'Home',
    href: '/',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    label: 'Build-Ons',
    href: '/buildons',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    label: 'Teams',
    href: '/teams',
    showBadge: true,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: 'Assignments',
    href: '/assignments',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/profile/settings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function SidebarClient({ user, profile, pendingInvitations = 0 }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)

  // isMobile: true = show hamburger bar, false = show sidebar
  // Start as null so we don't render either until we know the screen size
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // Detect screen width using JS — runs only on client, 100% reliable
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= 768)
    }
    check() // run once immediately on mount
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close drawer when route changes
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    if (!user) return
    async function fetchTeams() {
      const { data } = await supabase
        .from('team_members')
        .select('teams ( id, name )')
        .eq('profile_id', user!.id)
      if (data) {
        setMyTeams(data.map((m: any) => m.teams).filter(Boolean))
      }
    }
    fetchTeams()
  }, [user])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const avatarLetter =
    profile?.username?.[0]?.toUpperCase() ??
    profile?.full_name?.[0]?.toUpperCase() ?? '?'

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const activeTeamId = pathname.startsWith('/teams/') ? pathname.split('/')[2] : null
  const activeTeam = myTeams.find(t => t.id === activeTeamId)
  const workspaceLabel = activeTeam?.name ?? profile?.full_name ?? profile?.username ?? 'My Workspace'
  const workspaceSubLabel = activeTeam ? 'Team workspace' : 'Personal workspace'

  // While we haven't measured the screen yet, render nothing
  // This prevents a flash of wrong layout on first load
  if (isMobile === null) return null

  // ── THE SIDEBAR PANEL ──
  // This exact same JSX is used in two places:
  // 1. Desktop: rendered directly in the flex row
  // 2. Mobile: rendered inside a sliding drawer
  const SidebarPanel = (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      height: '100vh',
      background: '#141416',
      borderRight: '1px solid #1f1f23',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'inherit',
    }}>

      {/* ── LOGO + ICONS ROW ── */}
      <div style={{
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #1f1f23',
      }}>
        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/forge-logo.png"
            alt="Forge"
            style={{
              width: '22px',
              height: '22px',
              objectFit: 'contain',
              filter: 'invert(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(0.95)',
            }}
          />
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#f0f0f2', letterSpacing: '-0.2px' }}>
            Forge
          </span>
        </div>

        {/* Right icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {user && (
            <>
              <button
                onClick={openSearch}
                title="Search (Cmd+K)"
                onMouseEnter={e => (e.currentTarget.style.color = '#8b8b99')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4a4a55')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a55', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
              <button
                onClick={() => router.push('/teams?tab=invitations')}
                title="Team invitations"
                onMouseEnter={e => (e.currentTarget.style.color = '#8b8b99')}
                onMouseLeave={e => (e.currentTarget.style.color = pendingInvitations > 0 ? '#f59e0b' : '#4a4a55')}
                style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', color: pendingInvitations > 0 ? '#f59e0b' : '#4a4a55', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {pendingInvitations > 0 && (
                  <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', border: '1.5px solid #141416' }} />
                )}
              </button>
            </>
          )}
          {/* X close button — only shown in mobile drawer */}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b8b99')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a4a55')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a55', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── WORKSPACE SWITCHER ── */}
      {user && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #1f1f23', position: 'relative' }}>
          <button
            onClick={() => setWorkspaceOpen(o => !o)}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '6px 8px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', transition: 'background 0.15s' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #2a2a2e', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f59e0b22', border: '1px solid #f59e0b44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
                {avatarLetter}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                {workspaceLabel}
              </div>
              <div style={{ fontSize: '11px', color: '#4a4a55', marginTop: '1px' }}>{workspaceSubLabel}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4a4a55" strokeWidth="2.5" strokeLinecap="round" style={{ transform: workspaceOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {workspaceOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% - 2px)', left: '10px', right: '10px', background: '#1c1c1f', border: '1px solid #2a2a2e', borderRadius: '10px', zIndex: 100, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '8px 12px 5px', fontSize: '10px', color: '#4a4a55', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Account</div>
              <DropdownItem label={`@${profile?.username ?? 'profile'}`} sublabel="View public profile" onClick={() => { setWorkspaceOpen(false); router.push(`/profile/${profile?.username}`) }} />
              <DropdownItem label="Edit Profile" sublabel="Update bio, avatar, info" onClick={() => { setWorkspaceOpen(false); router.push('/profile/settings') }} />
              <div style={{ height: '1px', background: '#1f1f23', margin: '4px 0' }} />
              <div style={{ padding: '5px 12px 4px', fontSize: '10px', color: '#4a4a55', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Workspaces</div>
              <DropdownItem label="Personal" sublabel="Your personal projects" active={!activeTeam} onClick={() => { setWorkspaceOpen(false); router.push('/') }} />
              {myTeams.map(team => (
                <DropdownItem
                  key={team.id}
                  label={team.name}
                  sublabel="Team workspace"
                  active={activeTeamId === team.id}
                  onClick={() => { setWorkspaceOpen(false); router.push(`/teams/${team.id}`) }}
                />
              ))}
              <div style={{ height: '1px', background: '#1f1f23', margin: '4px 0' }} />
              <DropdownItem label="Create or join a team" onClick={() => { setWorkspaceOpen(false); router.push('/teams') }} />
            </div>
          )}
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #1f1f23', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <SidebarBtn
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          label="Create something new"
          onClick={() => router.push('/projects/submit')}
        />
        <SidebarBtn
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
          label="Import code or design"
          onClick={() => router.push('/projects/submit')}
        />
      </div>

      {/* ── NAV LINKS ── */}
      <nav style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
        {NAV_LINKS.map(link => {
          const active = isActive(link.href)
          const showBadge = (link as any).showBadge && pendingInvitations > 0
          return (
            <a
              key={link.href}
              href={link.href}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#f0f0f2' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b8b99' } }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '6px 8px',
                borderRadius: '7px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: active ? 500 : 400,
                marginBottom: '1px',
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: active ? '#f0f0f2' : '#8b8b99',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, opacity: active ? 1 : 0.7 }}>{link.icon}</span>
              {link.label}
              {showBadge && (
                <span style={{ marginLeft: 'auto', minWidth: '17px', height: '17px', borderRadius: '999px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {pendingInvitations}
                </span>
              )}
              {active && !showBadge && (
                <span style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }} />
              )}
            </a>
          )
        })}
      </nav>

      {/* ── BOTTOM: logout / login ── */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #1f1f23', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {user ? (
          <SidebarBtn
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
            label="Log out"
            onClick={handleLogout}
            danger
          />
        ) : (
          <>
            <SidebarBtn
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>}
              label="Log in"
              onClick={() => router.push('/login')}
            />
            <SidebarBtn
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
              label="Sign up"
              onClick={() => router.push('/signup')}
              accent
            />
          </>
        )}
      </div>
    </aside>
  )

  // ── DESKTOP LAYOUT ──
  // Sidebar sits directly in the flex row, always visible
  if (!isMobile) {
    return (
      <div style={{ position: 'sticky', top: 0, height: '100vh', flexShrink: 0, zIndex: 50 }}>
        {SidebarPanel}
      </div>
    )
  }

  // ── MOBILE LAYOUT ──
  // Fixed top bar with hamburger + sliding drawer from left
  return (
    <>
      {/* Fixed top bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '52px',
        background: '#141416',
        borderBottom: '1px solid #1f1f23',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 98,
      }}>
        {/* Left: hamburger + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setMobileOpen(o => !o)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8b8b99', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <img src="/forge-logo.png" alt="Forge" style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'invert(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(0.95)' }} />
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#f0f0f2' }}>Forge</span>
          </div>
        </div>

        {/* Right: search + bell */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={openSearch}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a55', padding: '6px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          {user && (
            <button
              onClick={() => router.push('/teams?tab=invitations')}
              style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', color: pendingInvitations > 0 ? '#f59e0b' : '#4a4a55', padding: '6px', display: 'flex', alignItems: 'center' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {pendingInvitations > 0 && (
                <span style={{ position: 'absolute', top: '3px', right: '3px', width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', border: '1.5px solid #141416' }} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Dark overlay behind drawer — tap to close */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 99,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sliding drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
      }}>
        {SidebarPanel}
      </div>
    </>
  )
}

// ── DROPDOWN ITEM ──
function DropdownItem({
  label, sublabel, active, onClick,
}: {
  label: string
  sublabel?: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(245,158,11,0.06)' : 'transparent' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '7px 12px',
        width: '100%',
        background: active ? 'rgba(245,158,11,0.06)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: 500, color: active ? '#f59e0b' : '#f0f0f2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: '10.5px', color: '#4a4a55', marginTop: '1px' }}>{sublabel}</div>
        )}
      </div>
      {active && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  )
}

// ── SIDEBAR BUTTON ──
function SidebarBtn({
  icon, label, onClick, danger, accent,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : accent ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)'
        e.currentTarget.style.color = danger ? '#ef4444' : accent ? '#fbbf24' : '#f0f0f2'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = accent ? 'rgba(245,158,11,0.08)' : 'transparent'
        e.currentTarget.style.color = accent ? '#f59e0b' : '#8b8b99'
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '6px 8px',
        borderRadius: '7px',
        background: accent ? 'rgba(245,158,11,0.08)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 400,
        color: accent ? '#f59e0b' : '#8b8b99',
        width: '100%',
        textAlign: 'left',
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      <span style={{ display: 'flex', opacity: 0.8 }}>{icon}</span>
      {label}
    </button>
  )
}

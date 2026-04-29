'use client'
// components/layout/SidebarClient.tsx

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
    label: 'Home', href: '/',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    label: 'Projects', href: '/projects',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: 'Build-Ons', href: '/buildons',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  },
  {
    label: 'Teams', href: '/teams', showBadge: true,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    label: 'Assignments', href: '/assignments',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  },
  {
    label: 'Settings', href: '/profile/settings',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
]

export default function SidebarClient({ user, profile, pendingInvitations = 0 }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [myTeams, setMyTeams] = useState<Team[]>([])

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
    router.push('/')
    router.refresh()
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

  return (
    <aside style={{
      width: '220px', minWidth: '220px', height: '100vh',
      position: 'sticky', top: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50, overflow: 'hidden',
    }}>

      {/* ── LOGO BAR ── */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
  src="/forge-logo.png"
  alt="Forge"
  style={{
    width: '28px', height: '28px',
    objectFit: 'contain',
    filter: 'invert(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(0.95)',
  }}
/>
<span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
  Forge
</span>
        </div>

        {/* Right: search + bell */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {/* Search button */}
            <button
              onClick={openSearch}
              title="Search (Cmd+K)"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '4px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>

            {/* Bell button */}
            <button
              onClick={() => router.push('/teams?tab=invitations')}
              title="Team invitations"
              style={{
                position: 'relative', background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '4px', borderRadius: '6px',
                color: pendingInvitations > 0 ? 'var(--accent)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = pendingInvitations > 0 ? 'var(--accent)' : 'var(--text-muted)')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {pendingInvitations > 0 && (
                <span style={{
                  position: 'absolute', top: '2px', right: '2px',
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'var(--danger)', border: '1.5px solid var(--bg-surface)',
                }} />
              )}
            </button>
          </div>
        )}
      </div>
      {/* ── END LOGO BAR ── */}

      {/* ── WORKSPACE SWITCHER ── */}
      {user && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
          <button
            onClick={() => setWorkspaceOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 10px', borderRadius: '9px',
              background: workspaceOpen ? 'var(--bg-elevated)' : 'transparent',
              border: 'none', cursor: 'pointer', width: '100%',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.background = workspaceOpen ? 'var(--bg-elevated)' : 'transparent')}
          >
            {activeTeam ? (
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: '#22c55e18', border: '1px solid #22c55e40',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, color: '#22c55e', flexShrink: 0,
              }}>
                {activeTeam.name[0].toUpperCase()}
              </div>
            ) : profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{
                width: '30px', height: '30px', borderRadius: '50%',
                objectFit: 'cover', border: '1.5px solid var(--border)', flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--accent-dim)', border: '1.5px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
              }}>
                {avatarLetter}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{
                fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {workspaceLabel}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                {workspaceSubLabel}
              </div>
            </div>

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: workspaceOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {workspaceOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% - 4px)',
              left: '12px', right: '12px',
              background: 'var(--bg-overlay)', border: '1px solid var(--border)',
              borderRadius: '10px', zIndex: 100, overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <div style={{ padding: '8px 12px 6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Account
              </div>
              <DropdownBtn
                label={`@${profile?.username ?? 'profile'}`}
                sublabel="View public profile"
                icon="👤"
                onClick={() => { setWorkspaceOpen(false); router.push(`/profile/${profile?.username}`) }}
              />
              <DropdownBtn
                label="Edit Profile"
                sublabel="Update bio, avatar, info"
                icon="✏️"
                onClick={() => { setWorkspaceOpen(false); router.push('/profile/settings') }}
              />
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
              <div style={{ padding: '6px 12px 4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Workspaces
              </div>
              <DropdownBtn
                label="Personal"
                sublabel="Your personal projects"
                icon={avatarLetter}
                iconStyle={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '50%' }}
                onClick={() => { setWorkspaceOpen(false); router.push('/') }}
                active={!activeTeam}
              />
              {myTeams.map(team => (
                <DropdownBtn
                  key={team.id}
                  label={team.name}
                  sublabel="Team workspace"
                  icon={team.name[0].toUpperCase()}
                  iconStyle={{ background: '#22c55e18', border: '1px solid #22c55e40', color: '#22c55e', borderRadius: '8px' }}
                  onClick={() => { setWorkspaceOpen(false); router.push(`/teams/${team.id}`) }}
                  active={activeTeamId === team.id}
                />
              ))}
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
              <DropdownBtn
                label="Create or join a team"
                icon="+"
                iconStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '7px', fontSize: '14px' }}
                onClick={() => { setWorkspaceOpen(false); router.push('/teams') }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '3px', borderBottom: '1px solid var(--border-subtle)' }}>
        <SidebarActionBtn
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          label="Create something new"
          onClick={() => router.push('/projects/submit')}
        />
        <SidebarActionBtn
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
          label="Import code or design"
          onClick={() => router.push('/projects/submit')}
        />
      </div>

      {/* ── NAV LINKS ── */}
      <nav style={{ padding: '10px 10px', flex: 1, overflowY: 'auto' }}>
        {NAV_LINKS.map(link => {
          const active = isActive(link.href)
          const showBadge = (link as any).showBadge && pendingInvitations > 0
          return (
            <a key={link.href} href={link.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 10px', borderRadius: '8px',
              textDecoration: 'none', fontSize: '13.5px', fontWeight: 500,
              marginBottom: '2px',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'background 0.15s, color 0.15s',
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
            >
              <span style={{ opacity: active ? 1 : 0.6, display: 'flex', flexShrink: 0 }}>{link.icon}</span>
              {link.label}
              {showBadge && (
                <span style={{
                  marginLeft: 'auto', minWidth: '18px', height: '18px',
                  borderRadius: '999px', background: 'var(--danger)', color: '#fff',
                  fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>{pendingInvitations}</span>
              )}
              {active && !showBadge && (
                <span style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)' }} />
              )}
            </a>
          )
        })}
      </nav>

      {/* ── BOTTOM ── */}
      <div style={{ padding: '10px 10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {user ? (
          <SidebarActionBtn
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
            label="Log out" onClick={handleLogout} danger
          />
        ) : (
          <>
            <SidebarActionBtn
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>}
              label="Log in" onClick={() => router.push('/login')}
            />
            <SidebarActionBtn
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
              label="Sign up" onClick={() => router.push('/signup')} accent
            />
          </>
        )}
      </div>
    </aside>
  )
}

function DropdownBtn({ label, sublabel, icon, iconStyle, onClick, active }: {
  label: string; sublabel?: string; icon: string
  iconStyle?: React.CSSProperties; onClick: () => void; active?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '9px',
      padding: '7px 12px', width: '100%',
      background: active ? 'var(--accent-dim)' : 'transparent',
      border: 'none', cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        width: '24px', height: '24px', borderRadius: '7px',
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)',
        flexShrink: 0, ...iconStyle,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: 500, color: active ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
        {sublabel && <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{sublabel}</div>}
      </div>
      {active && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  )
}

type ActionBtnProps = { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; accent?: boolean }

function SidebarActionBtn({ icon, label, onClick, danger, accent }: ActionBtnProps) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '9px',
      padding: '7px 10px', borderRadius: '8px',
      background: accent ? 'var(--accent-dim)' : 'transparent',
      border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
      color: accent ? 'var(--accent)' : 'var(--text-secondary)',
      width: '100%', textAlign: 'left', transition: 'background 0.15s, color 0.15s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : accent ? 'var(--accent-dim)' : 'var(--bg-elevated)'
        e.currentTarget.style.color = danger ? 'var(--danger)' : accent ? 'var(--accent-hover)' : 'var(--text-primary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = accent ? 'var(--accent-dim)' : 'transparent'
        e.currentTarget.style.color = accent ? 'var(--accent)' : 'var(--text-secondary)'
      }}
    >
      <span style={{ display: 'flex', opacity: 0.75 }}>{icon}</span>
      {label}
    </button>
  )
}

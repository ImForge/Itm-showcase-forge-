'use client'
// app/(main)/teams/page.tsx
// Teams page — create teams, view your teams, search all teams, manage invitations

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Team = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  team_members: { profile_id: string; role: string; profiles: { username: string | null; full_name: string | null; avatar_url: string | null } }[]
}

type Invitation = {
  id: string
  status: string
  created_at: string
  teams: { id: string; name: string; description: string | null }
  inviter: { username: string | null; full_name: string | null }
}

// Which tab is active: 'my-teams' | 'browse' | 'invitations'
type Tab = 'my-teams' | 'browse' | 'invitations'

export default function TeamsPage() {
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('my-teams')
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Create team form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Invite member state (per team)
  const [inviteUsername, setInviteUsername] = useState('')
  const [invitingFor, setInvitingFor] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState('')

  // Browse search
  const [browseSearch, setBrowseSearch] = useState('')

  useEffect(() => {
    // Read tab from URL param
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab') as Tab | null
    if (tabParam) setTab(tabParam)

    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    // My teams — teams where I'm a member
    const { data: myMemberships } = await supabase
      .from('team_members')
      .select(`
        role,
        teams (
          id, name, description, created_by, created_at,
          team_members ( profile_id, role, profiles ( username, full_name, avatar_url ) )
        )
      `)
      .eq('profile_id', user.id)

    const myTeamList = (myMemberships ?? []).map((m: any) => m.teams).filter(Boolean)
    setMyTeams(myTeamList)

    // All teams for browse
    const { data: allTeamData } = await supabase
      .from('teams')
      .select(`
        id, name, description, created_by, created_at,
        team_members ( profile_id, role, profiles ( username, full_name, avatar_url ) )
      `)
      .order('created_at', { ascending: false })
    setAllTeams((allTeamData as unknown as Team[]) ?? [])

    // My pending invitations
    const { data: inviteData } = await supabase
      .from('team_invitations')
      .select(`
        id, status, created_at,
        teams ( id, name, description ),
        inviter:profiles!team_invitations_invited_by_fkey ( username, full_name )
      `)
      .eq('invited_user', user.id)
      .eq('status', 'pending')
    setInvitations((inviteData as unknown as Invitation[]) ?? [])

    setLoading(false)
  }

  async function createTeam() {
    if (!newTeamName.trim() || !userId) return
    setCreating(true)

    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name: newTeamName.trim(), description: newTeamDesc.trim() || null, created_by: userId })
      .select()
      .single()

    if (!error && team) {
      // Add creator as leader
      await supabase.from('team_members').insert({ team_id: team.id, profile_id: userId, role: 'leader' })
      setNewTeamName('')
      setNewTeamDesc('')
      setShowCreateForm(false)
      await loadAll()
    }
    setCreating(false)
  }

  async function inviteMember(teamId: string) {
    setInviteError('')
    if (!inviteUsername.trim() || !userId) return

    // Find user by username
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', inviteUsername.trim())
      .single()

    if (!targetProfile) {
      setInviteError(`User "${inviteUsername}" not found`)
      return
    }

    // Check not already a member
    const { data: existing } = await supabase
      .from('team_members')
      .select('profile_id')
      .eq('team_id', teamId)
      .eq('profile_id', targetProfile.id)
      .single()

    if (existing) {
      setInviteError('This user is already in the team')
      return
    }

    // Check no pending invite already
    const { data: pendingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('invited_user', targetProfile.id)
      .eq('status', 'pending')
      .single()

    if (pendingInvite) {
      setInviteError('Invitation already sent')
      return
    }

    await supabase.from('team_invitations').insert({
      team_id: teamId,
      invited_by: userId,
      invited_user: targetProfile.id,
      status: 'pending',
    })

    setInviteUsername('')
    setInvitingFor(null)
  }

  async function respondInvitation(invitationId: string, teamId: string, accept: boolean) {
    if (accept) {
      // Add to team
      await supabase.from('team_members').insert({ team_id: teamId, profile_id: userId!, role: 'member' })
    }
    // Update invitation status
    await supabase
      .from('team_invitations')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', invitationId)

    await loadAll()
  }

  const filteredAllTeams = allTeams.filter(t =>
    browseSearch === '' ||
    t.name.toLowerCase().includes(browseSearch.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(browseSearch.toLowerCase())
  )

  const TabBtn = ({ id, label, badge }: { id: Tab; label: string; badge?: number }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '7px 16px', borderRadius: '8px', border: 'none',
        background: tab === id ? 'var(--bg-elevated)' : 'transparent',
        color: tab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '13.5px', fontWeight: tab === id ? 600 : 500,
        cursor: 'pointer', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}
    >
      {label}
      {badge ? (
        <span style={{
          minWidth: '18px', height: '18px', borderRadius: '999px',
          background: 'var(--danger)', color: '#fff',
          fontSize: '10px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px',
        }}>{badge}</span>
      ) : null}
    </button>
  )

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.8px', marginBottom: '4px' }}>
            Teams
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Create teams, collaborate on projects, invite members
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px', borderRadius: '9px',
            background: 'var(--accent)', border: 'none',
            color: '#fff', fontSize: '13.5px', fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Team
        </button>
      </div>

      {/* Create team modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}
          onClick={() => setShowCreateForm(false)}
        >
          <div
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '28px', width: '400px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
              Create a new team
            </h2>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
              Team name *
            </label>
            <input
              placeholder="e.g. The Debug Squad"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              style={{
                width: '100%', padding: '9px 13px',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13.5px',
                outline: 'none', marginBottom: '14px',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
              Description (optional)
            </label>
            <textarea
              placeholder="What will your team work on?"
              value={newTeamDesc}
              onChange={e => setNewTeamDesc(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '9px 13px',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
                outline: 'none', resize: 'none', marginBottom: '20px',
                fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{
                  padding: '8px 16px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={createTeam}
                disabled={!newTeamName.trim() || creating}
                style={{
                  padding: '8px 20px', borderRadius: '8px',
                  background: newTeamName.trim() ? 'var(--accent)' : 'var(--bg-overlay)',
                  border: 'none', color: newTeamName.trim() ? '#fff' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: 600, cursor: newTeamName.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {creating ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px', paddingBottom: '2px',
      }}>
        <TabBtn id="my-teams" label="My Teams" />
        <TabBtn id="browse" label="Browse All" />
        <TabBtn id="invitations" label="Invitations" badge={invitations.length} />
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '40px 0', textAlign: 'center' }}>
          Loading...
        </div>
      ) : (

        <>
          {/* MY TEAMS TAB */}
          {tab === 'my-teams' && (
            <div>
              {myTeams.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '60px 24px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    You're not in any teams yet
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Create a new team or browse existing ones to join
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    style={{
                      padding: '8px 20px', borderRadius: '8px',
                      background: 'var(--accent)', border: 'none',
                      color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Create your first team
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myTeams.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      userId={userId!}
                      invitingFor={invitingFor}
                      setInvitingFor={setInvitingFor}
                      inviteUsername={inviteUsername}
                      setInviteUsername={setInviteUsername}
                      inviteError={inviteError}
                      setInviteError={setInviteError}
                      onInvite={inviteMember}
                      showInvitePanel
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BROWSE TAB */}
          {tab === 'browse' && (
            <div>
              <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '360px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  placeholder="Search teams..."
                  value={browseSearch}
                  onChange={e => setBrowseSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 34px',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '9px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredAllTeams.map(team => (
                  <TeamCard key={team.id} team={team} userId={userId!} showInvitePanel={false} />
                ))}
              </div>
            </div>
          )}

          {/* INVITATIONS TAB */}
          {tab === 'invitations' && (
            <div>
              {invitations.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '60px 24px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔔</div>
                  No pending invitations
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {invitations.map(inv => (
                    <div key={inv.id} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '16px 18px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: '12px',
                    }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: '#7c6aff18', border: '1px solid #7c6aff40',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', flexShrink: 0,
                      }}>👥</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {(inv.teams as any)?.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Invited by {(inv.inviter as any)?.username ?? 'someone'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => respondInvitation(inv.id, (inv.teams as any)?.id, false)}
                          style={{
                            padding: '7px 14px', borderRadius: '7px',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text-secondary)', fontSize: '12.5px', cursor: 'pointer',
                          }}
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => respondInvitation(inv.id, (inv.teams as any)?.id, true)}
                          style={{
                            padding: '7px 14px', borderRadius: '7px',
                            border: 'none', background: 'var(--accent)',
                            color: '#fff', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Team Card ─────────────────────────────────────────────────────────────────
function TeamCard({
  team, userId, showInvitePanel,
  invitingFor, setInvitingFor,
  inviteUsername, setInviteUsername,
  inviteError, setInviteError,
  onInvite,
}: {
  team: Team
  userId: string
  showInvitePanel: boolean
  invitingFor?: string | null
  setInvitingFor?: (id: string | null) => void
  inviteUsername?: string
  setInviteUsername?: (v: string) => void
  inviteError?: string
  setInviteError?: (v: string) => void
  onInvite?: (teamId: string) => void
}) {
  const isLeader = team.team_members?.some(m => m.profile_id === userId && m.role === 'leader')
  const memberCount = team.team_members?.length ?? 0

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {team.name}
            </span>
            {isLeader && (
              <span style={{
                padding: '2px 7px', borderRadius: '4px',
                background: '#f59e0b18', border: '1px solid #f59e0b40',
                color: '#f59e0b', fontSize: '10px', fontWeight: 600,
              }}>
                Leader
              </span>
            )}
          </div>
          {team.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              {team.description}
            </p>
          )}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '12px' }}>
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Members row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {team.team_members?.map(m => (
          <div key={m.profile_id} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 8px', borderRadius: '999px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          }}>
            <div style={{
              width: '18px', height: '18px', borderRadius: '50%',
              background: m.role === 'leader' ? '#f59e0b30' : 'var(--accent-dim)',
              border: `1px solid ${m.role === 'leader' ? '#f59e0b60' : 'var(--accent)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700,
              color: m.role === 'leader' ? '#f59e0b' : 'var(--accent)',
            }}>
              {m.profiles?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {m.profiles?.username ?? 'unknown'}
            </span>
            {m.role === 'leader' && (
              <span style={{ fontSize: '9px', color: '#f59e0b' }}>★</span>
            )}
          </div>
        ))}

        {/* Invite button — only for leaders */}
        {showInvitePanel && isLeader && (
          <button
            onClick={() => {
              setInvitingFor?.(invitingFor === team.id ? null : team.id)
              setInviteError?.('')
              setInviteUsername?.('')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', borderRadius: '999px',
              background: 'transparent', border: '1px dashed var(--border)',
              color: 'var(--text-muted)', fontSize: '11.5px', cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            + Invite
          </button>
        )}
      </div>

      {/* Invite input — expands when "Invite" is clicked */}
      {showInvitePanel && invitingFor === team.id && (
        <div style={{
          marginTop: '12px', padding: '12px',
          background: 'var(--bg-elevated)', borderRadius: '8px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Invite by username
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              placeholder="username"
              value={inviteUsername ?? ''}
              onChange={e => { setInviteUsername?.(e.target.value); setInviteError?.('') }}
              style={{
                flex: 1, padding: '7px 11px',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '7px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              onKeyDown={e => { if (e.key === 'Enter') onInvite?.(team.id) }}
            />
            <button
              onClick={() => onInvite?.(team.id)}
              style={{
                padding: '7px 14px', borderRadius: '7px',
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Send
            </button>
          </div>
          {inviteError && (
            <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '6px' }}>
              {inviteError}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

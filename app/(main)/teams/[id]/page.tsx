'use client'
// app/(main)/teams/[id]/page.tsx
// Team workspace — shows team info, members panel on right, team projects on left

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Member = {
  profile_id: string
  role: string
  joined_at: string
  profiles: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }
}

type Project = {
  id: string
  title: string
  description: string
  thumbnail_url: string | null
  views: number
  created_at: string
  status: string
  project_tags: { tags: { id: string; name: string; color: string } }[]
}

type Team = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
}

export default function TeamWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  const supabase = createClient()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Invite panel state
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  useEffect(() => { loadWorkspace() }, [teamId])

  async function loadWorkspace() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    // Fetch team info
    const { data: teamData, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (error || !teamData) { setNotFound(true); setLoading(false); return }
    setTeam(teamData)

    // Fetch members with profiles
    const { data: memberData } = await supabase
      .from('team_members')
      .select('profile_id, role, joined_at, profiles ( username, full_name, avatar_url )')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })
    setMembers((memberData as unknown as Member[]) ?? [])

    // Fetch team projects
    const { data: projectData } = await supabase
      .from('projects')
      .select(`
        id, title, description, thumbnail_url, views, created_at, status,
        project_tags ( tags ( id, name, color ) )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
    setProjects((projectData as unknown as Project[]) ?? [])

    setLoading(false)
  }

  async function sendInvite() {
    setInviteError('')
    setInviteSuccess('')
    if (!inviteUsername.trim() || !userId) return

    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', inviteUsername.trim())
      .single()

    if (!target) { setInviteError(`User "${inviteUsername}" not found`); return }

    const { data: alreadyMember } = await supabase
      .from('team_members')
      .select('profile_id')
      .eq('team_id', teamId)
      .eq('profile_id', target.id)
      .single()

    if (alreadyMember) { setInviteError('Already a member'); return }

    const { data: alreadyInvited } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('invited_user', target.id)
      .eq('status', 'pending')
      .single()

    if (alreadyInvited) { setInviteError('Invitation already sent'); return }

    await supabase.from('team_invitations').insert({
      team_id: teamId, invited_by: userId,
      invited_user: target.id, status: 'pending',
    })

    setInviteSuccess(`Invitation sent to @${inviteUsername}!`)
    setInviteUsername('')
  }

  const isLeader = members.some(m => m.profile_id === userId && m.role === 'leader')
  const isMember = members.some(m => m.profile_id === userId)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontSize: '14px' }}>
      Loading workspace...
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Team not found</div>
      <button onClick={() => router.push('/teams')} style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>
        Back to Teams
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── LEFT: Main workspace area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px',
        }}>
          <button onClick={() => router.push('/teams')} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px', borderRadius: '6px',
            display: 'flex', alignItems: 'center',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>

          {/* Team icon */}
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#22c55e18', border: '1px solid #22c55e40',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 700, color: '#22c55e',
          }}>
            {team!.name[0].toUpperCase()}
          </div>

          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {team!.name}
            </h1>
            {team!.description && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {team!.description}
              </p>
            )}
          </div>

          {/* Submit project as team — only members */}
          {isMember && (
            <a href={`/projects/submit?team=${teamId}`} style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none', cursor: 'pointer',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Submit Team Project
            </a>
          )}
        </div>

        {/* Projects section */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Team Projects
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {projects.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              No team projects yet
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Submit your first project as a team
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {projects.map(project => {
              const firstTag = (project.project_tags as any)?.[0]?.tags
              const accent = firstTag?.color ?? '#7c6aff'
              return (
                <a key={project.id} href={`/projects/${project.id}`} style={{
                  display: 'block', background: 'var(--bg-surface)',
                  border: '1px solid var(--border)', borderRadius: '11px',
                  padding: '14px', textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent + '60')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {/* Thumbnail or color block */}
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.title} style={{
                      width: '100%', height: '100px', objectFit: 'cover',
                      borderRadius: '7px', marginBottom: '10px', border: '1px solid var(--border)',
                    }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100px', borderRadius: '7px',
                      background: accent + '15', border: `1px solid ${accent}30`,
                      marginBottom: '10px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '28px',
                    }}>🚀</div>
                  )}

                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                      background: project.status === 'approved' ? '#22c55e18' : project.status === 'pending' ? '#f59e0b18' : '#ef444418',
                      border: `1px solid ${project.status === 'approved' ? '#22c55e40' : project.status === 'pending' ? '#f59e0b40' : '#ef444440'}`,
                      color: project.status === 'approved' ? '#22c55e' : project.status === 'pending' ? '#f59e0b' : '#ef4444',
                      textTransform: 'capitalize',
                    }}>
                      {project.status}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      {project.views}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {project.title}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {project.description}
                  </div>

                  {/* Tags */}
                  {(project.project_tags as any)?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {(project.project_tags as any).slice(0, 3).map((pt: any) => (
                        <span key={pt.tags.id} style={{
                          padding: '2px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 500,
                          background: pt.tags.color + '20', color: pt.tags.color,
                          border: `1px solid ${pt.tags.color}40`,
                        }}>{pt.tags.name}</span>
                      ))}
                    </div>
                  )}
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: Members panel ── */}
      <div style={{
        width: '240px', minWidth: '240px',
        borderLeft: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '24px 16px 12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Members · {members.length}
          </div>

          {/* Member list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {members.map(m => (
              <a key={m.profile_id} href={`/profile/${m.profiles?.username}`} style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '7px 8px', borderRadius: '8px',
                textDecoration: 'none', transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                {m.profiles?.avatar_url ? (
                  <img src={m.profiles.avatar_url} alt="" style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    objectFit: 'cover', border: '1.5px solid var(--border)', flexShrink: 0,
                  }} />
                ) : (
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: m.role === 'leader' ? '#f59e0b20' : 'var(--accent-dim)',
                    border: `1.5px solid ${m.role === 'leader' ? '#f59e0b60' : 'var(--accent)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700,
                    color: m.role === 'leader' ? '#f59e0b' : 'var(--accent)',
                  }}>
                    {m.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.profiles?.username ?? 'unknown'}
                  </div>
                  <div style={{ fontSize: '10.5px', color: m.role === 'leader' ? '#f59e0b' : 'var(--text-muted)' }}>
                    {m.role === 'leader' ? '★ Leader' : 'Member'}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Invite panel — leaders only */}
          {isLeader && (
            <div style={{ marginTop: '16px' }}>
              {!showInvite ? (
                <button onClick={() => setShowInvite(true)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 10px', borderRadius: '8px', width: '100%',
                  background: 'transparent', border: '1px dashed var(--border)',
                  color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Invite member
                </button>
              ) : (
                <div style={{ padding: '10px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '7px' }}>Invite by username</div>
                  <input placeholder="username" value={inviteUsername}
                    onChange={e => { setInviteUsername(e.target.value); setInviteError(''); setInviteSuccess('') }}
                    onKeyDown={e => { if (e.key === 'Enter') sendInvite() }}
                    style={{
                      width: '100%', padding: '6px 10px', marginBottom: '6px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12.5px', outline: 'none',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setShowInvite(false); setInviteUsername(''); setInviteError(''); setInviteSuccess('') }}
                      style={{ flex: 1, padding: '5px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: '11.5px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button onClick={sendInvite}
                      style={{ flex: 1, padding: '5px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>
                      Send
                    </button>
                  </div>
                  {inviteError && <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '5px' }}>{inviteError}</div>}
                  {inviteSuccess && <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '5px' }}>{inviteSuccess}</div>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Team meta info at bottom */}
        <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Created {new Date(team!.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {!isMember && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', padding: '8px', background: 'var(--bg-elevated)', borderRadius: '7px', border: '1px solid var(--border)' }}>
              You're not a member of this team
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

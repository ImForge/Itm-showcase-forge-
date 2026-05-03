'use client'
// app/(main)/teams/[id]/page.tsx
// Team workspace — fully mobile responsive
// Features:
// - Mobile: members panel hidden, opens as overlay via member count button top right
// - Team stats bar (projects, members, created date)
// - Edit team name + description + logo image upload
// - Leave team button (members)
// - Delete team (leader only, with confirm)
// - Member roles clearly shown with badges
// - Invite by username (leader only)

import { useState, useEffect, useRef } from 'react'
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
  logo_url: string | null
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

  // Members panel (mobile overlay)
  const [membersOpen, setMembersOpen] = useState(false)

  // Invite
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  // Edit team
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Delete team
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Leave team
  const [leaveLoading, setLeaveLoading] = useState(false)

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth <= 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    document.body.style.overflow = (isMobile && membersOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobile, membersOpen])

  useEffect(() => { loadWorkspace() }, [teamId])

  async function loadWorkspace() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const { data: teamData, error } = await supabase
      .from('teams').select('*').eq('id', teamId).single()

    if (error || !teamData) { setNotFound(true); setLoading(false); return }
    setTeam(teamData)
    setEditName(teamData.name)
    setEditDescription(teamData.description ?? '')

    const { data: memberData } = await supabase
      .from('team_members')
      .select('profile_id, role, joined_at, profiles ( username, full_name, avatar_url )')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })
    setMembers((memberData as unknown as Member[]) ?? [])

    const { data: projectData } = await supabase
      .from('projects')
      .select(`id, title, description, thumbnail_url, views, created_at, status, project_tags ( tags ( id, name, color ) )`)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
    setProjects((projectData as unknown as Project[]) ?? [])

    setLoading(false)
  }

  // ── LOGO FILE HANDLER ──
  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setEditError('Logo must be an image file'); return }
    if (file.size > 3 * 1024 * 1024) { setEditError('Logo must be under 3MB'); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setRemoveLogo(false)
    setEditError('')
  }

  // ── INVITE ──
  async function sendInvite() {
    setInviteError('')
    setInviteSuccess('')
    if (!inviteUsername.trim() || !userId) return

    const { data: target } = await supabase
      .from('profiles').select('id').eq('username', inviteUsername.trim()).single()
    if (!target) { setInviteError(`User "${inviteUsername}" not found`); return }

    const { data: alreadyMember } = await supabase
      .from('team_members').select('profile_id').eq('team_id', teamId).eq('profile_id', target.id).single()
    if (alreadyMember) { setInviteError('Already a member'); return }

    const { data: alreadyInvited } = await supabase
      .from('team_invitations').select('id').eq('team_id', teamId).eq('invited_user', target.id).eq('status', 'pending').single()
    if (alreadyInvited) { setInviteError('Invitation already sent'); return }

    await supabase.from('team_invitations').insert({
      team_id: teamId, invited_by: userId, invited_user: target.id, status: 'pending',
    })
    setInviteSuccess(`Invitation sent to @${inviteUsername}!`)
    setInviteUsername('')
  }

  // ── EDIT TEAM ──
  async function handleEditTeam() {
    if (!editName.trim()) { setEditError('Team name is required'); return }
    setEditLoading(true)
    setEditError('')

    let newLogoUrl = team?.logo_url ?? null

    // Upload new logo if picked
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const filePath = `${teamId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(filePath, logoFile, { upsert: true })

      if (uploadError) {
        setEditError('Failed to upload logo: ' + uploadError.message)
        setEditLoading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('team-logos').getPublicUrl(filePath)
      newLogoUrl = urlData.publicUrl
    }

    // Remove logo if user clicked remove
    if (removeLogo) newLogoUrl = null

    const { error } = await supabase
      .from('teams')
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
        logo_url: newLogoUrl,
      })
      .eq('id', teamId)

    if (error) { setEditError(error.message); setEditLoading(false); return }

    // Update local state so UI reflects changes immediately
    setTeam(t => t ? {
      ...t,
      name: editName.trim(),
      description: editDescription.trim() || null,
      logo_url: newLogoUrl,
    } : t)

    setShowEdit(false)
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(false)
    setEditLoading(false)
  }

  // ── LEAVE TEAM ──
  async function handleLeaveTeam() {
    if (!userId) return
    setLeaveLoading(true)
    await supabase.from('team_members').delete().eq('team_id', teamId).eq('profile_id', userId)
    window.location.href = '/teams'
  }

  // ── DELETE TEAM ──
  async function handleDeleteTeam() {
    setDeleteLoading(true)
    await supabase.from('team_members').delete().eq('team_id', teamId)
    await supabase.from('team_invitations').delete().eq('team_id', teamId)
    await supabase.from('teams').delete().eq('id', teamId)
    window.location.href = '/teams'
  }

  const isLeader = members.some(m => m.profile_id === userId && m.role === 'leader')
  const isMember = members.some(m => m.profile_id === userId)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#4a4a55', fontSize: '14px' }}>
      Loading workspace...
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#4a4a55' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#8b8b99', marginBottom: '8px' }}>Team not found</div>
      <button onClick={() => router.push('/teams')} style={{ padding: '8px 18px', borderRadius: '8px', background: '#f59e0b', border: 'none', color: '#000', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
        Back to Teams
      </button>
    </div>
  )

  // ── TEAM LOGO DISPLAY ──
  // Shows uploaded image if available, falls back to letter avatar
  function TeamLogo({ size = 38 }: { size?: number }) {
    if (team?.logo_url) {
      return (
        <img
          src={team.logo_url}
          alt={team.name}
          style={{ width: size, height: size, borderRadius: '10px', objectFit: 'cover', border: '1px solid #2a2a2e', flexShrink: 0 }}
        />
      )
    }
    return (
      <div style={{ width: size, height: size, borderRadius: '10px', background: '#22c55e18', border: '1px solid #22c55e40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, fontWeight: 700, color: '#22c55e', flexShrink: 0 }}>
        {team!.name[0].toUpperCase()}
      </div>
    )
  }

  // ── MEMBERS PANEL ──
  const MembersPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1f1f23', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: '#4a4a55', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Members · {members.length}
        </span>
        {isMobile && (
          <button onClick={() => setMembersOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a55', padding: '2px', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Member list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {members.map(m => (
            <a key={m.profile_id} href={`/profile/${m.profiles?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 8px', borderRadius: '8px', textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {m.profiles?.avatar_url ? (
                <img src={m.profiles.avatar_url} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #2a2a2e', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: m.role === 'leader' ? '#f59e0b20' : '#f59e0b10', border: `1.5px solid ${m.role === 'leader' ? '#f59e0b60' : '#f59e0b30'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>
                  {m.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#f0f0f2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.profiles?.username ?? 'unknown'}
                </div>
                <div style={{ fontSize: '10.5px', color: m.role === 'leader' ? '#f59e0b' : '#4a4a55', marginTop: '1px' }}>
                  {m.role === 'leader' ? '★ Leader' : 'Member'}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Invite — leaders only */}
        {isLeader && (
          <div style={{ marginTop: '12px' }}>
            {!showInvite ? (
              <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: '8px', width: '100%', background: 'transparent', border: '1px dashed #2a2a2e', color: '#4a4a55', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#f59e0b' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2e'; e.currentTarget.style.color = '#4a4a55' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Invite member
              </button>
            ) : (
              <div style={{ padding: '10px', background: '#1c1c1f', borderRadius: '8px', border: '1px solid #2a2a2e' }}>
                <div style={{ fontSize: '11px', color: '#4a4a55', marginBottom: '7px' }}>Invite by username</div>
                <input
                  placeholder="username"
                  value={inviteUsername}
                  onChange={e => { setInviteUsername(e.target.value); setInviteError(''); setInviteSuccess('') }}
                  onKeyDown={e => { if (e.key === 'Enter') sendInvite() }}
                  style={{ width: '100%', padding: '6px 10px', marginBottom: '6px', background: '#141416', border: '1px solid #2a2a2e', borderRadius: '6px', color: '#f0f0f2', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => (e.target.style.borderColor = '#f59e0b')}
                  onBlur={e => (e.target.style.borderColor = '#2a2a2e')}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { setShowInvite(false); setInviteUsername(''); setInviteError(''); setInviteSuccess('') }}
                    style={{ flex: 1, padding: '5px', borderRadius: '6px', border: '1px solid #2a2a2e', background: 'transparent', color: '#8b8b99', fontSize: '11.5px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={sendInvite}
                    style={{ flex: 1, padding: '5px', borderRadius: '6px', border: 'none', background: '#f59e0b', color: '#000', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>
                    Send
                  </button>
                </div>
                {inviteError && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '5px' }}>{inviteError}</div>}
                {inviteSuccess && <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '5px' }}>{inviteSuccess}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid #1f1f23', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '10.5px', color: '#4a4a55', marginBottom: '6px' }}>
          Created {new Date(team!.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {isLeader && (
          <button onClick={() => setShowEdit(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px', borderRadius: '7px', background: 'transparent', border: 'none', color: '#8b8b99', fontSize: '12.5px', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f0f0f2' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b8b99' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit team
          </button>
        )}

        {isMember && !isLeader && (
          <button onClick={handleLeaveTeam} disabled={leaveLoading} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px', borderRadius: '7px', background: 'transparent', border: 'none', color: '#8b8b99', fontSize: '12.5px', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b8b99' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {leaveLoading ? 'Leaving...' : 'Leave team'}
          </button>
        )}

        {isLeader && (
          <button onClick={() => setShowDeleteConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px', borderRadius: '7px', background: 'transparent', border: 'none', color: '#8b8b99', fontSize: '12.5px', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b8b99' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete team
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0e0e10' }}>

        {/* ── LEFT: Main workspace ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '32px 28px' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button onClick={() => router.push('/teams')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a4a55', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8b8b99')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a4a55')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>

            <TeamLogo size={38} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 700, color: '#f0f0f2', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {team!.name}
              </h1>
              {team!.description && (
                <p style={{ fontSize: '12px', color: '#4a4a55', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {team!.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {isMember && (
                <a href={`/projects/submit?team=${teamId}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: isMobile ? '7px 10px' : '8px 16px', borderRadius: '8px', background: '#f59e0b', border: 'none', color: '#000', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {!isMobile && 'Submit Project'}
                </a>
              )}

              {isMobile && (
                <button onClick={() => setMembersOpen(true)} style={{ background: '#1c1c1f', border: '1px solid #2a2a2e', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#8b8b99', fontSize: '12px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {members.length}
                </button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: '#2a2a2e', borderRadius: '10px', overflow: 'hidden', border: '1px solid #2a2a2e', marginBottom: '28px' }}>
            {[
              { label: 'Projects', value: projects.length },
              { label: 'Members', value: members.length },
              { label: 'Created', value: new Date(team!.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#141416', padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f2', letterSpacing: '-0.3px' }}>{value}</div>
                <div style={{ fontSize: '10px', color: '#4a4a55', marginTop: '2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f0f0f2' }}>Team Projects</span>
            <span style={{ fontSize: '11.5px', color: '#4a4a55' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
          </div>

          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '52px 24px', background: '#141416', border: '1px solid #2a2a2e', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#8b8b99', marginBottom: '6px' }}>No team projects yet</p>
              <p style={{ fontSize: '13px', color: '#4a4a55' }}>Submit your first project as a team</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {projects.map(project => {
                const firstTag = (project.project_tags as any)?.[0]?.tags
                const accent = firstTag?.color ?? '#f59e0b'
                return (
                  <a key={project.id} href={`/projects/${project.id}`} style={{ display: 'block', background: '#141416', border: '1px solid #2a2a2e', borderRadius: '10px', padding: '12px', textDecoration: 'none', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#3a3a3e')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2e')}
                  >
                    {project.thumbnail_url ? (
                      <img src={project.thumbnail_url} alt={project.title} style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px', border: '1px solid #2a2a2e' }} />
                    ) : (
                      <div style={{ width: '100%', height: '90px', borderRadius: '6px', background: accent + '12', border: `1px solid ${accent}25`, marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🚀</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: project.status === 'approved' ? '#22c55e18' : '#f59e0b18', border: `1px solid ${project.status === 'approved' ? '#22c55e40' : '#f59e0b40'}`, color: project.status === 'approved' ? '#22c55e' : '#f59e0b', textTransform: 'capitalize' }}>
                        {project.status}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', color: '#4a4a55' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {project.views}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title}</div>
                    <div style={{ fontSize: '11.5px', color: '#4a4a55', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{project.description}</div>
                    {(project.project_tags as any)?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {(project.project_tags as any).slice(0, 3).map((pt: any) => (
                          <span key={pt.tags.id} style={{ padding: '2px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 500, background: pt.tags.color + '18', color: pt.tags.color, border: `1px solid ${pt.tags.color}35` }}>{pt.tags.name}</span>
                        ))}
                      </div>
                    )}
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Members panel desktop ── */}
        {!isMobile && (
          <div style={{ width: '220px', minWidth: '220px', borderLeft: '1px solid #1f1f23', background: '#141416', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {MembersPanel}
          </div>
        )}
      </div>

      {/* ── MOBILE: Members overlay ── */}
      {isMobile && membersOpen && (
        <div onClick={() => setMembersOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 99, backdropFilter: 'blur(2px)' }} />
      )}
      {isMobile && (
        <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: '260px', background: '#141416', borderLeft: '1px solid #1f1f23', zIndex: 100, transform: membersOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)', boxShadow: membersOpen ? '-4px 0 24px rgba(0,0,0,0.5)' : 'none', overflowY: 'auto' }}>
          {MembersPanel}
        </div>
      )}

      {/* ── EDIT TEAM MODAL ── */}
      {showEdit && (
        <div onClick={() => setShowEdit(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1c1c1f', border: '1px solid #2a2a2e', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#f0f0f2', marginBottom: '22px' }}>Edit Team</h2>

            {/* ── LOGO UPLOAD ── */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#8b8b99', marginBottom: '8px', fontWeight: 500 }}>Team Logo</label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Current logo preview */}
                <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #2a2a2e', flexShrink: 0, background: '#141416', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {removeLogo ? (
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{team!.name[0].toUpperCase()}</span>
                  ) : logoPreview ? (
                    <img src={logoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : team?.logo_url ? (
                    <img src={team.logo_url} alt="current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{team!.name[0].toUpperCase()}</span>
                  )}
                </div>

                {/* Upload actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    style={{ padding: '6px 14px', borderRadius: '7px', background: '#141416', border: '1px solid #2a2a2e', color: '#f0f0f2', fontSize: '12.5px', cursor: 'pointer', fontWeight: 500 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#f59e0b'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2e'}
                  >
                    {team?.logo_url || logoPreview ? 'Change logo' : 'Upload logo'}
                  </button>

                  {(team?.logo_url || logoPreview) && !removeLogo && (
                    <button
                      type="button"
                      onClick={() => { setRemoveLogo(true); setLogoFile(null); setLogoPreview(null) }}
                      style={{ padding: '6px 14px', borderRadius: '7px', background: 'transparent', border: '1px solid #2a2a2e', color: '#ef4444', fontSize: '12.5px', cursor: 'pointer' }}
                    >
                      Remove logo
                    </button>
                  )}

                  <p style={{ fontSize: '11px', color: '#4a4a55', margin: 0 }}>PNG, JPG — max 3MB</p>
                </div>
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* ── NAME ── */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#8b8b99', marginBottom: '6px', fontWeight: 500 }}>Team Name *</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: '#141416', border: '1px solid #2a2a2e', borderRadius: '8px', color: '#f0f0f2', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#f59e0b')}
                onBlur={e => (e.target.style.borderColor = '#2a2a2e')}
              />
            </div>

            {/* ── DESCRIPTION ── */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#8b8b99', marginBottom: '6px', fontWeight: 500 }}>Description</label>
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="What is this team working on?"
                rows={3}
                style={{ width: '100%', padding: '9px 12px', background: '#141416', border: '1px solid #2a2a2e', borderRadius: '8px', color: '#f0f0f2', fontSize: '13.5px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#f59e0b')}
                onBlur={e => (e.target.style.borderColor = '#2a2a2e')}
              />
            </div>

            {editError && <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px' }}>{editError}</div>}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowEdit(false); setLogoFile(null); setLogoPreview(null); setRemoveLogo(false); setEditError('') }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #2a2a2e', background: 'transparent', color: '#8b8b99', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleEditTeam} disabled={editLoading} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#000', fontSize: '13px', fontWeight: 600, cursor: editLoading ? 'not-allowed' : 'pointer' }}>
                {editLoading ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {showDeleteConfirm && (
        <div onClick={() => setShowDeleteConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1c1c1f', border: '1px solid #2a2a2e', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ef444415', border: '1px solid #ef444430', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>🗑️</div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#f0f0f2', marginBottom: '8px' }}>Delete team?</h2>
            <p style={{ fontSize: '13.5px', color: '#8b8b99', lineHeight: 1.6, marginBottom: '24px' }}>
              This will permanently delete <strong style={{ color: '#f0f0f2' }}>{team!.name}</strong> and remove all members. Team projects will remain but will no longer be linked to the team.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #2a2a2e', background: 'transparent', color: '#8b8b99', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDeleteTeam} disabled={deleteLoading} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: deleteLoading ? 'not-allowed' : 'pointer' }}>
                {deleteLoading ? 'Deleting...' : 'Delete team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

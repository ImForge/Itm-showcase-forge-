// app/(main)/profile/[username]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ProjectWithDetails } from '@/lib/types/database'

type Props = {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !profile) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      profiles!projects_submitted_by_fkey ( id, username, avatar_url, full_name ),
      project_tags ( tags ( id, name, color ) ),
      project_members ( profile_id, role, profiles!project_members_profile_id_fkey ( id, username, avatar_url, full_name ) )
    `)
    .eq('submitted_by', profile.id)
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === profile.id

  // Fetch saved projects — only for own profile
  let savedProjects: any[] = []
  if (isOwnProfile) {
    const { data: saves } = await supabase
      .from('saves')
      .select(`
        project_id,
        projects (
          id, title, description, thumbnail_url, views, status,
          profiles!projects_submitted_by_fkey ( id, username, avatar_url, full_name ),
          project_tags ( tags ( id, name, color ) ),
          project_members ( profile_id, role, profiles!project_members_profile_id_fkey ( id, username, avatar_url, full_name ) )
        )
      `)
      .eq('user_id', profile.id)
      .not('project_id', 'is', null)
      .order('created_at', { ascending: false })

    savedProjects = (saves ?? [])
      .map((s: any) => s.projects)
      .filter(Boolean)
      .filter((p: any) => p.status === 'approved')
  }

  const approvedProjects = (projects ?? []).filter(p => p.status === 'approved')
  const pendingProjects = (projects ?? []).filter(p => p.status === 'pending')
  const avatarLetter = profile.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px 80px' }}>

      {/* PROFILE HEADER */}
      <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', marginBottom: '48px', flexWrap: 'wrap' }}>

        {/* Avatar */}
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%',
          background: 'var(--accent-dim)', border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '36px', fontWeight: 800, color: 'var(--accent)',
          flexShrink: 0, overflow: 'hidden',
        }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : avatarLetter
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {profile.full_name ?? profile.username}
            </h1>
            {isOwnProfile && (
              <span style={{
                padding: '3px 10px', borderRadius: '6px',
                fontSize: '11px', fontWeight: 600,
                background: 'var(--accent-dim)', color: 'var(--accent)',
                border: '1px solid var(--accent)',
              }}>
                You
              </span>
            )}
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            @{profile.username}
          </p>

          {profile.bio && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px', maxWidth: '480px' }}>
              {profile.bio}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {profile.roll_number && <MetaPill icon="🎓" label={profile.roll_number} />}
            {profile.graduation_year && <MetaPill icon="📅" label={`Class of ${profile.graduation_year}`} />}
            <MetaPill icon="📁" label={`${approvedProjects.length} project${approvedProjects.length !== 1 ? 's' : ''}`} />
            {isOwnProfile && savedProjects.length > 0 && (
              <MetaPill icon="🔖" label={`${savedProjects.length} saved`} />
            )}
            {isOwnProfile && (
              <a href="/profile/settings" style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '4px 12px', background: 'var(--accent-dim)',
                border: '1px solid var(--accent)', borderRadius: '20px',
                fontSize: '12px', color: 'var(--accent)',
                textDecoration: 'none', fontWeight: 600,
              }}>
                ✏️ Edit Profile
              </a>
            )}
          </div>
        </div>
      </div>

      {/* PENDING PROJECTS — own profile only */}
      {isOwnProfile && pendingProjects.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            background: '#f59e0b10', border: '1px solid #f59e0b30',
            borderRadius: '14px', padding: '20px 24px', marginBottom: '16px',
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
              ⏳ Pending Review ({pendingProjects.length})
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              These projects are waiting for admin approval before going public.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {pendingProjects.map(project => (
              <MiniProjectCard key={project.id} project={project as unknown as ProjectWithDetails} />
            ))}
          </div>
        </div>
      )}

      {/* SUBMITTED PROJECTS */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
          Projects
        </h2>

        {approvedProjects.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '14px', color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              No projects yet
            </p>
            {isOwnProfile && (
              <p style={{ fontSize: '13px' }}>
                <a href="/projects/submit" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  Submit your first project →
                </a>
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {approvedProjects.map(project => (
              <MiniProjectCard key={project.id} project={project as unknown as ProjectWithDetails} />
            ))}
          </div>
        )}
      </div>

      {/* SAVED PROJECTS — own profile only */}
      {isOwnProfile && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Saved Projects
            </h2>
            <span style={{
              padding: '2px 8px', borderRadius: '999px',
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              color: 'var(--accent)', fontSize: '11px', fontWeight: 600,
            }}>
              {savedProjects.length}
            </span>
          </div>

          {savedProjects.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '14px', color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔖</div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                No saved projects yet
              </p>
              <p style={{ fontSize: '13px' }}>
                Hit the Save button on any project to bookmark it here
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {savedProjects.map((project: any) => (
                <MiniProjectCard key={project.id} project={project as unknown as ProjectWithDetails} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 10px', background: 'var(--bg-elevated)',
      border: '1px solid var(--border)', borderRadius: '20px',
      fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500,
    }}>
      <span>{icon}</span><span>{label}</span>
    </div>
  )
}

function MiniProjectCard({ project }: { project: ProjectWithDetails }) {
  const shortDesc = project.description.length > 90
    ? project.description.slice(0, 90) + '...'
    : project.description

  return (
    <a href={`/projects/${project.id}`} style={{
      display: 'block', textDecoration: 'none',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      <div style={{
        height: '130px',
        background: project.thumbnail_url ? 'transparent' : 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)',
      }}>
        {project.thumbnail_url
          ? <img src={project.thumbnail_url} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-muted)' }}>{project.title[0].toUpperCase()}</span>
        }
      </div>
      <div style={{ padding: '14px' }}>
        {project.project_tags.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {project.project_tags.slice(0, 2).map(({ tags }: any) => (
              <span key={tags.id} style={{
                padding: '1px 7px', borderRadius: '20px',
                fontSize: '10px', fontWeight: 600,
                background: tags.color + '20', color: tags.color,
                border: `1px solid ${tags.color}40`,
              }}>
                {tags.name}
              </span>
            ))}
          </div>
        )}
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
          {project.title}
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {shortDesc}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
          👁 {project.views.toLocaleString()} views
        </p>
      </div>
    </a>
  )
}
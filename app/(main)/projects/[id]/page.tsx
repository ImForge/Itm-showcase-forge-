// app/(main)/projects/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectActions from '@/components/projects/ProjectActions'
import Link from 'next/link'
type Props = {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      profiles!projects_submitted_by_fkey ( id, username, avatar_url, full_name ),
      project_tags ( tags ( id, name, color ) ),
      project_members ( profile_id, role, profiles!project_members_profile_id_fkey ( id, username, avatar_url, full_name ) ),
      build_ons!build_ons_child_project_id_fkey ( parent_project_id, parent:projects!build_ons_parent_project_id_fkey ( id, title, description ) )
    `)
    .eq('id', id)
    .single()

  if (error || !project) notFound()

  // Fire and forget — increment views without slowing page
  supabase.rpc('increment_views', { project_id: id })

  // Fetch child build-ons
  const { data: buildOns } = await supabase
    .from('build_ons')
    .select(`
      child_project_id,
      child:projects!build_ons_child_project_id_fkey ( id, title, description )
    `)
    .eq('parent_project_id', id)

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user && project.submitted_by === user.id

  // Fetch star count + whether current user starred/saved — all at once
  const [{ count: starCount }, { data: userStar }, { data: userSave }] = await Promise.all([
    supabase
      .from('stars')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id),
    user
      ? supabase.from('stars').select('user_id').eq('project_id', id).eq('user_id', user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('saves').select('user_id').eq('project_id', id).eq('user_id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* BACK LINK */}
      <a href="/projects" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: 'var(--text-muted)',
        textDecoration: 'none', marginBottom: '28px',
      }}>
        ← Back to projects
      </a>

      {/* HEADER */}
      <div style={{ marginBottom: '32px' }}>

        {/* Tags */}
        {project.project_tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {project.project_tags.map(({ tags }: any) => (
              <span key={tags.id} style={{
                padding: '3px 10px', borderRadius: '20px',
                fontSize: '12px', fontWeight: 600,
                background: tags.color + '20', color: tags.color,
                border: `1px solid ${tags.color}40`,
              }}>
                {tags.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 style={{
          fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '14px',
        }}>
          {project.title}
        </h1>

        {/* Short description */}
        <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          {project.description}
        </p>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>

          {/* Author avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: 'var(--accent)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {project.profiles?.avatar_url
                ? <img src={project.profiles.avatar_url} alt={project.profiles.username ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : project.profiles?.username?.[0]?.toUpperCase() ?? '?'
              }
            </div>
            <a href={`/profile/${project.profiles?.username}`} style={{
              fontSize: '14px', color: 'var(--text-secondary)',
              textDecoration: 'none', fontWeight: 500,
            }}>
              {project.profiles?.username ?? 'Unknown'}
            </a>
          </div>

          {/* Academic info */}
          {project.academic_year && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {project.academic_year}{project.semester ? ` · ${project.semester}` : ''}
            </span>
          )}

          {/* Views */}
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            👁 {project.views.toLocaleString()} views
          </span>

          {/* Status badge — only if not approved */}
          {project.status !== 'approved' && (
            <span style={{
              padding: '3px 10px', borderRadius: '6px',
              fontSize: '12px', fontWeight: 600,
              background: project.status === 'pending' ? '#f59e0b20' : '#ef444420',
              color: project.status === 'pending' ? '#f59e0b' : '#ef4444',
              border: `1px solid ${project.status === 'pending' ? '#f59e0b40' : '#ef444440'}`,
            }}>
              {project.status === 'pending' ? 'Pending review' : 'Rejected'}
            </span>
          )}
        </div>

        {/* ACTION BUTTONS — Star, Save, Report */}
        <div style={{ marginTop: '20px' }}>
          <ProjectActions
            projectId={id}
            userId={user?.id ?? null}
            initialStarCount={starCount ?? 0}
            initialStarred={!!userStar}
            initialSaved={!!userSave}
          />
        </div>
      </div>

      {/* THUMBNAIL */}
      {project.thumbnail_url && (
        <div style={{ marginBottom: '36px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img
            src={project.thumbnail_url}
            alt={project.title}
            style={{ width: '100%', display: 'block', maxHeight: '460px', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* LINKS */}
      {(project.repo_url || project.live_url || project.demo_url) && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '36px' }}>
          {project.repo_url && <LinkButton href={project.repo_url} label="⌥ GitHub / Repo" />}
          {project.live_url && <LinkButton href={project.live_url} label="🔗 Live Site" primary />}
          {project.demo_url && <LinkButton href={project.demo_url} label="▶ Demo Video" />}
        </div>
      )}

      {/* TWO COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '32px', alignItems: 'start' }}>

        {/* LEFT: content */}
        <div>

          {/* Long description */}
          {project.long_description && (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '28px', marginBottom: '28px',
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                About this project
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {project.long_description}
              </p>
            </div>
          )}

          {/* Built on top of */}
          {project.build_ons && project.build_ons.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '24px', marginBottom: '28px',
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                🧱 Built on top of
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                This project was inspired by or built upon these previous projects
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {project.build_ons.map((bo: any) => (
                  <a key={bo.parent_project_id} href={`/projects/${bo.parent.id}`} style={{
                    display: 'block', padding: '12px 16px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: '10px', textDecoration: 'none',
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {bo.parent.title}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {bo.parent.description?.slice(0, 80)}...
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Projects built on this */}
          {buildOns && buildOns.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '24px',
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                🚀 Projects built on this
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Future students who built on top of this work
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {buildOns.map((bo: any) => (
                  <a key={bo.child_project_id} href={`/projects/${bo.child.id}`} style={{
                    display: 'block', padding: '12px 16px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: '10px', textDecoration: 'none',
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {bo.child.title}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {bo.child.description?.slice(0, 80)}...
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Team members */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '20px',
          }}>
            <h3 style={{
              fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px',
            }}>
              Team
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.project_members.map((member: any) => (
                <a key={member.profile_id} href={`/profile/${member.profiles?.username}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, color: 'var(--accent)',
                    flexShrink: 0, overflow: 'hidden',
                  }}>
                    {member.profiles?.avatar_url
                      ? <img src={member.profiles.avatar_url} alt={member.profiles.username ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : member.profiles?.username?.[0]?.toUpperCase() ?? '?'
                    }
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {member.profiles?.username ?? 'Unknown'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {member.role}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Details */}
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '20px',
          }}>
            <h3 style={{
              fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px',
            }}>
              Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.academic_year && <InfoRow label="Year" value={project.academic_year} />}
              {project.semester && <InfoRow label="Semester" value={project.semester} />}
              <InfoRow
                label="Submitted"
                value={new Date(project.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              />
              <InfoRow label="Stars" value={`⭐ ${starCount ?? 0}`} />
            </div>
          </div>

          {/* Owner box */}
          {isOwner && (
  <div style={{
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent)',
    borderRadius: '14px',
    padding: '16px',
  }}>
    <p style={{
      fontSize: '12px',
      color: 'var(--accent)',
      fontWeight: 600,
      marginBottom: '10px'
    }}>
      You submitted this
    </p>

    <Link
      href={`/projects/${id}/edit`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        background: 'var(--accent)',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      ✏️ Edit Project
    </Link>
  </div>
)}
        </div>
      </div>
    </div>
  )
}

function LinkButton({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '9px 18px', borderRadius: '8px',
      fontSize: '13px', fontWeight: 600, textDecoration: 'none',
      border: primary ? 'none' : '1px solid var(--border)',
      background: primary ? 'var(--accent)' : 'var(--bg-surface)',
      color: primary ? '#fff' : 'var(--text-secondary)',
    }}>
      {label}
    </a>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
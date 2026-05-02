// app/(main)/page.tsx
// Server Component — NO event handlers.
// Fully mobile responsive via CSS media queries in <style> block.

import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('username, full_name').eq('id', user.id).single()
    profile = data
  }

  const displayName = profile?.full_name ?? profile?.username ?? 'there'

  const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'approved')
  const { count: studentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { count: buildOnCount } = await supabase.from('build_ons').select('*', { count: 'exact', head: true })
  const { count: teamCount } = await supabase.from('teams').select('*', { count: 'exact', head: true })

  const { data: trendingProjects } = await supabase
    .from('projects')
    .select(`id, title, description, thumbnail_url, views, team_id, profiles!projects_submitted_by_fkey ( username, full_name ), project_tags ( tags ( id, name, color ) )`)
    .eq('status', 'approved')
    .order('views', { ascending: false })
    .limit(6)

  const { data: trendingAssignments } = await supabase
    .from('assignments')
    .select('id, title, subject, semester, academic_year, profiles ( username )')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <>
      <style>{`
        .action-card { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 10px; background: #141416; border: 1px solid #2a2a2e; text-decoration: none; transition: border-color 0.15s, background 0.15s; cursor: pointer; }
        .action-card:hover { border-color: #3a3a3e; background: #1c1c1f; }

        .stat-tile { background: #141416; padding: 18px 12px; text-align: center; text-decoration: none; display: block; transition: background 0.15s; }
        .stat-tile:hover { background: #1c1c1f; }

        .project-card-link { display: block; background: #141416; border: 1px solid #2a2a2e; border-radius: 8px; padding: 10px; text-decoration: none; transition: border-color 0.15s; }
        .project-card-link:hover { border-color: #3a3a3e; }

        .assignment-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; background: #141416; border: 1px solid #2a2a2e; border-radius: 8px; text-decoration: none; transition: border-color 0.15s; }
        .assignment-row:hover { border-color: #3a3a3e; }

        .view-all-link { color: #4a4a55; text-decoration: none; font-size: 12px; transition: color 0.15s; }
        .view-all-link:hover { color: #8b8b99; }

        /* Action cards: 3 col desktop → 1 col mobile */
        .action-cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; margin-bottom: 32px; }

        /* Stats: 4 col desktop → 2x2 mobile */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #2a2a2e; border-radius: 10px; overflow: hidden; border: 1px solid #2a2a2e; margin-bottom: 40px; width: 100%; }

        /* Projects: 3 col desktop → 2 col tablet → 1 col mobile */
        .projects-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 24px; }

        /* Main content padding */
        .home-content { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 48px 28px 60px; max-width: 780px; margin: 0 auto; width: 100%; }

        @media (max-width: 900px) {
          .projects-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 600px) {
          .action-cards-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .projects-grid { grid-template-columns: repeat(2, 1fr); }
          .home-content { padding: 24px 16px 48px; }
        }

        @media (max-width: 400px) {
          .projects-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0e0e10' }}>

        {/* ── TOP BAR ── */}
        <div style={{ height: '48px', borderBottom: '1px solid #1f1f23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', color: '#4a4a55', fontWeight: 400 }}>Home</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: '#141416', border: '1px solid #2a2a2e', fontSize: '12px', color: '#8b8b99' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            ITM Department
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="home-content">

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '32px', width: '100%' }}>
            <h1 style={{ fontSize: 'clamp(20px, 5vw, 34px)', fontWeight: 600, letterSpacing: '-0.8px', lineHeight: 1.2, color: '#f0f0f2', marginBottom: '8px' }}>
              Hi <span style={{ color: '#f59e0b' }}>{displayName}</span>, what do you want to make?
            </h1>
            <p style={{ fontSize: '13px', color: '#4a4a55', margin: 0 }}>
              Submit projects · Form teams · Save assignments · Build on each other&apos;s work
            </p>
          </div>

          {/* Action cards */}
          <div className="action-cards-grid">
            <a href="/projects/submit" className="action-card">
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1c1c1f', border: '1px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🚀</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2', marginBottom: '3px' }}>Submit Project</div>
                <div style={{ fontSize: '11.5px', color: '#4a4a55', lineHeight: 1.4 }}>Share your work with the department</div>
              </div>
            </a>
            <a href="/teams" className="action-card">
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1c1c1f', border: '1px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👥</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2', marginBottom: '3px' }}>Create Team</div>
                <div style={{ fontSize: '11.5px', color: '#4a4a55', lineHeight: 1.4 }}>Build something together</div>
              </div>
            </a>
            <a href="/assignments" className="action-card">
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1c1c1f', border: '1px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📋</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2', marginBottom: '3px' }}>Upload Assignment</div>
                <div style={{ fontSize: '11.5px', color: '#4a4a55', lineHeight: 1.4 }}>Save your work permanently</div>
              </div>
            </a>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {[
              { value: projectCount ?? 0, label: 'Projects', href: '/projects' },
              { value: teamCount ?? 0, label: 'Teams', href: '/teams' },
              { value: studentCount ?? 0, label: 'Students', href: '/projects' },
              { value: buildOnCount ?? 0, label: 'Build-ons', href: '/projects' },
            ].map(({ value, label, href }) => (
              <a key={label} href={href} className="stat-tile">
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#f0f0f2', letterSpacing: '-0.5px' }}>{value}</div>
                <div style={{ fontSize: '10.5px', color: '#4a4a55', marginTop: '3px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              </a>
            ))}
          </div>

          {/* Trending */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2' }}>🔥 Trending this semester</span>
            </div>

            {/* Projects */}
            {trendingProjects && trendingProjects.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10.5px', color: '#4a4a55', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Projects</span>
                  <a href="/projects" className="view-all-link">View all →</a>
                </div>
                <div className="projects-grid">
                  {trendingProjects.map(project => (
                    <a key={project.id} href={`/projects/${project.id}`} className="project-card-link">
                      {project.thumbnail_url
                        ? <img src={project.thumbnail_url} alt={project.title} style={{ width: '100%', height: '68px', objectFit: 'cover', borderRadius: '5px', marginBottom: '8px', border: '1px solid #2a2a2e' }} />
                        : <div style={{ width: '100%', height: '68px', borderRadius: '5px', background: '#1c1c1f', border: '1px solid #2a2a2e', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚀</div>
                      }
                      {!!project.team_id && <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: '4px', background: '#22c55e12', border: '1px solid #22c55e30', color: '#22c55e', fontSize: '9px', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Team</span>}
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#f0f0f2', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10.5px', color: '#4a4a55' }}>@{(project.profiles as any)?.username ?? 'unknown'}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#4a4a55' }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          {project.views}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: '28px', textAlign: 'center', background: '#141416', border: '1px solid #2a2a2e', borderRadius: '8px', color: '#4a4a55', fontSize: '13px', marginBottom: '24px' }}>
                No projects yet.{' '}<a href="/projects/submit" style={{ color: '#f59e0b', textDecoration: 'none' }}>Submit the first one →</a>
              </div>
            )}

            {/* Assignments */}
            {trendingAssignments && trendingAssignments.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10.5px', color: '#4a4a55', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Public Assignments</span>
                  <a href="/assignments" className="view-all-link">View all →</a>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {trendingAssignments.map(a => (
                    <a key={a.id} href={`/assignments/${a.id}`} className="assignment-row">
                      <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: '#1c1c1f', border: '1px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>📋</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#f0f0f2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                        <div style={{ fontSize: '11px', color: '#4a4a55', marginTop: '2px' }}>{a.subject} · {a.semester} · @{(a.profiles as any)?.username ?? 'unknown'}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f59e0b12', border: '1px solid #f59e0b25', color: '#f59e0b', fontSize: '10px', fontWeight: 500, flexShrink: 0 }}>Public</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

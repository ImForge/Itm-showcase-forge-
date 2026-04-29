// app/(main)/page.tsx
// Server component — NO event handlers allowed here at all.
// Hover effects are handled via a <style> block with CSS classes.

import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const displayName = profile?.full_name ?? profile?.username ?? 'there'

  const { count: projectCount } = await supabase
    .from('projects').select('*', { count: 'exact', head: true }).eq('status', 'approved')
  const { count: studentCount } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true })
  const { count: buildOnCount } = await supabase
    .from('build_ons').select('*', { count: 'exact', head: true })
  const { count: teamCount } = await supabase
    .from('teams').select('*', { count: 'exact', head: true })

  const { data: trendingProjects } = await supabase
  .from('projects')
  .select(`
    id, title, description, thumbnail_url, views, team_id,
    profiles!projects_submitted_by_fkey ( username, full_name ),
    project_tags ( tags ( id, name, color ) )
  `)
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
      {/* CSS classes for hover effects — the ONLY way to do hover in Server Components */}
      <style>{`
        .action-card {
          display: flex; flex-direction: column;
          padding: 18px 16px; border-radius: 12px;
          background: var(--bg-surface);
          text-decoration: none; transition: border-color 0.2s, background 0.2s;
          cursor: pointer;
        }
        .action-card-purple { border: 1px solid #7c6aff30; }
        .action-card-purple:hover { border-color: #7c6aff70; background: #7c6aff08; }
        .action-card-green { border: 1px solid #22c55e30; }
        .action-card-green:hover { border-color: #22c55e70; background: #22c55e08; }
        .action-card-amber { border: 1px solid #f59e0b30; }
        .action-card-amber:hover { border-color: #f59e0b70; background: #f59e0b08; }
        .stat-tile {
          background: var(--bg-surface); padding: 20px;
          text-align: center; text-decoration: none;
          transition: background 0.15s; display: block;
        }
        .stat-tile:hover { background: var(--bg-elevated); }
        .project-card-link {
          display: block; background: var(--bg-surface);
          border: 1px solid var(--border); border-radius: 10px;
          padding: 12px; text-decoration: none; transition: border-color 0.15s;
        }
        .project-card-link:hover { border-color: #7c6aff60; }
        .assignment-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; background: var(--bg-surface);
          border: 1px solid var(--border); border-radius: 10px;
          text-decoration: none; transition: border-color 0.15s;
        }
        .assignment-row:hover { border-color: #f59e0b60; }
        .example-chip {
          padding: 5px 12px; border-radius: 999px;
          background: var(--bg-surface); border: 1px solid var(--border);
          color: var(--text-secondary); font-size: 12px;
          text-decoration: none; font-weight: 500; white-space: nowrap;
          transition: border-color 0.15s, color 0.15s;
        }
        .example-chip:hover { border-color: var(--accent); color: var(--accent); }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* TOP BAR */}
        <div style={{
          height: '52px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 28px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>🏠 Home</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '999px',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500,
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            ITM Department
          </div>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '52px 32px 48px', maxWidth: '800px', margin: '0 auto', width: '100%',
        }}>

          {/* WELCOME HEADING */}
          <h1 style={{
            fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700,
            letterSpacing: '-1.5px', lineHeight: 1.15,
            color: 'var(--text-primary)', textAlign: 'center', marginBottom: '12px',
          }}>
            Hi <span style={{ color: 'var(--accent)' }}>{displayName}</span>,
            {' '}what do you<br />want to make?
          </h1>
          <p style={{
            fontSize: '14px', color: 'var(--text-muted)',
            textAlign: 'center', marginBottom: '36px',
          }}>
            Submit projects · Form teams · Save assignments · Build on each other's work
          </p>

          {/* THREE QUICK ACTION CARDS — no event handlers, uses CSS classes */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px', width: '100%', marginBottom: '40px',
          }}>
            <a href="/projects/submit" className="action-card action-card-purple">
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: '#7c6aff18', border: '1px solid #7c6aff40',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', marginBottom: '10px',
              }}>🚀</div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Submit Project
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Share your work with the department
              </div>
            </a>

            <a href="/teams" className="action-card action-card-green">
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: '#22c55e18', border: '1px solid #22c55e40',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', marginBottom: '10px',
              }}>👥</div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Create Team
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Build something together
              </div>
            </a>

            <a href="/assignments" className="action-card action-card-amber">
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: '#f59e0b18', border: '1px solid #f59e0b40',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', marginBottom: '10px',
              }}>📋</div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Upload Assignment
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Save your work permanently
              </div>
            </a>
          </div>

          {/* STATS ROW */}
          <div style={{
            width: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px', background: 'var(--border)',
            borderRadius: '12px', overflow: 'hidden',
            border: '1px solid var(--border)', marginBottom: '48px',
          }}>
            {[
              { value: projectCount ?? 0, label: 'Projects', href: '/projects' },
              { value: teamCount ?? 0, label: 'Teams', href: '/teams' },
              { value: studentCount ?? 0, label: 'Students', href: '/projects' },
              { value: buildOnCount ?? 0, label: 'Build-ons', href: '/projects' },
            ].map(({ value, label, href }) => (
              <a key={label} href={href} className="stat-tile">
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
                  {value}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </div>
              </a>
            ))}
          </div>

          {/* TRENDING SECTION */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <span style={{ fontSize: '18px' }}>🔥</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                Trending this semester
              </span>
            </div>

            {/* Trending Projects */}
            {trendingProjects && trendingProjects.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Projects
                  </span>
                  <a href="/projects" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    View all →
                  </a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
                  {trendingProjects.map(project => {
                    const firstTag = (project.project_tags as any)?.[0]?.tags
                    const accentColor = firstTag?.color ?? '#7c6aff'
                    const isTeamProject = !!project.team_id
                    return (
                      <a key={project.id} href={`/projects/${project.id}`} className="project-card-link">
                        {project.thumbnail_url ? (
                          <img src={project.thumbnail_url} alt={project.title} style={{
                            width: '100%', height: '72px', objectFit: 'cover',
                            borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--border)',
                          }} />
                        ) : (
                          <div style={{
                            width: '100%', height: '72px', borderRadius: '6px',
                            background: accentColor + '15', border: `1px solid ${accentColor}30`,
                            marginBottom: '8px', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '22px',
                          }}>🚀</div>
                        )}
                        {isTeamProject && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            padding: '2px 6px', borderRadius: '4px',
                            background: '#22c55e18', border: '1px solid #22c55e40',
                            color: '#22c55e', fontSize: '9px', fontWeight: 600,
                            marginBottom: '4px', textTransform: 'uppercase',
                          }}>👥 Team</span>
                        )}
                        <div style={{
                          fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)',
                          marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {project.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            by {(project.profiles as any)?.username ?? 'unknown'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            {project.views}
                          </span>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </>
            ) : (
              <div style={{
                padding: '32px', textAlign: 'center', background: 'var(--bg-surface)',
                border: '1px solid var(--border)', borderRadius: '12px',
                color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px',
              }}>
                No projects yet.{' '}
                <a href="/projects/submit" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  Submit the first one →
                </a>
              </div>
            )}

            {/* Trending Public Assignments */}
            {trendingAssignments && trendingAssignments.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Public Assignments
                  </span>
                  <a href="/assignments" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>View all →</a>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {trendingAssignments.map(a => (
                    <a key={a.id} href={`/assignments/${a.id}`} className="assignment-row">
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: '#f59e0b15', border: '1px solid #f59e0b30',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', flexShrink: 0,
                      }}>📋</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {a.subject} · {a.semester} · by {(a.profiles as any)?.username ?? 'unknown'}
                        </div>
                      </div>
                      <span style={{
                        padding: '3px 8px', borderRadius: '999px',
                        background: '#f59e0b15', border: '1px solid #f59e0b30',
                        color: '#f59e0b', fontSize: '10px', fontWeight: 600, flexShrink: 0,
                      }}>Public</span>
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

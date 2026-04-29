'use client'
// components/search/SearchModal.tsx
//
// Global search modal — opens with Cmd+K / Ctrl+K from anywhere.
// Also exported as a function openSearch() so the sidebar button can trigger it.
//
// HOW IT WORKS:
// 1. A keydown listener on `window` watches for Cmd+K / Ctrl+K
// 2. When triggered, modal overlays the whole screen
// 3. User types → 300ms debounce → 3 parallel Supabase queries
// 4. Results grouped into Projects / Teams / Assignments sections
// 5. Arrow keys move a highlight cursor through results
// 6. Enter or click navigates to that result
// 7. Escape or clicking the backdrop closes modal

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Result types ─────────────────────────────────────────────────────────────

type ProjectResult = {
  id: string
  title: string
  description: string
  project_tags: { tags: { name: string; color: string } }[]
}

type TeamResult = {
  id: string
  name: string
  description: string | null
  memberCount: number
}

type AssignmentResult = {
  id: string
  title: string
  subject: string
  semester: string
}

type SearchResults = {
  projects: ProjectResult[]
  teams: TeamResult[]
  assignments: AssignmentResult[]
}

// ─── Module-level open trigger ────────────────────────────────────────────────
// This lets SidebarClient call openSearch() without prop drilling.
// It's a simple callback ref pattern — the modal registers itself when mounted.
let _openModal: (() => void) | null = null
export function openSearch() {
  _openModal?.()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchModal() {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ projects: [], teams: [], assignments: [] })
  const [loading, setLoading] = useState(false)
  // cursor = flat index across all results for arrow key navigation
  const [cursor, setCursor] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Register the open function so sidebar can call openSearch()
  useEffect(() => {
    _openModal = () => setOpen(true)
    return () => { _openModal = null }
  }, [])

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Open modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      // Close on Escape
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input whenever modal opens, reset state
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults({ projects: [], teams: [], assignments: [] })
      setCursor(-1)
    }
  }, [open])

  // Debounced search — fires 300ms after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults({ projects: [], teams: [], assignments: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      runSearch(query.trim())
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function runSearch(q: string) {
    // Run all 3 queries in parallel — Promise.all means we wait for all of them
    // instead of running one after another (faster)
    const [projectRes, teamRes, assignmentRes] = await Promise.all([
      // Projects: search title OR description, approved only
      supabase
        .from('projects')
        .select('id, title, description, project_tags ( tags ( name, color ) )')
        .eq('status', 'approved')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(5),

      // Teams: search name OR description
      supabase
        .from('teams')
        .select('id, name, description, team_members ( profile_id )')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(4),

      // Assignments: public only, search title OR subject
      supabase
        .from('assignments')
        .select('id, title, subject, semester')
        .eq('is_public', true)
        .or(`title.ilike.%${q}%,subject.ilike.%${q}%`)
        .limit(4),
    ])

    setResults({
      projects: (projectRes.data as unknown as ProjectResult[]) ?? [],
      teams: (teamRes.data ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        memberCount: t.team_members?.length ?? 0,
      })),
      assignments: (assignmentRes.data as unknown as AssignmentResult[]) ?? [],
    })
    setCursor(-1)
    setLoading(false)
  }

  // Flatten all results into one array for arrow key navigation
  // Order: projects first, then teams, then assignments
  const flatResults = [
    ...results.projects.map(p => ({ type: 'project' as const, id: p.id, href: `/projects/${p.id}` })),
    ...results.teams.map(t => ({ type: 'team' as const, id: t.id, href: `/teams/${t.id}` })),
    ...results.assignments.map(a => ({ type: 'assignment' as const, id: a.id, href: `/assignments/${a.id}` })),
  ]

  const totalResults = flatResults.length

  // Handle arrow keys + Enter inside the input
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, totalResults - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, -1))
    } else if (e.key === 'Enter') {
      if (cursor >= 0 && flatResults[cursor]) {
        navigate(flatResults[cursor].href)
      }
    }
  }

  function navigate(href: string) {
    router.push(href)
    setOpen(false)
  }

  function close() {
    setOpen(false)
  }

  const hasResults = totalResults > 0
  const isEmpty = query.trim() !== '' && !loading && !hasResults

  if (!open) return null

  // Calculate cursor index offsets for each section
  const projectOffset = 0
  const teamOffset = results.projects.length
  const assignmentOffset = results.projects.length + results.teams.length

  return (
    // ── Backdrop ──
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      {/* ── Modal panel ── */}
      <div
        onClick={e => e.stopPropagation()} // Don't close when clicking inside
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
          margin: '0 16px',
        }}
      >
        {/* ── Search input row ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {/* Search icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>

          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search projects, teams, assignments..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
            }}
          />

          {/* Loading spinner */}
          {loading && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"
              style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          )}

          {/* Escape hint */}
          <kbd style={{
            padding: '2px 7px',
            borderRadius: '5px',
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}>
            esc
          </kbd>
        </div>

        {/* ── Results area ── */}
        <div style={{
          maxHeight: '420px',
          overflowY: 'auto',
          padding: query.trim() ? '8px 0' : '0',
        }}>

          {/* Empty prompt — before typing */}
          {!query.trim() && (
            <div style={{
              padding: '32px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
                Quick jump
              </div>
              {[
                { label: 'Browse all projects', href: '/projects', icon: '🚀' },
                { label: 'View teams', href: '/teams', icon: '👥' },
                { label: 'My assignments', href: '/assignments', icon: '📋' },
                { label: 'Submit a project', href: '/projects/submit', icon: '➕' },
              ].map(item => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px', borderRadius: '8px',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-overlay)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', flexShrink: 0,
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"
                    style={{ marginLeft: 'auto' }}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {isEmpty && (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
                No results for "{query}"
              </div>
              <div style={{ fontSize: '12px' }}>
                Try a different keyword
              </div>
            </div>
          )}

          {/* ── PROJECTS SECTION ── */}
          {results.projects.length > 0 && (
            <ResultSection title="Projects" icon="🚀">
              {results.projects.map((project, i) => {
                const globalIdx = projectOffset + i
                const firstTag = (project.project_tags as any)?.[0]?.tags
                return (
                  <ResultItem
                    key={project.id}
                    active={cursor === globalIdx}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    onMouseEnter={() => setCursor(globalIdx)}
                  >
                    {/* Color swatch from first tag */}
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                      background: firstTag ? firstTag.color + '20' : 'var(--accent-dim)',
                      border: `1px solid ${firstTag ? firstTag.color + '40' : 'var(--accent)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px',
                    }}>
                      🚀
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {highlightMatch(project.title, query)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.description}
                      </div>
                    </div>
                    {/* Tags */}
                    {firstTag && (
                      <span style={{
                        padding: '2px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: 500,
                        background: firstTag.color + '20', color: firstTag.color,
                        border: `1px solid ${firstTag.color}40`,
                        flexShrink: 0,
                      }}>
                        {firstTag.name}
                      </span>
                    )}
                  </ResultItem>
                )
              })}
            </ResultSection>
          )}

          {/* ── TEAMS SECTION ── */}
          {results.teams.length > 0 && (
            <ResultSection title="Teams" icon="👥">
              {results.teams.map((team, i) => {
                const globalIdx = teamOffset + i
                return (
                  <ResultItem
                    key={team.id}
                    active={cursor === globalIdx}
                    onClick={() => navigate(`/teams/${team.id}`)}
                    onMouseEnter={() => setCursor(globalIdx)}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                      background: '#22c55e18', border: '1px solid #22c55e40',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, color: '#22c55e',
                    }}>
                      {team.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {highlightMatch(team.name, query)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                        {team.description ? ` · ${team.description}` : ''}
                      </div>
                    </div>
                  </ResultItem>
                )
              })}
            </ResultSection>
          )}

          {/* ── ASSIGNMENTS SECTION ── */}
          {results.assignments.length > 0 && (
            <ResultSection title="Public Assignments" icon="📋">
              {results.assignments.map((a, i) => {
                const globalIdx = assignmentOffset + i
                return (
                  <ResultItem
                    key={a.id}
                    active={cursor === globalIdx}
                    onClick={() => navigate(`/assignments/${a.id}`)}
                    onMouseEnter={() => setCursor(globalIdx)}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                      background: '#f59e0b18', border: '1px solid #f59e0b30',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px',
                    }}>
                      📋
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {highlightMatch(a.title, query)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {a.subject} · {a.semester}
                      </div>
                    </div>
                  </ResultItem>
                )
              })}
            </ResultSection>
          )}

        </div>

        {/* ── Footer hints ── */}
        {hasResults && (
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}>
            {[
              { keys: ['↑', '↓'], label: 'navigate' },
              { keys: ['↵'], label: 'open' },
              { keys: ['esc'], label: 'close' },
            ].map(hint => (
              <div key={hint.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {hint.keys.map(k => (
                  <kbd key={k} style={{
                    padding: '1px 5px', borderRadius: '4px',
                    background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'inherit',
                  }}>{k}</kbd>
                ))}
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hint.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function ResultSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <div style={{
        padding: '6px 18px 4px',
        fontSize: '10.5px', color: 'var(--text-muted)',
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
        display: 'flex', alignItems: 'center', gap: '5px',
      }}>
        <span>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

// ── Individual result row ──────────────────────────────────────────────────────
function ResultItem({ active, onClick, onMouseEnter, children }: {
  active: boolean
  onClick: () => void
  onMouseEnter: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 18px', width: '100%',
        background: active ? 'var(--accent-dim)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      {children}
    </button>
  )
}

// ── Highlight matching text ────────────────────────────────────────────────────
// Wraps the matched part of the string in an accent-colored span
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}

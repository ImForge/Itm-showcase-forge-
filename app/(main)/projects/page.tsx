'use client'
// app/(main)/projects/page.tsx
//
// Full client component — handles search, tag filter, semester + year dropdowns.
// Data is fetched once on mount, then filtered locally in JS (fast, no extra DB calls).

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProjectCard from '@/components/projects/projectcard'
import type { Tag } from '@/lib/types/database'

// ─── We define a simpler local type here ─────────────────────────────────────
// The imported ProjectWithDetails expects build_ons which we removed from the
// query. So we define our own local type that matches exactly what we fetch.
type ProjectLocal = {
  id: string
  title: string
  description: string
  thumbnail_url: string | null
  repo_url: string | null
  live_url: string | null
  demo_url: string | null
  academic_year: string | null
  semester: string | null
  status: string
  views: number
  created_at: string
  submitted_by: string
  profiles: {
    id: string
    username: string | null
    avatar_url: string | null
    full_name: string | null
  } | null
  project_tags: {
    tags: {
      id: string
      name: string
      color: string
    }
  }[]
  project_members: {
    role: string
    profiles: {
      id: string
      username: string | null
      avatar_url: string | null
      full_name: string | null
    } | null
  }[]
}

// ─── Dropdown options ─────────────────────────────────────────────────────────
// Semesters 1–8 (ITM has 8 semesters typically)
const SEMESTER_OPTIONS = ['All Semesters', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8']

// Academic years — generate last 6 years dynamically
function getYearOptions() {
  const current = new Date().getFullYear()
  const years = ['All Years']
  for (let y = current; y >= current - 5; y--) {
    years.push(`${y}-${String(y + 1).slice(2)}`) // e.g. "2024-25"
  }
  return years
}

// ─── Dropdown component (reusable inside this file) ───────────────────────────
function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '8px 32px 8px 12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '9px',
        color: value.startsWith('All') ? 'var(--text-muted)' : 'var(--text-primary)',
        fontSize: '13px',
        cursor: 'pointer',
        outline: 'none',
        // Custom arrow via background image trick
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a4a55' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        minWidth: '140px',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    >
      {options.map(opt => (
        <option
          key={opt}
          value={opt}
          style={{ background: '#1c1c1f', color: '#f0f0f2' }}
        >
          {opt}
        </option>
      ))}
    </select>
  )
}

// ─── Main page component ──────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [allProjects, setAllProjects] = useState<ProjectLocal[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [semester, setSemester] = useState('All Semesters')
  const [year, setYear] = useState('All Years')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const yearOptions = getYearOptions()

  useEffect(() => {
    async function fetchData() {
      // ── Fetch projects ──
      // NOTE: No build_ons join here — that was causing the silent failure.
      // We only join what we actually need to display the cards.
      const { data: projects, error } = await supabase
  .from('projects')
  .select(`
    *,
    profiles!projects_submitted_by_fkey ( id, username, avatar_url, full_name ),
    project_tags ( tags ( id, name, color ) ),
    project_members ( role, profiles!project_members_profile_id_fkey ( id, username, avatar_url, full_name ) )
  `)
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
      // ── Fetch tags ──
      const { data: tags } = await supabase
        .from('tags')
        .select('*')
        .order('name')

      // Cast through unknown to avoid TypeScript complaining about the join shape
      setAllProjects((projects as unknown as ProjectLocal[]) ?? [])
      setAllTags(tags ?? [])
      setLoading(false)
    }

    fetchData()
  }, [])

  // ── FILTERING ─────────────────────────────────────────────────────────────
  // All filtering is done in JS — no DB calls on filter change.
  const filtered = allProjects.filter(project => {
    // 1. Text search — title or description
    const q = search.toLowerCase()
    const matchesSearch =
      search === '' ||
      project.title.toLowerCase().includes(q) ||
      project.description.toLowerCase().includes(q)

    // 2. Tag filter — project must have ALL selected tags
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every(tagId =>
        project.project_tags.some(({ tags }) => tags.id === tagId)
      )

    // 3. Semester filter
    const matchesSemester =
      semester === 'All Semesters' || project.semester === semester

    // 4. Year filter
    const matchesYear =
      year === 'All Years' || project.academic_year === year

    return matchesSearch && matchesTags && matchesSemester && matchesYear
  })

  function toggleTag(tagId: string) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  // Are any filters currently active?
  const hasActiveFilters =
    search !== '' ||
    selectedTags.length > 0 ||
    semester !== 'All Semesters' ||
    year !== 'All Years'

  function clearAllFilters() {
    setSearch('')
    setSelectedTags([])
    setSemester('All Semesters')
    setYear('All Years')
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.8px',
          marginBottom: '6px',
        }}>
          Projects
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Browse all student projects from the ITM department
        </p>
      </div>

      {/* ── SEARCH + DROPDOWNS ROW ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}>
        {/* Search box */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '360px' }}>
          {/* Search icon inside the input */}
          <svg
            width="14" height="14"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{
              position: 'absolute', left: '11px', top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '9px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Semester dropdown */}
        <Dropdown
          value={semester}
          options={SEMESTER_OPTIONS}
          onChange={setSemester}
        />

        {/* Year dropdown */}
        <Dropdown
          value={year}
          options={yearOptions}
          onChange={setYear}
        />

        {/* Clear all — only visible when something is active */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            style={{
              padding: '8px 14px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--danger)'
              e.currentTarget.style.borderColor = 'var(--danger)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            ✕ Clear all
          </button>
        )}
      </div>

      {/* ── TAG FILTER CHIPS ── */}
      {allTags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '24px',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginRight: '2px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Tags
          </span>
          {allTags.map(tag => {
            const active = selectedTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: `1px solid ${active ? tag.color : tag.color + '35'}`,
                  background: active ? tag.color + '22' : 'transparent',
                  color: active ? tag.color : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = tag.color + '80'
                    e.currentTarget.style.color = tag.color
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.borderColor = tag.color + '35'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                {tag.name}
              </button>
            )
          })}
        </div>
      )}

      {/* ── RESULTS COUNT ── */}
      {!loading && (
        <p style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginBottom: '20px',
        }}>
          {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          {hasActiveFilters ? ' found' : ' total'}
        </p>
      )}

      {/* ── GRID ── */}
      {loading ? (
        // Skeleton cards while loading
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              height: '300px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        // Empty state
        <div style={{
          textAlign: 'center',
          padding: '80px 24px',
          color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>🔍</div>
          <p style={{
            fontSize: '15px', fontWeight: 600,
            marginBottom: '8px',
            color: 'var(--text-secondary)',
          }}>
            No projects found
          </p>
          <p style={{ fontSize: '13px' }}>
            Try adjusting your search or clearing the filters
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                marginTop: '16px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {filtered.map(project => (
            // Cast back through unknown to satisfy ProjectCard's expected type
            // ProjectCard only uses fields we're fetching, so this is safe
            <ProjectCard
              key={project.id}
              project={project as unknown as import('@/lib/types/database').ProjectWithDetails}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        select option { background: #1c1c1f; }
      `}</style>
    </div>
  )
}

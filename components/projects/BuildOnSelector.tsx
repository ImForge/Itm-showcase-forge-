'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type SearchResult = {
  id: string
  title: string
  description: string
  profiles: { username: string } | null
}

type Props = {
  selectedId: string | null
  onSelect: (id: string | null, title: string | null) => void
}

export default function BuildOnSelector({ selectedId, onSelect }: Props) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

 useEffect(() => {
  if (query.trim().length < 2) { setResults([]); return }

  const timer = setTimeout(async () => {
    setSearching(true)
    const { data } = await supabase
      .from('projects')
      .select('id, title, description, profiles!projects_submitted_by_fkey(username)')
      .eq('status', 'approved')
      .ilike('title', `%${query}%`)
      .limit(6)

    const safe = (data ?? []) as unknown as SearchResult[]
    setResults(safe)
    setSearching(false)
    setOpen(true)
  }, 300)

  return () => clearTimeout(timer)
}, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(project: SearchResult) {
    setSelectedTitle(project.title)
    onSelect(project.id, project.title)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  function handleClear() {
    setSelectedTitle(null)
    onSelect(null, null)
    setQuery('')
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {selectedId && selectedTitle ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: '8px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>🧱 {selectedTitle}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>This project builds on top of the above</p>
          </div>
          <button type="button" onClick={handleClear} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
      ) : (
        // Single onFocus handler — border color driven by state, not e.target.style
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); if (query.length >= 2) setOpen(true) }}
          onBlur={() => setFocused(false)}
          placeholder="Search for a project to build on..."
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--bg-elevated)',
            border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
      )}

      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {results.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => handleSelect(project)}
              style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-overlay)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{project.title}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>by @{project.profiles?.username ?? 'unknown'} · {project.description.slice(0, 60)}...</p>
            </button>
          ))}
        </div>
      )}

      {searching && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Searching...</p>}

      {open && !searching && query.length >= 2 && results.length === 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', zIndex: 50, fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
          No approved projects found for &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}

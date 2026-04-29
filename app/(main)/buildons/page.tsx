'use client'
// app/(main)/buildons/page.tsx
//
// The Build-Ons feed — shows the latest build-on activity across the platform.
// Each card shows the FULL lineage chain, not just "X built on Y".
// This is a Client Component because we fetch on mount and want fast interactivity.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

type ChainProject = {
  id: string
  title: string
  description: string
  submitted_by: string
  profiles: { username: string | null; avatar_url: string | null } | null
  created_at: string
}

type BuildOnEntry = {
  parent_project_id: string
  child_project_id: string
  parent: ChainProject
  child: ChainProject
  created_at?: string
}

type Chain = {
  // The full ordered list of projects in this lineage — root first
  projects: ChainProject[]
  // The most recent link in this chain (used for sorting)
  latestAt: string
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BuildOnsPage() {
  const supabase = createClient()

  const [buildOns, setBuildOns] = useState<BuildOnEntry[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    longestChain: 0,
    mostBuiltOn: '' as string,
  })

  useEffect(() => {
    async function load() {
      // Fetch ALL build-on relationships with project details
      // WHY: We need the full graph to reconstruct chains client-side
      const { data, error } = await supabase
        .from('build_ons')
        .select(`
          parent_project_id,
          child_project_id,
          parent:projects!build_ons_parent_project_id_fkey (
            id, title, description, submitted_by, created_at,
            profiles!projects_submitted_by_fkey ( username, avatar_url )
          ),
          child:projects!build_ons_child_project_id_fkey (
            id, title, description, submitted_by, created_at,
            profiles!projects_submitted_by_fkey ( username, avatar_url )
          )
        `)
        .order('child_project_id')

      if (error || !data) {
        setLoading(false)
        return
      }

      const entries = data as unknown as BuildOnEntry[]
      setBuildOns(entries)

      // ── Build chains from the flat list of edges ──
      // Think of build_ons as a directed graph: parent → child
      // We want to find all complete chains (root has no parent, leaf has no child)
      //
      // Algorithm:
      // 1. Find all "root" projects — projects that appear as parents but never as children
      // 2. For each root, walk forward through children to build the chain
      // 3. Sort chains by most recent activity

      const parentIds = new Set(entries.map(e => e.parent_project_id))
      const childIds = new Set(entries.map(e => e.child_project_id))

      // Root = has children but no parent in our dataset
      const rootIds = [...parentIds].filter(id => !childIds.has(id))

      // Build a map: parentId → child entry (for fast lookup)
      const childMap = new Map<string, BuildOnEntry>()
      entries.forEach(e => childMap.set(e.parent_project_id, e))

      // Also build a project lookup map
      const projectMap = new Map<string, ChainProject>()
      entries.forEach(e => {
        if (e.parent) projectMap.set(e.parent_project_id, e.parent)
        if (e.child) projectMap.set(e.child_project_id, e.child)
      })

      const builtChains: Chain[] = []

      rootIds.forEach(rootId => {
        const chain: ChainProject[] = []
        let currentId: string | null = rootId

        // Walk the chain forward
        while (currentId) {
          const project = projectMap.get(currentId)
          if (!project) break
          chain.push(project)
          const nextEdge = childMap.get(currentId)
          currentId = nextEdge ? nextEdge.child_project_id : null
        }

        if (chain.length >= 2) {
          // latestAt = the created_at of the most recent project in the chain
          const latestAt = chain[chain.length - 1].created_at
          builtChains.push({ projects: chain, latestAt })
        }
      })

      // Sort by most recent chain activity first
      builtChains.sort((a, b) =>
        new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
      )

      setChains(builtChains)

      // ── Compute stats ──
      const longestChain = builtChains.reduce((max, c) => Math.max(max, c.projects.length), 0)

      // Most built-on = project that appears most as a parent
      const parentCount = new Map<string, number>()
      entries.forEach(e => {
        parentCount.set(e.parent_project_id, (parentCount.get(e.parent_project_id) ?? 0) + 1)
      })
      let maxCount = 0
      let mostBuiltOnId = ''
      parentCount.forEach((count, id) => {
        if (count > maxCount) { maxCount = count; mostBuiltOnId = id }
      })
      const mostBuiltOnTitle = projectMap.get(mostBuiltOnId)?.title ?? ''

      setStats({
        total: entries.length,
        longestChain,
        mostBuiltOn: mostBuiltOnTitle,
      })

      setLoading(false)
    }

    load()
  }, [])

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '36px 24px 80px' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <h1 style={{
            fontSize: '28px', fontWeight: 700,
            color: 'var(--text-primary)', letterSpacing: '-0.8px',
          }}>
            Build-Ons
          </h1>
          {/* Amber accent pill */}
          <span style={{
            padding: '3px 10px', borderRadius: '999px',
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            fontSize: '11px', fontWeight: 700, color: 'var(--accent)',
            letterSpacing: '0.04em',
          }}>
            UNIQUE TO FORGE
          </span>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Every project that was inspired by or built on top of a previous one.
          Knowledge compounds — nothing starts from zero.
        </p>
      </div>

      {/* ── STATS BAR ── */}
      {!loading && stats.total > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px', background: 'var(--border)',
          borderRadius: '12px', overflow: 'hidden',
          border: '1px solid var(--border)', marginBottom: '36px',
        }}>
          <StatTile value={stats.total} label="Total Build-Ons" />
          <StatTile value={stats.longestChain} label="Longest Chain" suffix=" projects" />
          <StatTile value={stats.mostBuiltOn || '—'} label="Most Built-On" isText />
        </div>
      )}

      {/* ── EMPTY STATE (no build-ons yet) ── */}
      {!loading && chains.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '16px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧱</div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No build-ons yet
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px' }}>
            When a student submits a project and links it to a previous one, the chain appears here.
          </p>
          <a href="/projects/submit" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '9px',
            background: 'var(--accent)', color: '#000',
            fontSize: '13px', fontWeight: 700, textDecoration: 'none',
          }}>
            Submit the first build-on →
          </a>
        </div>
      )}

      {/* ── LOADING SKELETONS ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '140px', borderRadius: '14px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      )}

      {/* ── CHAIN FEED ── */}
      {!loading && chains.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {chains.map((chain, i) => (
            <ChainCard key={i} chain={chain} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chain Card ────────────────────────────────────────────────────────────────
// Shows the full lineage: Project A → Project B → Project C
// Each node is clickable, links to the project detail page

function ChainCard({ chain }: { chain: Chain }) {
  const depth = chain.projects.length

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '20px 22px',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >

      {/* Chain depth badge + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {depth}-project chain
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {timeAgo(chain.latestAt)}
        </span>
      </div>

      {/* The actual chain — nodes connected by arrows */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '0',
        overflowX: 'auto',
        paddingBottom: '4px',
      }}>
        {chain.projects.map((project, idx) => (
          <div key={project.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>

            {/* Project node */}
            <a href={`/projects/${project.id}`} style={{
              display: 'block',
              textDecoration: 'none',
              background: idx === 0
                ? 'var(--bg-elevated)'           // root — slightly different
                : idx === chain.projects.length - 1
                ? 'var(--accent-dim)'             // latest — amber tint
                : 'var(--bg-elevated)',
              border: `1px solid ${
                idx === chain.projects.length - 1
                  ? 'var(--accent)'
                  : 'var(--border)'
              }`,
              borderRadius: '10px',
              padding: '12px 14px',
              minWidth: '180px',
              maxWidth: '220px',
              transition: 'border-color 0.15s, background 0.15s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.background = 'var(--accent-dim)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = idx === chain.projects.length - 1 ? 'var(--accent)' : 'var(--border)'
                e.currentTarget.style.background = idx === chain.projects.length - 1 ? 'var(--accent-dim)' : 'var(--bg-elevated)'
              }}
            >
              {/* Root / Latest label */}
              <div style={{ marginBottom: '6px' }}>
                {idx === 0 && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Origin
                  </span>
                )}
                {idx === chain.projects.length - 1 && idx !== 0 && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700,
                    color: 'var(--accent)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Latest
                  </span>
                )}
                {idx > 0 && idx < chain.projects.length - 1 && (
                  <span style={{
                    fontSize: '9px', fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Gen {idx + 1}
                  </span>
                )}
              </div>

              {/* Project title */}
              <p style={{
                fontSize: '13px', fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '8px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {project.title}
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', fontWeight: 700, color: 'var(--accent)',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  {project.profiles?.avatar_url
                    ? <img src={project.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : project.profiles?.username?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {project.profiles?.username ?? 'unknown'}
                </span>
              </div>
            </a>

            {/* Arrow connector between nodes */}
            {idx < chain.projects.length - 1 && (
              <div style={{
                display: 'flex', alignItems: 'center',
                padding: '0 6px', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────

function StatTile({ value, label, suffix, isText }: {
  value: number | string
  label: string
  suffix?: string
  isText?: boolean
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      padding: '18px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: isText ? '14px' : '28px',
        fontWeight: 700,
        color: 'var(--accent)',
        letterSpacing: isText ? '-0.2px' : '-1px',
        marginBottom: '4px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}{suffix ?? ''}
      </div>
      <div style={{
        fontSize: '11px', color: 'var(--text-muted)',
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </div>
    </div>
  )
}

// ── Time helper ───────────────────────────────────────────────────────────────
// Converts a timestamp to a human-readable "X days ago" string

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 5) return `${weeks}w ago`
  return `${months}mo ago`
}
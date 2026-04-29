'use client'
// app/(admin)/AdminClient.tsx
//
// Client component — handles the approve/reject buttons.
// When admin clicks Approve or Reject:
//   1. We immediately remove the card from the screen (feels instant)
//   2. Then update the DB in the background
// This pattern is called "optimistic UI"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Tag = { id: string; name: string; color: string }

type PendingProject = {
  id: string
  title: string
  description: string
  long_description: string | null
  repo_url: string | null
  live_url: string | null
  demo_url: string | null
  academic_year: string | null
  semester: string | null
  created_at: string
  profiles: { username: string; full_name: string | null } | null
  project_tags: { tags: Tag }[]
}

type Props = {
  pendingProjects: PendingProject[]
  adminUsername: string
  stats: { pending: number; approved: number; rejected: number }
}

export default function AdminClient({ pendingProjects, adminUsername, stats }: Props) {
  const supabase = createClient()

  const [projects, setProjects] = useState(pendingProjects)
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [sessionApproved, setSessionApproved] = useState(0)
  const [sessionRejected, setSessionRejected] = useState(0)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAction(projectId: string, action: 'approved' | 'rejected') {
    setProcessing(projectId)

    const { error } = await supabase
      .from('projects')
      .update({ status: action })
      .eq('id', projectId)

    if (error) {
      showToast('Failed: ' + error.message, 'error')
      setProcessing(null)
      return
    }

    // Remove card from list immediately
    setProjects((prev) => prev.filter((p) => p.id !== projectId))

    if (action === 'approved') {
      setSessionApproved((n) => n + 1)
      showToast('Project approved ✓', 'success')
    } else {
      setSessionRejected((n) => n + 1)
      showToast('Project rejected', 'error')
    }

    setProcessing(null)
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '36px 24px 80px' }}>

      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: 999,
            background: toast.type === 'success' ? '#22c55e20' : '#ef444420',
            border: `1px solid ${toast.type === 'success' ? '#22c55e60' : '#ef444460'}`,
            color: toast.type === 'success' ? '#22c55e' : '#ef4444',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Review Queue
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Logged in as <span style={{ color: 'var(--accent)' }}>@{adminUsername}</span>
        </p>
      </div>

      {/* ── STATS BAR ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {[
          { label: 'Pending', value: projects.length, color: '#f59e0b' },
          { label: 'Approved (DB)', value: stats.approved, color: '#22c55e' },
          { label: 'Rejected (DB)', value: stats.rejected, color: '#ef4444' },
          { label: 'This Session', value: `+${sessionApproved} / -${sessionRejected}`, color: 'var(--accent)' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '22px', fontWeight: '800', color: stat.color, marginBottom: '4px' }}>
              {stat.value}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── EMPTY STATE ── */}
      {projects.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
            All caught up!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            No pending projects to review right now.
          </p>
        </div>
      ) : (
        // ── PROJECT CARDS ──
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {projects.map((project) => {
            const isProcessing = processing === project.id

            return (
              <div
                key={project.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '24px',
                  opacity: isProcessing ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Top row: title + action buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    {/* Tags */}
                    {project.project_tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {project.project_tags.map(({ tags }) => (
                          <span
                            key={tags.id}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: tags.color + '20',
                              color: tags.color,
                              border: `1px solid ${tags.color}40`,
                            }}
                          >
                            {tags.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {project.title}
                    </h2>

                    {/* Meta */}
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      by <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>@{project.profiles?.username ?? 'unknown'}</span>
                      {project.academic_year && ` · ${project.academic_year}`}
                      {project.semester && ` · ${project.semester}`}
                      {' · submitted '}
                      {new Date(project.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleAction(project.id, 'approved')}
                      disabled={isProcessing}
                      style={{
                        padding: '8px 20px',
                        background: '#22c55e20',
                        border: '1px solid #22c55e60',
                        borderRadius: '8px',
                        color: '#22c55e',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleAction(project.id, 'rejected')}
                      disabled={isProcessing}
                      style={{
                        padding: '8px 20px',
                        background: '#ef444420',
                        border: '1px solid #ef444460',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ✕ Reject
                    </button>
                    <a
                      href={`/projects/${project.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      Preview ↗
                    </a>
                  </div>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    marginBottom: '12px',
                    padding: '12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                  }}
                >
                  {project.description}
                </p>

                {/* Links row */}
                {(project.repo_url || project.live_url || project.demo_url) && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {project.repo_url && (
                      <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                        ⌥ Repo ↗
                      </a>
                    )}
                    {project.live_url && (
                      <a href={project.live_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                        🔗 Live ↗
                      </a>
                    )}
                    {project.demo_url && (
                      <a href={project.demo_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                        ▶ Demo ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

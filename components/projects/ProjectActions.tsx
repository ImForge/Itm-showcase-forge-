'use client'
// components/projects/ProjectActions.tsx
//
// Handles Star, Save, and Report actions for a project.
// This is a separate Client Component because the parent page
// (projects/[id]/page.tsx) is a Server Component and can't have
// onClick or useState. We import this component into the server page
// and pass it the data it needs as props.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  projectId: string
  userId: string | null         // null = not logged in
  initialStarCount: number
  initialStarred: boolean       // did THIS user already star it?
  initialSaved: boolean         // did THIS user already save it?
}

export default function ProjectActions({
  projectId,
  userId,
  initialStarCount,
  initialStarred,
  initialSaved,
}: Props) {
  const supabase = createClient()

  // ── Local state — optimistic UI ──
  // "Optimistic" means we update the UI immediately on click,
  // then do the DB call in the background.
  // If the DB call fails, we revert. This makes it feel instant.
  const [starred, setStarred] = useState(initialStarred)
  const [starCount, setStarCount] = useState(initialStarCount)
  const [saved, setSaved] = useState(initialSaved)
  const [starLoading, setStarLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // Report modal state
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  // ── STAR HANDLER ──
  async function handleStar() {
    // Must be logged in
    if (!userId) {
      window.location.href = '/login'
      return
    }
    if (starLoading) return

    setStarLoading(true)

    if (starred) {
      // Already starred → unstar
      // Optimistically update UI first
      setStarred(false)
      setStarCount(c => c - 1)

      const { error } = await supabase
        .from('stars')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId)

      // If DB failed, revert
      if (error) {
        setStarred(true)
        setStarCount(c => c + 1)
      }
    } else {
      // Not starred → star it
      setStarred(true)
      setStarCount(c => c + 1)

      const { error } = await supabase
        .from('stars')
        .insert({ user_id: userId, project_id: projectId })

      if (error) {
        setStarred(false)
        setStarCount(c => c - 1)
      }
    }

    setStarLoading(false)
  }

  // ── SAVE HANDLER ──
  async function handleSave() {
    if (!userId) {
      window.location.href = '/login'
      return
    }
    if (saveLoading) return

    setSaveLoading(true)

    if (saved) {
      // Already saved → unsave
      setSaved(false)

      const { error } = await supabase
        .from('saves')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId)

      if (error) setSaved(true)
    } else {
      // Not saved → save it
      setSaved(true)

      const { error } = await supabase
        .from('saves')
        .insert({ user_id: userId, project_id: projectId })

      if (error) setSaved(false)
    }

    setSaveLoading(false)
  }

  // ── REPORT HANDLER ──
  async function handleReport() {
    if (!userId) {
      window.location.href = '/login'
      return
    }
    if (!reportReason.trim() || reportSubmitting) return

    setReportSubmitting(true)

    await supabase.from('reports').insert({
      reporter_id: userId,
      project_id: projectId,
      reason: reportReason.trim(),
    })

    setReportSubmitting(false)
    setReportDone(true)

    // Auto close after 2 seconds
    setTimeout(() => {
      setShowReport(false)
      setReportDone(false)
      setReportReason('')
    }, 2000)
  }

  return (
    <>
      {/* ── ACTION BUTTONS ROW ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}>

        {/* STAR button */}
        <button
          onClick={handleStar}
          title={starred ? 'Unstar this project' : 'Star this project'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: `1px solid ${starred ? '#f59e0b60' : 'var(--border)'}`,
            background: starred ? '#f59e0b12' : 'var(--bg-surface)',
            color: starred ? '#f59e0b' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (!starred) {
              e.currentTarget.style.borderColor = '#f59e0b60'
              e.currentTarget.style.color = '#f59e0b'
            }
          }}
          onMouseLeave={e => {
            if (!starred) {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
        >
          {/* Star icon — filled when starred, outline when not */}
          <svg
            width="14" height="14"
            viewBox="0 0 24 24"
            fill={starred ? '#f59e0b' : 'none'}
            stroke={starred ? '#f59e0b' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {starCount > 0 ? starCount : 'Star'}
        </button>

        {/* SAVE button */}
        <button
          onClick={handleSave}
          title={saved ? 'Remove from saved' : 'Save this project'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: `1px solid ${saved ? 'var(--accent)' : 'var(--border)'}`,
            background: saved ? 'var(--accent-dim)' : 'var(--bg-surface)',
            color: saved ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            if (!saved) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }
          }}
          onMouseLeave={e => {
            if (!saved) {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
        >
          {/* Bookmark icon — filled when saved */}
          <svg
            width="13" height="13"
            viewBox="0 0 24 24"
            fill={saved ? 'var(--accent)' : 'none'}
            stroke={saved ? 'var(--accent)' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {saved ? 'Saved' : 'Save'}
        </button>

        {/* REPORT button — subtle, on the right */}
        <button
          onClick={() => setShowReport(true)}
          title="Report this project"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s',
            marginLeft: 'auto', // pushes it to the right
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--danger)'
            e.currentTarget.style.color = 'var(--danger)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
          Report
        </button>
      </div>

      {/* ── REPORT MODAL ── */}
      {showReport && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300,
          }}
          onClick={() => setShowReport(false)}
        >
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '28px',
              width: '400px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {reportDone ? (
              // Success state
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Report submitted
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Thanks for helping keep the platform safe.
                </p>
              </div>
            ) : (
              <>
                <h2 style={{
                  fontSize: '16px', fontWeight: 700,
                  color: 'var(--text-primary)', marginBottom: '6px',
                }}>
                  Report this project
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Tell us what's wrong and we'll look into it.
                </p>

                {/* Quick reason chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {[
                    'Plagiarism',
                    'Inappropriate content',
                    'Spam',
                    'Broken / fake project',
                    'Other',
                  ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setReportReason(reason)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: `1px solid ${reportReason === reason ? 'var(--danger)' : 'var(--border)'}`,
                        background: reportReason === reason ? '#ef444418' : 'transparent',
                        color: reportReason === reason ? 'var(--danger)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                {/* Custom reason textarea */}
                <textarea
                  placeholder="Add more details (optional)..."
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '9px 13px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    marginBottom: '18px',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--danger)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowReport(false)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason.trim() || reportSubmitting}
                    style={{
                      padding: '8px 18px', borderRadius: '8px', border: 'none',
                      background: reportReason.trim() ? 'var(--danger)' : 'var(--bg-overlay)',
                      color: reportReason.trim() ? '#fff' : 'var(--text-muted)',
                      fontSize: '13px', fontWeight: 600,
                      cursor: reportReason.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {reportSubmitting ? 'Sending...' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
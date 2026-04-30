// app/(main)/assignments/[id]/page.tsx
// Server Component — shows full detail of a single assignment
// Public assignments: visible to everyone
// Private assignments: only visible to the owner

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user (may be null if not logged in)
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch the assignment with submitter profile
  const { data: assignment } = await supabase
    .from('assignments')
    .select('*, profiles ( id, username, full_name, avatar_url )')
    .eq('id', id)
    .single()

  // If assignment doesn't exist → 404
  if (!assignment) notFound()

  // If assignment is private and viewer is not the owner → 404
  if (!assignment.is_public && assignment.submitted_by !== user?.id) notFound()

  const profile = assignment.profiles as {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null

  const formattedDate = new Date(assignment.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const isOwner = user?.id === assignment.submitted_by

  return (
    <>
      <style>{`
        .back-link:hover { color: var(--accent) !important; }
        .download-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
        .profile-link:hover { opacity: 0.8; }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── BACK LINK ── */}
        <a
          href="/assignments"
          className="back-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            marginBottom: '28px',
            transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Assignments
        </a>

        {/* ── HEADER CARD ── */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '28px',
            marginBottom: '20px',
          }}
        >
          {/* Top row: icon + title + badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>

            {/* Icon */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: '#f59e0b15',
                border: '1px solid #f59e0b30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0,
              }}
            >
              📋
            </div>

            {/* Title + chips */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Title + public/private badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '10px',
                }}
              >
                <h1
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.5px',
                    margin: 0,
                  }}
                >
                  {assignment.title}
                </h1>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: assignment.is_public ? '#22c55e18' : 'var(--bg-elevated)',
                    border: `1px solid ${assignment.is_public ? '#22c55e40' : 'var(--border)'}`,
                    color: assignment.is_public ? '#22c55e' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                >
                  {assignment.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              {/* Subject / Semester / Year chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[assignment.subject, assignment.semester, assignment.academic_year]
                  .filter(Boolean)
                  .map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
              </div>

            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border)', marginBottom: '20px' }} />

          {/* Submitter + upload date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <a
              href={`/profile/${profile?.username}`}
              className="profile-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username ?? 'avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  profile?.username?.[0]?.toUpperCase() ?? '?'
                )}
              </div>

              {/* Name + username */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {profile?.full_name ?? profile?.username ?? 'Unknown'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  @{profile?.username ?? 'unknown'}
                </div>
              </div>
            </a>

            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Uploaded {formattedDate}
            </span>
          </div>
        </div>

        {/* ── DESCRIPTION CARD ── */}
        {assignment.description && (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '24px',
              marginBottom: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '12px',
              }}
            >
              Description
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {assignment.description}
            </p>
          </div>
        )}

        {/* ── DOWNLOAD CARD ── */}
        {assignment.file_url ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '24px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            {/* Left: file icon + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                }}
              >
                📎
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Assignment File
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Click download to open or save the file
                </div>
              </div>
            </div>

            {/* Right: download button */}
            <a
              href={assignment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="download-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 18px',
                borderRadius: '9px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </a>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '20px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            No file attached to this assignment
          </div>
        )}

        {/* ── OWNER ACTIONS ── */}
        {isOwner && (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>
              You own this assignment — manage visibility and deletion from the assignments page.
            </span>
            <a
              href="/assignments"
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Manage →
            </a>
          </div>
        )}

      </div>
    </>
  )
}

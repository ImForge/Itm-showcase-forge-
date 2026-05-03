// app/(main)/assignments/[id]/page.tsx
// Server Component — shows full detail of a single assignment
// Public assignments: visible to everyone
// Private assignments: only visible to the owner
//
// FILE PREVIEW:
// - PDF       → inline <iframe> using browser's built-in PDF renderer
// - Image     → <img> tag
// - DOCX/DOC  → Google Docs Viewer iframe
// - Other     → file info card, download only

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

// ── Detect file type from the URL extension ──
function getFileType(url: string): 'pdf' | 'image' | 'word' | 'other' {
  const clean = url.split('?')[0].toLowerCase()
  if (clean.endsWith('.pdf')) return 'pdf'
  if (
    clean.endsWith('.jpg') || clean.endsWith('.jpeg') ||
    clean.endsWith('.png') || clean.endsWith('.gif') ||
    clean.endsWith('.webp')
  ) return 'image'
  if (clean.endsWith('.doc') || clean.endsWith('.docx')) return 'word'
  return 'other'
}

// ── Get readable filename from URL ──
function getFileName(url: string): string {
  try {
    const parts = url.split('?')[0].split('/')
    return decodeURIComponent(parts[parts.length - 1])
  } catch {
    return 'Assignment file'
  }
}

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: assignment } = await supabase
    .from('assignments')
    .select('*, profiles ( id, username, full_name, avatar_url )')
    .eq('id', id)
    .single()

  if (!assignment) notFound()
  if (!assignment.is_public && assignment.submitted_by !== user?.id) notFound()

  const profile = assignment.profiles as {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null

  const formattedDate = new Date(assignment.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const isOwner = user?.id === assignment.submitted_by

  const fileType = assignment.file_url ? getFileType(assignment.file_url) : null
  const fileName = assignment.file_url ? getFileName(assignment.file_url) : null

  // Google Docs Viewer URL — used for DOCX preview
  const googleViewerUrl = assignment.file_url
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(assignment.file_url)}&embedded=true`
    : null

  return (
    <>
      <style>{`
        .back-link:hover { color: #f59e0b !important; }
        .download-btn:hover { border-color: #f59e0b !important; color: #f59e0b !important; }
        .profile-link:hover { opacity: 0.8; }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── BACK LINK ── */}
        <a
          href="/assignments"
          className="back-link"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', color: '#4a4a55',
            textDecoration: 'none', marginBottom: '28px',
            transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Assignments
        </a>

        {/* ── HEADER CARD ── */}
        <div style={{
          background: '#141416', border: '1px solid #2a2a2e',
          borderRadius: '14px', padding: '28px', marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>

            {/* Icon */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '12px',
              background: '#f59e0b15', border: '1px solid #f59e0b30',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', flexShrink: 0,
            }}>
              📋
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Title + public/private badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f0f0f2', letterSpacing: '-0.5px', margin: 0 }}>
                  {assignment.title}
                </h1>
                <span style={{
                  padding: '3px 10px', borderRadius: '999px',
                  fontSize: '11px', fontWeight: 600, flexShrink: 0,
                  background: assignment.is_public ? '#22c55e18' : '#1c1c1f',
                  border: `1px solid ${assignment.is_public ? '#22c55e40' : '#2a2a2e'}`,
                  color: assignment.is_public ? '#22c55e' : '#4a4a55',
                }}>
                  {assignment.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              {/* Subject / Semester / Year chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[assignment.subject, assignment.semester, assignment.academic_year]
                  .filter(Boolean)
                  .map((tag) => (
                    <span key={tag} style={{
                      padding: '3px 10px', borderRadius: '999px', fontSize: '11.5px',
                      background: '#1c1c1f', border: '1px solid #2a2a2e', color: '#8b8b99',
                    }}>
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: '#2a2a2e', marginBottom: '20px' }} />

          {/* Submitter + date */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <a
              href={`/profile/${profile?.username}`}
              className="profile-link"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', transition: 'opacity 0.15s' }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#1c1c1f', border: '1px solid #2a2a2e',
                overflow: 'hidden', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '14px', fontWeight: 600,
                color: '#f59e0b', flexShrink: 0,
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.username ?? 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profile?.username?.[0]?.toUpperCase() ?? '?'
                }
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f0f0f2' }}>
                  {profile?.full_name ?? profile?.username ?? 'Unknown'}
                </div>
                <div style={{ fontSize: '11px', color: '#4a4a55' }}>
                  @{profile?.username ?? 'unknown'}
                </div>
              </div>
            </a>
            <span style={{ fontSize: '12px', color: '#4a4a55' }}>Uploaded {formattedDate}</span>
          </div>
        </div>

        {/* ── DESCRIPTION ── */}
        {assignment.description && (
          <div style={{
            background: '#141416', border: '1px solid #2a2a2e',
            borderRadius: '14px', padding: '24px', marginBottom: '20px',
          }}>
            <h2 style={{
              fontSize: '12px', fontWeight: 600, color: '#4a4a55',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px',
            }}>
              Description
            </h2>
            <p style={{ fontSize: '14px', color: '#8b8b99', lineHeight: 1.7, margin: 0 }}>
              {assignment.description}
            </p>
          </div>
        )}

        {/* ── FILE SECTION ── */}
        {assignment.file_url ? (
          <div style={{ marginBottom: '20px' }}>

            {/* ── PDF PREVIEW ── */}
            {fileType === 'pdf' && (
              <div style={{
                background: '#141416', border: '1px solid #2a2a2e',
                borderRadius: '14px', overflow: 'hidden', marginBottom: '12px',
              }}>
                <div style={{
                  padding: '14px 20px', borderBottom: '1px solid #2a2a2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📄</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2' }}>PDF Preview</span>
                  </div>
                  <a
                    href={assignment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Open in new tab ↗
                  </a>
                </div>
                <iframe
                  src={assignment.file_url}
                  style={{ width: '100%', height: '600px', border: 'none', display: 'block', background: '#0e0e10' }}
                  title={assignment.title}
                />
              </div>
            )}

            {/* ── IMAGE PREVIEW ── */}
            {fileType === 'image' && (
              <div style={{
                background: '#141416', border: '1px solid #2a2a2e',
                borderRadius: '14px', overflow: 'hidden', marginBottom: '12px',
              }}>
                <div style={{
                  padding: '14px 20px', borderBottom: '1px solid #2a2a2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🖼️</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2' }}>Image Preview</span>
                  </div>
                  <a
                    href={assignment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Open in new tab ↗
                  </a>
                </div>
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', background: '#0e0e10' }}>
                  <img
                    src={assignment.file_url}
                    alt={assignment.title}
                    style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px' }}
                  />
                </div>
              </div>
            )}

            {/* ── WORD PREVIEW via Google Docs Viewer ── */}
            {fileType === 'word' && googleViewerUrl && (
              <div style={{
                background: '#141416', border: '1px solid #2a2a2e',
                borderRadius: '14px', overflow: 'hidden', marginBottom: '12px',
              }}>
                <div style={{
                  padding: '14px 20px', borderBottom: '1px solid #2a2a2e',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📝</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2' }}>Document Preview</span>
                    <span style={{
                      fontSize: '10.5px', color: '#4a4a55', padding: '2px 7px',
                      borderRadius: '4px', background: '#1c1c1f', border: '1px solid #2a2a2e',
                    }}>
                      via Google Docs
                    </span>
                  </div>
                  <a
                    href={assignment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}
                  >
                    Open in new tab ↗
                  </a>
                </div>
                <iframe
                  src={googleViewerUrl}
                  style={{ width: '100%', height: '600px', border: 'none', display: 'block', background: '#0e0e10' }}
                  title={assignment.title}
                />
              </div>
            )}

            {/* ── OTHER FILE TYPES — no preview ── */}
            {fileType === 'other' && (
              <div style={{
                background: '#141416', border: '1px solid #2a2a2e',
                borderRadius: '14px', padding: '24px', marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '10px',
                    background: '#1c1c1f', border: '1px solid #2a2a2e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: '22px',
                  }}>
                    📎
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#f0f0f2', marginBottom: '3px' }}>
                      {fileName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#4a4a55' }}>
                      No preview available for this file type — download to open
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DOWNLOAD BAR — always shown below preview ── */}
            <div style={{
              background: '#141416', border: '1px solid #2a2a2e',
              borderRadius: '12px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>
                  {fileType === 'pdf' ? '📄' : fileType === 'image' ? '🖼️' : fileType === 'word' ? '📝' : '📎'}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0f0f2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fileName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4a4a55', marginTop: '1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {fileType === 'pdf' ? 'PDF Document'
                      : fileType === 'image' ? 'Image'
                      : fileType === 'word' ? 'Word Document'
                      : 'File'}
                  </div>
                </div>
              </div>

              <a
                href={assignment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="download-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '8px 18px', borderRadius: '8px',
                  background: '#1c1c1f', border: '1px solid #2a2a2e',
                  color: '#f0f0f2', fontSize: '13px', fontWeight: 600,
                  textDecoration: 'none', flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </a>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#141416', border: '1px solid #2a2a2e',
            borderRadius: '14px', padding: '20px', marginBottom: '20px',
            fontSize: '13px', color: '#4a4a55', textAlign: 'center',
          }}>
            No file attached to this assignment
          </div>
        )}

        {/* ── OWNER ACTIONS ── */}
        {isOwner && (
          <div style={{
            background: '#141416', border: '1px solid #2a2a2e',
            borderRadius: '14px', padding: '20px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '12px', color: '#4a4a55', flex: 1 }}>
              You own this assignment — manage visibility and deletion from the assignments page.
            </span>
            <a
              href="/assignments"
              style={{
                padding: '7px 16px', borderRadius: '8px',
                background: '#1c1c1f', border: '1px solid #2a2a2e',
                color: '#8b8b99', fontSize: '12px', fontWeight: 500,
                textDecoration: 'none', whiteSpace: 'nowrap',
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

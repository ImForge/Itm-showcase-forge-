'use client'
// app/(main)/projects/submit/page.tsx
//
// This is a Client Component because it has a big form with lots of state.
// Auth protection: we check if the user is logged in on mount.
// If not logged in → redirect to /login.
//
// WHAT HAPPENS ON SUBMIT (in order):
//   1. Validate inputs
//   2. Upload thumbnail to Supabase Storage (if provided)
//   3. Insert row into `projects` table → get back the new project ID
//   4. Insert rows into `project_tags` table (one per selected tag)
//   5. Insert rows into `project_members` table (one per team member)
//   6. Redirect to the new project page
import BuildOnSelector from '@/components/projects/BuildOnSelector'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Tag } from '@/lib/types/database'

export default function SubmitProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  // ── AUTH CHECK ──
  // On mount, verify the user is logged in.
  // If not, send them to login.
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login')
      } else {
        setUserId(user.id)
        setAuthChecked(true)
      }
    })
  }, [])

  // ── FORM FIELDS STATE ──
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [longDescription, setLongDescription] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')

  // Tags: all available from DB + which ones user selected
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Team members: array of { username } strings the user types in
  const [memberUsername, setMemberUsername] = useState('')
  const [members, setMembers] = useState<string[]>([])

  // Thumbnail
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parentProjectId, setParentProjectId] = useState<string | null>(null)

  // Fetch all tags when page loads (for the tag selector)
  useEffect(() => {
    supabase.from('tags').select('*').order('name').then(({ data }) => {
      setAllTags(data ?? [])
    })
  }, [])

  // ── THUMBNAIL HANDLER ──
  // When user picks a file, store it and create a preview URL
  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate: only images, max 5MB
    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Thumbnail must be under 5MB')
      return
    }

    setThumbnail(file)
    // createObjectURL makes a temporary browser URL to show preview
    setThumbnailPreview(URL.createObjectURL(file))
    setError(null)
  }

  // ── TAG TOGGLE ──
  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  // ── ADD TEAM MEMBER ──
  function addMember() {
    const trimmed = memberUsername.trim().toLowerCase()
    if (!trimmed || members.includes(trimmed)) return
    setMembers((prev) => [...prev, trimmed])
    setMemberUsername('')
  }

  function removeMember(username: string) {
    setMembers((prev) => prev.filter((m) => m !== username))
  }

  // ── SUBMIT HANDLER ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      // STEP 1: Upload thumbnail if provided
      let thumbnailUrl: string | null = null

      if (thumbnail) {
        // Create a unique filename using timestamp + original name
        const fileExt = thumbnail.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const filePath = `thumbnails/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('project-thumbnails') // This bucket must exist in Supabase Storage
          .upload(filePath, thumbnail)

        if (uploadError) throw new Error('Failed to upload thumbnail: ' + uploadError.message)

        // Get the public URL of the uploaded image
        const { data: urlData } = supabase.storage
          .from('project-thumbnails')
          .getPublicUrl(filePath)

        thumbnailUrl = urlData.publicUrl
      }

      // STEP 2: Insert the project row
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title,
          description,
          long_description: longDescription || null,
          repo_url: repoUrl || null,
          live_url: liveUrl || null,
          demo_url: demoUrl || null,
          thumbnail_url: thumbnailUrl,
          submitted_by: userId,
          academic_year: academicYear || null,
          semester: semester || null,
          status: 'approved', // Auto-approved — goes live immediately
          views: 0,
        })
        .select() // .select() returns the inserted row (so we get the ID)
        .single()

      if (projectError) throw new Error(projectError.message)

      const projectId = project.id

      // STEP 3: Insert project_tags rows (one per selected tag)
      if (selectedTagIds.length > 0) {
        const tagRows = selectedTagIds.map((tagId) => ({
          project_id: projectId,
          tag_id: tagId,
        }))
        const { error: tagsError } = await supabase.from('project_tags').insert(tagRows)
        if (tagsError) throw new Error('Failed to save tags: ' + tagsError.message)
      }

      // STEP 4: Insert project_members rows
      // First look up user IDs for each username
      if (members.length > 0) {
        const { data: memberProfiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('username', members)

        if (memberProfiles && memberProfiles.length > 0) {
          const memberRows = memberProfiles.map((profile) => ({
            project_id: projectId,
            profile_id: profile.id,
            role: 'member',
          }))
          await supabase.from('project_members').insert(memberRows)
        }
      }

      // STEP 5: Also add the submitter as owner in project_members
      await supabase.from('project_members').insert({
        project_id: projectId,
        profile_id: userId,
        role: 'owner',
      })
      // STEP 6: Insert build_on link if selected
if (parentProjectId) {
  await supabase.from('build_ons').insert({
    parent_project_id: parentProjectId,
    child_project_id: projectId,
  })
}

   // STEP 7: Redirect to the new project page
window.location.href = `/projects/${projectId}`
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  // ── AUTH CHECK LOADING ──
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Checking auth...</p>
      </div>
    )
  }

  // ── FORM UI ──
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '8px' }}>
          Submit a Project
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Your project will go live immediately after submission.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '14px', color: '#ef4444' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── SECTION: Basic Info ── */}
        <Section title="Basic Info">

          {/* Title */}
          <Field label="Project Title *">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Project"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>

          {/* Short description */}
          <Field label="Short Description *" hint="1-2 sentences. Shown on the project card.">
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief summary of what your project does..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>

          {/* Long description */}
          <Field label="Full Description" hint="Markdown supported. Explain the problem, approach, what you learned.">
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder="## What we built&#10;&#10;Describe the project in detail..."
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Geist Mono, monospace', fontSize: '13px' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
        </Section>


        {/* ── SECTION: Links ── */}
        <Section title="Links">
          <Field label="GitHub / Repo URL">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/you/project"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
          <Field label="Live URL">
            <input
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://yourproject.vercel.app"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
          <Field label="Demo Video URL" hint="YouTube, Google Drive, etc.">
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
        </Section>

        {/* ── SECTION: Academic Info ── */}
        <Section title="Academic Info">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Academic Year">
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024-25"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </Field>
            <Field label="Semester">
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select...</option>
                {['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── SECTION: Tags ── */}
        <Section title="Tags">
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Select all that apply
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: `1px solid ${selected ? tag.color : tag.color + '40'}`,
                    background: selected ? tag.color + '30' : 'transparent',
                    color: selected ? tag.color : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tag.name}
                </button>
              )
            })}
            {allTags.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                No tags yet — add some in the Supabase table editor
              </p>
            )}
          </div>
        </Section>

        {/* ── SECTION: Team Members ── */}
        <Section title="Team Members" hint="Optional. Add your teammates by their username.">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input
              type="text"
              value={memberUsername}
              onChange={(e) => setMemberUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
              placeholder="teammate_username"
              style={{ ...inputStyle, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              type="button"
              onClick={addMember}
              style={{
                padding: '0 18px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Add
            </button>
          </div>
          {members.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {members.map((m) => (
                <div
                  key={m}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px 4px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => removeMember(m)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── SECTION: Build On ── */}
        <Section
          title="Built on a Previous Project?"
          hint="Optional. If this project was inspired by or extends a previous ITM project, link it here."
        >
          <BuildOnSelector
            selectedId={parentProjectId}
            onSelect={(id) => setParentProjectId(id)}
          />
        </Section>
 
        {/* ── SECTION: Thumbnail ── */}
        <Section title="Thumbnail" hint="Optional. Recommended: 1280×720px, max 5MB.">
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${thumbnail ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: thumbnail ? 'var(--accent-dim)' : 'transparent',
              transition: 'all 0.2s',
              overflow: 'hidden',
            }}
          >
            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="Preview"
                style={{ maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }}
              />
            ) : (
              <>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Click to upload thumbnail
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PNG, JPG, WebP — max 5MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            style={{ display: 'none' }}
          />
          {thumbnail && (
            <button
              type="button"
              onClick={() => { setThumbnail(null); setThumbnailPreview(null) }}
              style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
            >
              ✕ Remove thumbnail
            </button>
          )}
        </Section>

        {/* ── SUBMIT BUTTON ── */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '13px',
            background: loading ? 'var(--bg-overlay)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Submitting...' : 'Submit Project'}
        </button>

      </form>
    </div>
  )
}

// ── HELPER COMPONENTS ──
// Small reusable components used only in this file

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '24px',
      }}
    >
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {hint && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{hint}</p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>
        {label}
        {hint && <span style={{ fontWeight: '400', color: 'var(--text-muted)', marginLeft: '6px' }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

// Shared input style object — used by all inputs/textareas/selects
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
}

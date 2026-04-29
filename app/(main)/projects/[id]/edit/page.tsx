'use client'
// app/(main)/projects/[id]/edit/page.tsx
//
// Allows the project owner or team leader to edit all project fields.
// On mount: fetch the project, verify the current user is allowed to edit.
// On save: update the projects row, replace project_tags, replace project_members.
// Edits go live immediately — no re-approval needed.

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BuildOnSelector from '@/components/projects/BuildOnSelector'
import type { Tag } from '@/lib/types/database'

// ── Types ────────────────────────────────────────────────────────────────────

type ProjectData = {
  id: string
  title: string
  description: string
  long_description: string | null
  repo_url: string | null
  live_url: string | null
  demo_url: string | null
  thumbnail_url: string | null
  academic_year: string | null
  semester: string | null
  submitted_by: string
  team_id: string | null
  status: string
  project_tags: { tag_id: string; tags: { id: string; name: string; color: string } }[]
  project_members: { profile_id: string; role: string; profiles: { username: string | null } }[]
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EditProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const supabase = createClient()

  // ── Auth + permission state ──
  const [userId, setUserId] = useState<string | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null) // null = still checking
  const [notFound, setNotFound] = useState(false)

  // ── Form fields ──
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [longDescription, setLongDescription] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')
  const [parentProjectId, setParentProjectId] = useState<string | null>(null)

  // Tags
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Members
  const [members, setMembers] = useState<string[]>([]) // usernames
  const [memberUsername, setMemberUsername] = useState('')

  // Thumbnail
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState<string | null>(null)
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [removeThumbnail, setRemoveThumbnail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── On mount: load project + verify permission ──────────────────────────────
  useEffect(() => {
    async function load() {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUserId(user.id)

      // 2. Fetch the project with tags and members
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select(`
          id, title, description, long_description,
          repo_url, live_url, demo_url, thumbnail_url,
          academic_year, semester, submitted_by, team_id, status,
          project_tags ( tag_id, tags ( id, name, color ) ),
          project_members ( profile_id, role, profiles!project_members_profile_id_fkey ( username ) )
        `)
        .eq('id', projectId)
        .single()

      if (fetchError || !project) {
        setNotFound(true)
        return
      }

      const p = project as unknown as ProjectData

      // 3. Check permission:
      //    - submitted_by === user.id → owner, always allowed
      //    - team_id is set → check if user is a leader of that team
      let canEdit = p.submitted_by === user.id

      if (!canEdit && p.team_id) {
        const { data: membership } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', p.team_id)
          .eq('profile_id', user.id)
          .single()

        if (membership?.role === 'leader') canEdit = true
      }

      // Also allow any project_member with role 'owner'
      if (!canEdit) {
        const isProjectOwner = p.project_members.some(
          m => m.profile_id === user.id && m.role === 'owner'
        )
        if (isProjectOwner) canEdit = true
      }

      if (!canEdit) {
        setAllowed(false)
        return
      }

      setAllowed(true)

      // 4. Populate all form fields from the fetched project
      setTitle(p.title)
      setDescription(p.description)
      setLongDescription(p.long_description ?? '')
      setRepoUrl(p.repo_url ?? '')
      setLiveUrl(p.live_url ?? '')
      setDemoUrl(p.demo_url ?? '')
      setAcademicYear(p.academic_year ?? '')
      setSemester(p.semester ?? '')
      setCurrentThumbnailUrl(p.thumbnail_url)
      setSelectedTagIds(p.project_tags.map(pt => pt.tags.id))

      // Members: everyone except the owner (owner is always there)
      const nonOwnerMembers = p.project_members
        .filter(m => m.role !== 'owner')
        .map(m => m.profiles.username ?? '')
        .filter(Boolean)
      setMembers(nonOwnerMembers)
    }

    // 5. Fetch all available tags for the tag selector
    supabase.from('tags').select('*').order('name').then(({ data }) => {
      setAllTags(data ?? [])
    })

    load()
  }, [projectId])

  // ── Thumbnail handler ────────────────────────────────────────────────────────
  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Thumbnail must be an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Thumbnail must be under 5MB')
      return
    }

    setNewThumbnail(file)
    setThumbnailPreview(URL.createObjectURL(file))
    setRemoveThumbnail(false)
    setError(null)
  }

  // ── Tag toggle ───────────────────────────────────────────────────────────────
  function toggleTag(tagId: string) {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  // ── Member management ────────────────────────────────────────────────────────
  function addMember() {
    const trimmed = memberUsername.trim().toLowerCase()
    if (!trimmed || members.includes(trimmed)) return
    setMembers(prev => [...prev, trimmed])
    setMemberUsername('')
  }

  function removeMember(username: string) {
    setMembers(prev => prev.filter(m => m !== username))
  }

  // ── Save handler ─────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    setError(null)

    try {
      // STEP 1: Handle thumbnail
      // Three cases:
      //   A) User uploaded a new image → upload it, use new URL
      //   B) User clicked "Remove" → set thumbnail_url to null
      //   C) No change → keep currentThumbnailUrl
      let thumbnailUrl: string | null = currentThumbnailUrl

      if (removeThumbnail) {
        thumbnailUrl = null
      } else if (newThumbnail) {
        const fileExt = newThumbnail.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const filePath = `thumbnails/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('project-thumbnails')
          .upload(filePath, newThumbnail)

        if (uploadError) throw new Error('Failed to upload thumbnail: ' + uploadError.message)

        const { data: urlData } = supabase.storage
          .from('project-thumbnails')
          .getPublicUrl(filePath)

        thumbnailUrl = urlData.publicUrl
      }

      // STEP 2: Update the main project row
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          title,
          description,
          long_description: longDescription || null,
          repo_url: repoUrl || null,
          live_url: liveUrl || null,
          demo_url: demoUrl || null,
          thumbnail_url: thumbnailUrl,
          academic_year: academicYear || null,
          semester: semester || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)

      if (updateError) throw new Error(updateError.message)

      // STEP 3: Replace project_tags
      // WHY delete + re-insert instead of smart diff:
      // It's simpler and safer. Delete all existing tags for this project,
      // then insert the current selection fresh. No risk of duplicates.
      await supabase.from('project_tags').delete().eq('project_id', projectId)

      if (selectedTagIds.length > 0) {
        const tagRows = selectedTagIds.map(tagId => ({
          project_id: projectId,
          tag_id: tagId,
        }))
        const { error: tagsError } = await supabase.from('project_tags').insert(tagRows)
        if (tagsError) throw new Error('Failed to save tags: ' + tagsError.message)
      }

      // STEP 4: Replace project_members (non-owners only)
      // Same approach: delete all members except the owner, re-insert.
      // We keep the owner row untouched.
      await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .neq('role', 'owner') // never delete the owner row

      if (members.length > 0) {
        const { data: memberProfiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('username', members)

        if (memberProfiles && memberProfiles.length > 0) {
          const memberRows = memberProfiles.map(profile => ({
            project_id: projectId,
            profile_id: profile.id,
            role: 'member',
          }))
          await supabase.from('project_members').insert(memberRows)
        }
      }

      // STEP 5: Done — show success then redirect
      setSuccess(true)
      setTimeout(() => {
        window.location.href = `/projects/${projectId}`
      }, 1200)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  // ── Loading / permission states ──────────────────────────────────────────────

  if (notFound) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '36px' }}>🔍</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600 }}>Project not found</p>
        <a href="/projects" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>← Back to projects</a>
      </div>
    )
  }

  if (allowed === false) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '36px' }}>🚫</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600 }}>You don't have permission to edit this project</p>
        <a href="/projects" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>← Back to projects</a>
      </div>
    )
  }

  if (allowed === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading project...</p>
      </div>
    )
  }

  // ── Form UI ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <a href={`/projects/${projectId}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--text-muted)',
          textDecoration: 'none', marginBottom: '20px',
        }}>
          ← Back to project
        </a>
        <h1 style={{
          fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: '-0.5px', marginBottom: '6px',
        }}>
          Edit Project
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Changes go live immediately.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{
          background: '#22c55e18', border: '1px solid #22c55e40',
          borderRadius: '10px', padding: '14px 16px',
          marginBottom: '24px', fontSize: '14px', color: '#22c55e',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          ✅ Saved! Redirecting to your project...
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          background: '#ef444420', border: '1px solid #ef444440',
          borderRadius: '10px', padding: '14px 16px',
          marginBottom: '24px', fontSize: '14px', color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Basic Info ── */}
        <Section title="Basic Info">
          <Field label="Project Title *">
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My Awesome Project"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>

          <Field label="Short Description *" hint="Shown on the project card">
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>

          <Field label="Full Description" hint="Markdown supported">
            <textarea
              value={longDescription}
              onChange={e => setLongDescription(e.target.value)}
              rows={6}
              placeholder="## What we built&#10;&#10;Describe the project in detail..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Geist Mono, monospace', fontSize: '13px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
        </Section>

        {/* ── Links ── */}
        <Section title="Links">
          <Field label="GitHub / Repo URL">
            <input
              type="url"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/you/project"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
          <Field label="Live URL">
            <input
              type="url"
              value={liveUrl}
              onChange={e => setLiveUrl(e.target.value)}
              placeholder="https://yourproject.vercel.app"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
          <Field label="Demo Video URL">
            <input
              type="url"
              value={demoUrl}
              onChange={e => setDemoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </Field>
        </Section>

        {/* ── Academic Info ── */}
        <Section title="Academic Info">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Academic Year">
              <input
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="2024-25"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </Field>
            <Field label="Semester">
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select...</option>
                {['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Tags ── */}
        <Section title="Tags">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allTags.map(tag => {
              const selected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    padding: '5px 14px', borderRadius: '20px',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
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
          </div>
        </Section>

        {/* ── Team Members ── */}
        <Section title="Team Members" hint="These are the collaborators on this project (not the owner)">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input
              type="text"
              value={memberUsername}
              onChange={e => setMemberUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMember())}
              placeholder="teammate_username"
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              type="button"
              onClick={addMember}
              style={{
                padding: '0 18px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: '8px',
                color: 'var(--text-secondary)', fontSize: '13px',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              + Add
            </button>
          </div>

          {members.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {members.map(m => (
                <div key={m} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px 4px 12px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: '20px', fontSize: '13px', color: 'var(--text-primary)',
                }}>
                  {m}
                  <button
                    type="button"
                    onClick={() => removeMember(m)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1, padding: '0 2px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Build On ── */}
        <Section title="Built on a Previous Project?" hint="Optional — link a parent project">
          <BuildOnSelector
            selectedId={parentProjectId}
            onSelect={id => setParentProjectId(id)}
          />
        </Section>

        {/* ── Thumbnail ── */}
        <Section title="Thumbnail" hint="Recommended: 1280×720px, max 5MB">

          {/* Show current thumbnail if exists and not being removed */}
          {currentThumbnailUrl && !removeThumbnail && !thumbnailPreview && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Current thumbnail:</p>
              <img
                src={currentThumbnailUrl}
                alt="Current thumbnail"
                style={{ maxHeight: '160px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }}
              />
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '5px 12px', borderRadius: '7px', fontSize: '12px',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveThumbnail(true)}
                  style={{
                    padding: '5px 12px', borderRadius: '7px', fontSize: '12px',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--danger)', cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Show removed state */}
          {removeThumbnail && (
            <div style={{
              padding: '14px', borderRadius: '8px', marginBottom: '12px',
              background: '#ef444410', border: '1px solid #ef444430',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--danger)' }}>Thumbnail will be removed</span>
              <button
                type="button"
                onClick={() => setRemoveThumbnail(false)}
                style={{
                  fontSize: '12px', color: 'var(--text-muted)', background: 'none',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Undo
              </button>
            </div>
          )}

          {/* Upload area — shown when no current thumbnail, or when replacing */}
          {(!currentThumbnailUrl || removeThumbnail || thumbnailPreview) && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${newThumbnail ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '24px', textAlign: 'center',
                cursor: 'pointer',
                background: newThumbnail ? 'var(--accent-dim)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              {thumbnailPreview ? (
                <img
                  src={thumbnailPreview}
                  alt="Preview"
                  style={{ maxHeight: '160px', borderRadius: '8px', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🖼️</div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Click to upload thumbnail
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PNG, JPG, WebP — max 5MB</p>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            style={{ display: 'none' }}
          />

          {thumbnailPreview && (
            <button
              type="button"
              onClick={() => { setNewThumbnail(null); setThumbnailPreview(null) }}
              style={{
                marginTop: '8px', background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
              }}
            >
              ✕ Cancel new thumbnail
            </button>
          )}
        </Section>

        {/* ── Save button ── */}
        <button
          type="submit"
          disabled={saving || success}
          style={{
            padding: '13px',
            background: saving || success ? 'var(--bg-overlay)' : 'var(--accent)',
            color: saving || success ? 'var(--text-muted)' : '#fff',
            border: 'none', borderRadius: '10px',
            fontSize: '15px', fontWeight: 700,
            cursor: saving || success ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
        </button>

      </form>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '24px',
    }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
        {hint && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{hint}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '13px', fontWeight: 500,
        color: 'var(--text-secondary)', marginBottom: '6px',
      }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)',
  fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
}
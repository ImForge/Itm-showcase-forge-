'use client'
// app/(main)/assignments/page.tsx
// Upload assignments, view yours, browse public ones, filter by sem/year/subject

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Assignment = {
  id: string
  title: string
  subject: string
  semester: string
  academic_year: string
  description: string | null
  file_url: string | null
  is_public: boolean
  created_at: string
  submitted_by: string
  profiles: { username: string | null; full_name: string | null } | null
}

type Tab = 'mine' | 'public'

const SEMESTERS = ['All', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8']

function getYears() {
  const y = new Date().getFullYear()
  return ['All', ...Array.from({ length: 6 }, (_, i) => `${y - i}-${String(y - i + 1).slice(2)}`)]
}

export default function AssignmentsPage() {
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('mine')
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([])
  const [publicAssignments, setPublicAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Upload form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', subject: '', semester: 'Sem 1',
    academic_year: '', description: '', is_public: false,
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterSem, setFilterSem] = useState('All')
  const [filterYear, setFilterYear] = useState('All')

  const years = getYears()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)

      // My assignments
      const { data: mine } = await supabase
        .from('assignments')
        .select('*, profiles ( username, full_name )')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false })
      setMyAssignments((mine as unknown as Assignment[]) ?? [])
    }

    // Public assignments from everyone
    const { data: pub } = await supabase
      .from('assignments')
      .select('*, profiles ( username, full_name )')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    setPublicAssignments((pub as unknown as Assignment[]) ?? [])

    setLoading(false)
  }

  async function handleUpload() {
    if (!form.title.trim() || !form.subject.trim() || !userId) return
    setUploading(true)
    setUploadError('')

    let file_url = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('assignments')
        .upload(path, file)

      if (storageErr) {
        setUploadError('File upload failed: ' + storageErr.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('assignments').getPublicUrl(path)
      file_url = urlData.publicUrl
    }

    const { error } = await supabase.from('assignments').insert({
      title: form.title.trim(),
      subject: form.subject.trim(),
      semester: form.semester,
      academic_year: form.academic_year.trim() || `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`,
      description: form.description.trim() || null,
      file_url,
      is_public: form.is_public,
      submitted_by: userId,
    })

    if (error) {
      setUploadError('Failed to save: ' + error.message)
    } else {
      setShowForm(false)
      setForm({ title: '', subject: '', semester: 'Sem 1', academic_year: '', description: '', is_public: false })
      setFile(null)
      await loadAll()
    }
    setUploading(false)
  }

  async function togglePublic(id: string, current: boolean) {
    await supabase.from('assignments').update({ is_public: !current }).eq('id', id)
    setMyAssignments(prev => prev.map(a => a.id === id ? { ...a, is_public: !current } : a))
  }

  async function deleteAssignment(id: string) {
    await supabase.from('assignments').delete().eq('id', id)
    setMyAssignments(prev => prev.filter(a => a.id !== id))
  }

  function applyFilters(list: Assignment[]) {
    return list.filter(a => {
      const q = search.toLowerCase()
      const matchSearch = search === '' ||
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q)
      const matchSem = filterSem === 'All' || a.semester === filterSem
      const matchYear = filterYear === 'All' || a.academic_year === filterYear
      return matchSearch && matchSem && matchYear
    })
  }

  const displayList = applyFilters(tab === 'mine' ? myAssignments : publicAssignments)

  const inputStyle = {
    width: '100%', padding: '9px 13px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13.5px',
    outline: 'none', fontFamily: 'inherit',
  } as React.CSSProperties

  const labelStyle = {
    fontSize: '12px', color: 'var(--text-muted)',
    fontWeight: 500, display: 'block', marginBottom: '6px',
  } as React.CSSProperties

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.8px', marginBottom: '4px' }}>
            Assignments
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Save your work permanently. Never lose an assignment again.
          </p>
        </div>
        {userId && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', borderRadius: '9px',
              background: '#f59e0b', border: 'none',
              color: '#000', fontSize: '13.5px', fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload Assignment
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '28px', width: '460px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>
              Upload Assignment
            </h2>

            <label style={labelStyle}>Title *</label>
            <input placeholder="e.g. OS Memory Management Report" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ ...inputStyle, marginBottom: '14px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')} />

            <label style={labelStyle}>Subject *</label>
            <input placeholder="e.g. Operating Systems" value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              style={{ ...inputStyle, marginBottom: '14px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Semester</label>
                <select value={form.semester}
                  onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                  {SEMESTERS.slice(1).map(s => (
                    <option key={s} value={s} style={{ background: '#1c1c1f' }}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Academic Year</label>
                <input placeholder="e.g. 2024-25" value={form.academic_year}
                  onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            </div>

            <label style={labelStyle}>Description (optional)</label>
            <textarea placeholder="Brief description of this assignment..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              style={{ ...inputStyle, resize: 'none', marginBottom: '14px' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')} />

            {/* File upload */}
            <label style={labelStyle}>File (PDF, DOCX, ZIP, etc.)</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? '#f59e0b60' : 'var(--border)'}`,
                borderRadius: '8px', padding: '16px',
                textAlign: 'center', cursor: 'pointer',
                background: file ? '#f59e0b08' : 'transparent',
                marginBottom: '14px', transition: 'all 0.15s',
              }}
            >
              <input ref={fileRef} type="file" style={{ display: 'none' }}
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <div>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>📎</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{file.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>📂</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Click to choose a file</div>
                </div>
              )}
            </div>

            {/* Public toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderRadius: '8px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              marginBottom: '20px', cursor: 'pointer',
            }} onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Make Public
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Other students can discover and reference this
                </div>
              </div>
              {/* Toggle switch */}
              <div style={{
                width: '38px', height: '22px', borderRadius: '999px',
                background: form.is_public ? 'var(--accent)' : 'var(--bg-overlay)',
                border: '1px solid var(--border)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: '#fff',
                  top: '2px',
                  left: form.is_public ? '18px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </div>
            </div>

            {uploadError && (
              <div style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '12px' }}>
                {uploadError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{
                padding: '8px 16px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleUpload}
                disabled={!form.title.trim() || !form.subject.trim() || uploading}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none',
                  background: form.title.trim() && form.subject.trim() ? '#f59e0b' : 'var(--bg-overlay)',
                  color: form.title.trim() && form.subject.trim() ? '#000' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: 600,
                  cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                }}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs + Filters row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['mine', 'public'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none',
              background: tab === t ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13.5px', fontWeight: tab === t ? 600 : 500,
              cursor: 'pointer',
            }}>
              {t === 'mine' ? 'My Assignments' : 'Public Library'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '160px', maxWidth: '260px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 11px 7px 30px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12.5px', outline: 'none' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
        </div>

        {/* Sem + Year dropdowns */}
        {[
          { value: filterSem, options: SEMESTERS, onChange: setFilterSem },
          { value: filterYear, options: years, onChange: setFilterYear },
        ].map((d, i) => (
          <select key={i} value={d.value} onChange={e => d.onChange(e.target.value)}
            style={{
              padding: '7px 28px 7px 10px', background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: '8px',
              color: d.value.startsWith('All') ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: '12.5px', cursor: 'pointer', outline: 'none',
              appearance: 'none', WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%234a4a55' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
            }}>
            {d.options.map(o => <option key={o} value={o} style={{ background: '#1c1c1f' }}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Count */}
      {!loading && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {displayList.length} assignment{displayList.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '60px 0' }}>Loading...</div>
      ) : displayList.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            {tab === 'mine' ? 'No assignments saved yet' : 'No public assignments found'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {tab === 'mine' ? 'Upload your first assignment to save it permanently' : 'Be the first to share your work!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayList.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 18px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '11px', transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#f59e0b50')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Icon */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: '#f59e0b15', border: '1px solid #f59e0b30',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>📋</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  {a.title}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{a.subject}</span>
                  <span style={{ color: 'var(--border)', fontSize: '11px' }}>·</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{a.semester}</span>
                  <span style={{ color: 'var(--border)', fontSize: '11px' }}>·</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{a.academic_year}</span>
                  {tab === 'public' && (
                    <>
                      <span style={{ color: 'var(--border)', fontSize: '11px' }}>·</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        by {a.profiles?.username ?? 'unknown'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right side actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {/* Public/Private badge */}
                <span style={{
                  padding: '3px 9px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600,
                  background: a.is_public ? '#22c55e18' : 'var(--bg-elevated)',
                  border: `1px solid ${a.is_public ? '#22c55e40' : 'var(--border)'}`,
                  color: a.is_public ? '#22c55e' : 'var(--text-muted)',
                }}>
                  {a.is_public ? 'Public' : 'Private'}
                </span>

                {/* Download button */}
                {a.file_url && (
                  <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 10px', borderRadius: '7px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', fontSize: '12px', textDecoration: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                  </a>
                )}

                {/* My assignments only: toggle public + delete */}
                {tab === 'mine' && a.submitted_by === userId && (
                  <>
                    <button
                      onClick={() => togglePublic(a.id, a.is_public)}
                      title={a.is_public ? 'Make private' : 'Make public'}
                      style={{
                        padding: '5px 8px', borderRadius: '7px',
                        background: 'transparent', border: '1px solid var(--border)',
                        color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      {a.is_public ? '🔒 Private' : '🌐 Public'}
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this assignment?')) deleteAssignment(a.id) }}
                      style={{
                        padding: '5px 8px', borderRadius: '7px',
                        background: 'transparent', border: '1px solid var(--border)',
                        color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
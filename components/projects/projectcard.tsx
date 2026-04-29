// components/projects/ProjectCard.tsx
//
// This is a SERVER component — no 'use client' needed.
// It just receives data as props and renders HTML. No interactivity.
//
// It displays a single project as a card:
//   - Thumbnail image (or a colored placeholder)
//   - Title, short description
//   - Tags (colored pills)
//   - Author name + views count

import type { ProjectWithDetails } from '@/lib/types/database'

type Props = {
  project: ProjectWithDetails
}

export default function ProjectCard({ project }: Props) {
  // Shorten description if it's too long for the card
  const shortDesc =
    project.description.length > 100
      ? project.description.slice(0, 100) + '...'
      : project.description

  return (
    <a
      href={`/projects/${project.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '100%',
          height: '180px',
          background: project.thumbnail_url ? 'transparent' : 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'relative',
        }}
      >
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          // Placeholder when no thumbnail: shows first letter of title
          <div
            style={{
              fontSize: '48px',
              fontWeight: '800',
              color: 'var(--text-muted)',
              letterSpacing: '-2px',
              userSelect: 'none',
            }}
          >
            {project.title[0].toUpperCase()}
          </div>
        )}
        {/* Academic year badge in top-right corner */}
        {project.academic_year && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}
          >
            {project.academic_year}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '16px' }}>
        {/* Tags row */}
        {project.project_tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {project.project_tags.slice(0, 3).map(({ tags }) => (
              <span
                key={tags.id}
                style={{
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: tags.color + '20', // color with 12% opacity
                  color: tags.color,
                  border: `1px solid ${tags.color}40`,
                  letterSpacing: '0.2px',
                }}
              >
                {tags.name}
              </span>
            ))}
            {project.project_tags.length > 3 && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-elevated)',
                }}
              >
                +{project.project_tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3
          style={{
            fontSize: '15px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '6px',
            lineHeight: '1.3',
          }}
        >
          {project.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            marginBottom: '14px',
          }}
        >
          {shortDesc}
        </p>

        {/* Footer: author + views */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
          }}
        >
          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '700',
                color: 'var(--accent)',
                flexShrink: 0,
              }}
            >
              {project.profiles?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {project.profiles?.username ?? 'Unknown'}
            </span>
          </div>

          {/* Views */}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            👁 {project.views.toLocaleString()}
          </span>
        </div>
      </div>
    </a>
  )
}

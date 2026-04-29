'use client'
// components/ui/Toast.tsx
//
// A simple self-contained toast notification component.
// Usage: import and call the exported `toast` function anywhere in client components.
//
// HOW IT WORKS:
// We use a module-level event emitter pattern — no React context needed.
// Any component calls toast.success("message") or toast.error("message")
// and the ToastContainer (mounted once in layout) picks it up.

import { useEffect, useState } from 'react'

type ToastItem = {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

// Module-level listeners array — lives outside React
// Any component can push to this to trigger a toast
const listeners: ((toast: ToastItem) => void)[] = []
let nextId = 0

// This is the function you call to show a toast
export const toast = {
  success: (message: string) => emit({ message, type: 'success' }),
  error: (message: string) => emit({ message, type: 'error' }),
  info: (message: string) => emit({ message, type: 'info' }),
}

function emit(t: Omit<ToastItem, 'id'>) {
  const item = { ...t, id: nextId++ }
  listeners.forEach((fn) => fn(item))
}

// ToastContainer — mount this ONCE in your layout
// It listens for toast events and renders them
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handleToast(item: ToastItem) {
      setToasts((prev) => [...prev, item])
      // Auto-remove after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, 3500)
    }

    listeners.push(handleToast)
    return () => {
      // Cleanup on unmount
      const idx = listeners.indexOf(handleToast)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {toasts.map((t) => {
        const colors = {
          success: { bg: '#22c55e18', border: '#22c55e50', text: '#22c55e' },
          error:   { bg: '#ef444418', border: '#ef444450', text: '#ef4444' },
          info:    { bg: 'var(--accent-dim)', border: 'var(--accent)', text: 'var(--accent)' },
        }[t.type]

        return (
          <div
            key={t.id}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'slideIn 0.2s ease',
              maxWidth: '320px',
              wordBreak: 'break-word',
            }}
          >
            {t.message}
          </div>
        )
      })}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

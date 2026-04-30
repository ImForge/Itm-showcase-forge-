import type { Metadata } from 'next'
import '../globals.css'
import { ToastContainer } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'Admin — Forge',
  description: 'Forge admin panel',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
      <ToastContainer />
    </div>
  )
}
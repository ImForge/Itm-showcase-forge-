// app/(admin)/page.tsx
//
// Server component — checks admin role, fetches pending projects,
// passes everything to AdminClient for the interactive UI.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './Adminclient'

export default async function AdminPage() {
  const supabase = await createClient()

  // Must be logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Must be admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, username')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  // Fetch pending projects (oldest first so nothing gets forgotten)
  const { data: pendingProjects } = await supabase
    .from('projects')
    .select(`
      *,
      profiles ( id, username, full_name ),
      project_tags ( tags ( id, name, color ) )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  // Stats for the header bar
  const { count: approvedCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { count: rejectedCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected')

  return (
    <AdminClient
      pendingProjects={pendingProjects ?? []}
      adminUsername={profile.username}
      stats={{
        pending: pendingProjects?.length ?? 0,
        approved: approvedCount ?? 0,
        rejected: rejectedCount ?? 0,
      }}
    />
  )
}

// app/(main)/layout.tsx
// Added SearchModal here so it's mounted on every (main) page.
// Cmd+K works from anywhere — home, projects, teams, assignments.

import { createClient } from '@/lib/supabase/server'
import SidebarClient from '@/components/layout/sidebarclient'
import SearchModal from '@/components/search/SearchModel'

export const dynamic = 'force-dynamic'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let pendingInvitations = 0

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, full_name')
      .eq('id', user.id)
      .single()
    profile = data

    const { count } = await supabase
      .from('team_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('invited_user', user.id)
      .eq('status', 'pending')

    pendingInvitations = count ?? 0
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <SidebarClient user={user} profile={profile} pendingInvitations={pendingInvitations} />
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--bg-base)' }}>
        {children}
      </main>
      {/* SearchModal is always mounted but invisible until Cmd+K */}
      <SearchModal />
    </div>
  )
}

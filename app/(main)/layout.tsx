// app/(main)/layout.tsx
// Server Component — fetches auth + invitations, passes to SidebarClient.
// Uses MainContent (client) to handle mobile padding offset.

import { createClient } from '@/lib/supabase/server'
import SidebarClient from '@/components/layout/sidebarclient'
import SearchModal from '@/components/search/SearchModel'
import MainContent from '@/components/layout/Maincontent'

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
    <div style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', background: '#0e0e10' }}>
      <SidebarClient user={user} profile={profile} pendingInvitations={pendingInvitations} />
      <MainContent>
        {children}
      </MainContent>
      <SearchModal />
    </div>
  )
}

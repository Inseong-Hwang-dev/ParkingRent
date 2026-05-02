import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata = { title: { default: 'Admin', template: '%s | Admin' } }

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verify session via cookie client
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Verify admin flag via service role (bypasses RLS)
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  return <AdminShell>{children}</AdminShell>
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return data?.is_admin ? user : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireAdmin()
  if (!currentUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  let body: { is_admin?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Prevent an admin from removing their own admin rights
  if (id === currentUser.id && body.is_admin === false) {
    return NextResponse.json(
      { error: 'You cannot remove your own admin status' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('users')
    .update({ is_admin: body.is_admin })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

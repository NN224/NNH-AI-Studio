import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://nnh.ae'

  return NextResponse.redirect(`${baseUrl}/auth/login`, { status: 302 })
}
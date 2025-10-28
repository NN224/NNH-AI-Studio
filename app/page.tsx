import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, redirect to home
  if (user) {
    redirect('/home')
  }

  // If not logged in, redirect to login
  redirect('/auth/login')
}

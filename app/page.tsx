import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from './landing'

export default async function RootPage() {
  const supabase = await createClient()
  
  // Check session instead of just user to ensure valid authentication
  const { data: { session } } = await supabase.auth.getSession()

  // If user has valid session, redirect to home
  if (session?.user) {
    redirect('/home')
  }

  // If not logged in, show landing page
  return <LandingPage />
}

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getAccounts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { accounts: [], error: "Not authenticated" }
  }

  const { data: accountsData, error } = await supabase
    .from('gmb_accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { accounts: [], error: error.message }
  }

  // Fetch location counts for each account
  const accountsWithLocations = await Promise.all(
    (accountsData || []).map(async (account) => {
      const { count } = await supabase
        .from('gmb_locations')
        .select('*', { count: 'exact', head: true })
        .eq('gmb_account_id', account.id)

      return {
        ...account,
        total_locations: count || 0
      }
    })
  )

  return { accounts: accountsWithLocations, error: null }
}

export async function deleteAccount(accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from('gmb_accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/accounts')
  return { success: true, error: null }
}

export async function syncAccount(accountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Update last_sync timestamp
  const { error } = await supabase
    .from('gmb_accounts')
    .update({ last_sync: new Date().toISOString() })
    .eq('id', accountId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/accounts')
  return { success: true, error: null }
}

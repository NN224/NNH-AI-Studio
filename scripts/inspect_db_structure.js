/**
 * Supabase Table Inspector
 * Shows structure of all tables in your database
 * 
 * Usage: node scripts/inspect_db_structure.js
 */

import { createClient } from '@supabase/supabase-js'

// Read from environment or use your values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'

if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL environment variable')
  console.log('💡 Or edit this file and add your Supabase URL and Service Role Key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function inspectTables() {
  console.log('🔍 Inspecting Supabase Database Structure\n')
  console.log('=' .repeat(60))
  
  try {
    // Check gmb_accounts table
    console.log('\n📊 GMB_ACCOUNTS Table:')
    console.log('-'.repeat(60))
    const { data: gmbAccountsTest, error: gmbError } = await supabase
      .from('gmb_accounts')
      .select('*')
      .limit(1)
    
    if (gmbError) {
      console.log('❌ Error:', gmbError.message)
    } else {
      if (gmbAccountsTest && gmbAccountsTest.length > 0) {
        console.log('✅ Columns:', Object.keys(gmbAccountsTest[0]).join(', '))
      } else {
        console.log('⚠️  Table exists but empty (no records to inspect columns)')
      }
    }
    
    // Check oauth_tokens table
    console.log('\n📊 OAUTH_TOKENS Table:')
    console.log('-'.repeat(60))
    const { data: oauthTest, error: oauthError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .limit(1)
    
    if (oauthError) {
      console.log('❌ Error:', oauthError.message)
    } else {
      if (oauthTest && oauthTest.length > 0) {
        console.log('✅ Columns:', Object.keys(oauthTest[0]).join(', '))
      } else {
        console.log('⚠️  Table exists but empty (no records to inspect columns)')
      }
    }
    
    // Check gmb_locations table
    console.log('\n📊 GMB_LOCATIONS Table:')
    console.log('-'.repeat(60))
    const { data: locationsTest, error: locError } = await supabase
      .from('gmb_locations')
      .select('*')
      .limit(1)
    
    if (locError) {
      console.log('❌ Error:', locError.message)
    } else {
      if (locationsTest && locationsTest.length > 0) {
        console.log('✅ Columns:', Object.keys(locationsTest[0]).join(', '))
      } else {
        console.log('⚠️  Table exists but empty')
      }
    }
    
    // Get record counts
    console.log('\n📈 Record Counts:')
    console.log('-'.repeat(60))
    
    const tables = ['gmb_accounts', 'gmb_locations', 'gmb_reviews', 'oauth_tokens', 'oauth_states', 'profiles']
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`)
      } else {
        console.log(`✅ ${table}: ${count} records`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Inspection complete!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

inspectTables()

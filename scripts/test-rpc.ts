/**
 * Test script to verify get_user_events RPC function works correctly
 *
 * Run with: npx tsx scripts/test-rpc.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRpc() {
  console.log('🧪 Testing get_user_events RPC function...\n')

  // First, get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('❌ Not authenticated. Please login first.')
    console.log('   Run: npx supabase login && npx supabase db remote commit')
    process.exit(1)
  }

  console.log(`✅ Authenticated as: ${user.email}\n`)

  // Test the RPC function
  const startTime = performance.now()
  const { data: events, error } = await supabase.rpc('get_user_events')
  const endTime = performance.now()

  if (error) {
    console.error('❌ RPC function failed:')
    console.error(`   ${error.message}`)
    console.error(`   Details: ${error.hint || 'None'}`)
    process.exit(1)
  }

  const duration = (endTime - startTime).toFixed(2)

  console.log('✅ RPC function succeeded!\n')
  console.log(`⏱️  Response time: ${duration}ms`)
  console.log(`📊 Events returned: ${events?.length || 0}\n`)

  if (events && events.length > 0) {
    console.log('Sample event:')
    const event = events[0]
    console.log(`   • ID: ${event.id}`)
    console.log(`   • Name: ${event.name}`)
    console.log(`   • Status: ${event.status}`)
    console.log(`   • Created: ${event.created_at}`)
  } else {
    console.log('ℹ️  No events found for this user.')
  }

  console.log('\n✨ RPC function is working correctly!')
}

testRpc().catch(console.error)

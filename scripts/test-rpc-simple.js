/**
 * Simple JS test to verify get_user_events RPC function
 * Run in browser console or with: node scripts/test-rpc-simple.js
 *
 * Instructions for browser console:
 * 1. Open your app and login
 * 2. Open DevTools Console
 * 3. Paste this code and run
 */

const testRpc = async () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const { createClient } = await import('@supabase/supabase-js')

  const supabase = createClient(
    supabaseUrl,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )

  console.log('🧪 Testing get_user_events RPC function...\n')

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('❌ Not authenticated. Please login first.')
    return
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
    return
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

  return { events, duration }
}

// Run test
testRpc()

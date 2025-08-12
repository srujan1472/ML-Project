// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Use environment variables with explicit fallback values to prevent undefined errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if we have the required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file.')
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

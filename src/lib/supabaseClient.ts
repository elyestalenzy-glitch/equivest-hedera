import { createClient } from '@supabase/supabase-js'

// ❗️ These must be your PUBLIC keys from your .env file
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase URL or Anon Key in .env file");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
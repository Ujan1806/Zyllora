import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials have been replaced with real Supabase values
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder-project') &&
  !supabaseAnonKey.includes('placeholder-anon-key')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Zyllora] Supabase credentials are not configured yet in frontend/.env. ' +
    'The frontend will run in preview/demo mode. To enable live Supabase Auth, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

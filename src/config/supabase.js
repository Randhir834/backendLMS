const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

/**
 * Server-side Supabase client for Storage (and other admin APIs).
 * Use the service_role key — never expose it in browsers.
 * Dashboard: Project Settings → API → service_role (secret)
 */
const getSupabaseClient = () => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase Storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or legacy SUPABASE_KEY) in .env'
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
};

module.exports = { getSupabaseClient };

// Server-only. Only ever require() this from files under /api.
// Uses the service role key, which bypasses Row Level Security —
// it must never be sent to or read by the browser.

const { createClient } = require("@supabase/supabase-js");

let cachedClient = null;

function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}

module.exports = { getSupabaseAdmin };

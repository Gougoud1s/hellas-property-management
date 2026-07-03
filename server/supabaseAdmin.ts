import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client used to verify bearer tokens and read
 * authoritative data (never exposed to the browser). Prefers the service-role
 * key; falls back to the anon key purely for token verification. Returns `null`
 * when nothing is configured — that is the "local-demo" posture where the API
 * runs without a backend and auth is intentionally not enforced.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return cached;
}

export function isBackendConfigured(): boolean {
  return getSupabaseAdmin() !== null;
}

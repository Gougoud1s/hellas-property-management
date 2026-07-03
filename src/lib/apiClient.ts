import { getConfiguredDataMode } from './backendContracts';

/**
 * fetch wrapper for the Express API. In Supabase mode it attaches the current
 * user's access token as a Bearer header so the server can authenticate the
 * request (pairs with the server-side `requireAuth` middleware). In local-demo
 * mode there is no session, so it behaves like plain fetch. The Supabase client
 * is imported lazily to keep it out of the demo bundle.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  if (getConfiguredDataMode() === 'supabase') {
    try {
      const { supabase } = await import('./supabase/client');
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    } catch {
      // No session available — let the request proceed and let the server 401.
    }
  }

  return fetch(input, { ...init, headers });
}

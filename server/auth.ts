import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from './supabaseAdmin';

export interface AuthedRequest extends Request {
  user?: { id: string; email?: string };
}

let demoWarned = false;

/**
 * Express middleware that enforces a valid Supabase session on protected API
 * routes (S2). Behaviour:
 *
 *  - Backend configured (SUPABASE_URL + key present): require a
 *    `Authorization: Bearer <access_token>` header and verify it against
 *    Supabase. Reject with 401 on missing/invalid/expired tokens.
 *  - Backend NOT configured (local-demo): the server has no identity provider,
 *    so requests are allowed through with a synthetic demo principal. This is
 *    logged loudly and MUST NOT be the production posture.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    if (!demoWarned) {
      console.warn(
        '[auth] DEMO MODE — API authentication is NOT enforced. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before exposing this server to real users, data, or money.'
      );
      demoWarned = true;
    }
    req.user = { id: 'demo-user' };
    next();
    return;
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
    req.user = { id: data.user.id, email: data.user.email ?? undefined };
    next();
  } catch (err) {
    console.error('[auth] token verification failed:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

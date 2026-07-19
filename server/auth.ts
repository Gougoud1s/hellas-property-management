import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from './supabaseAdmin';
import { demoApiAllowed, runtimeMode } from './config';

export type ApiRole = 'company_admin' | 'company_staff' | 'owner' | 'resident';

export interface AuthedRequest extends Request {
  user?: { id: string; email?: string; profileId?: string; tenantId?: string; role?: ApiRole };
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
    if (!demoApiAllowed()) {
      res.status(503).json({ error: 'API backend is not configured' });
      return;
    }
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
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role, status')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();
    if (profileError || !profile || profile.status !== 'active') {
      res.status(403).json({ error: 'No active application profile' });
      return;
    }
    req.user = {
      id: data.user.id,
      email: data.user.email ?? undefined,
      profileId: profile.id,
      tenantId: profile.tenant_id,
      role: profile.role as ApiRole,
    };
    if (runtimeMode() === 'production' && profile.role === 'company_admin') {
      const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString('utf8')) as { aal?: string };
      if (payload.aal !== 'aal2') { res.status(403).json({ error: 'Administrator MFA required' }); return; }
    }
    next();
  } catch (err) {
    console.error('[auth] token verification failed:', err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function requireCompanyUser(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.user?.id === 'demo-user' && demoApiAllowed()) { next(); return; }
  if (req.user?.role !== 'company_admin' && req.user?.role !== 'company_staff') {
    res.status(403).json({ error: 'Company access required' });
    return;
  }
  next();
}

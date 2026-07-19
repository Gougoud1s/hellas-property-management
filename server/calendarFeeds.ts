import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { buildIcs, ExportCalendarEvent } from '../src/lib/calendarExport';
import { AuthedRequest } from './auth';
import { demoApiAllowed } from './config';
import { getSupabaseAdmin } from './supabaseAdmin';

interface DemoFeed { ownerId: string; calendarName: string; events: ExportCalendarEvent[] }
const demoFeeds = new Map<string, DemoFeed>();
export const calendarFeedPublicRouter = Router();
const router = Router();
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

function validEvents(value: unknown): value is ExportCalendarEvent[] {
  return Array.isArray(value) && value.length <= 500 && value.every((event) => {
    const candidate = event as Partial<ExportCalendarEvent>;
    return Boolean(event && typeof event === 'object' && typeof candidate.id === 'string'
      && typeof candidate.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(candidate.date ?? ''));
  });
}

calendarFeedPublicRouter.get('/:token.ics', async (req, res) => {
  const token = req.params.token;
  const admin = getSupabaseAdmin();
  if (!admin) {
    const feed = demoFeeds.get(token);
    if (!feed || !demoApiAllowed()) { res.status(404).type('text/plain').send('Calendar feed not found or revoked.'); return; }
    res.type('text/calendar').send(buildIcs(feed.events, feed.calendarName));
    return;
  }

  const { data: feed } = await admin.from('calendar_feeds').select('tenant_id,owner_profile_id,calendar_name,revoked_at')
    .eq('token_hash', tokenHash(token)).is('revoked_at', null).maybeSingle();
  if (!feed) { res.status(404).type('text/plain').send('Calendar feed not found or revoked.'); return; }
  const { data: profile } = await admin.from('user_profiles').select('role,status').eq('id', feed.owner_profile_id).maybeSingle();
  if (!profile || profile.status !== 'active') { res.status(404).type('text/plain').send('Calendar feed not found or revoked.'); return; }

  let propertyIds: string[] | null = null;
  if (profile.role === 'owner' || profile.role === 'resident') {
    const { data: access } = await admin.from('user_unit_access').select('units!inner(property_id)').eq('user_profile_id', feed.owner_profile_id);
    propertyIds = [...new Set((access ?? []).map((row: any) => row.units?.property_id).filter(Boolean))] as string[];
  }
  let query = admin.from('calendar_events').select('id,title,event_date,notes,properties(address)')
    .eq('tenant_id', feed.tenant_id).order('event_date');
  if (propertyIds) query = propertyIds.length ? query.in('property_id', propertyIds) : query.is('property_id', null);
  const { data: rows } = await query;
  const events: ExportCalendarEvent[] = (rows ?? []).map((row: any) => ({
    id: row.id, title: row.title, date: row.event_date, description: row.notes ?? undefined,
    location: (Array.isArray(row.properties) ? row.properties[0] : row.properties)?.address,
  }));
  res.status(200).set({
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename="atlas-pm-calendar.ics"',
    'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff',
  }).send(buildIcs(events, feed.calendar_name));
});

router.post('/', async (req: AuthedRequest, res) => {
  const calendarName = typeof req.body?.calendarName === 'string' ? req.body.calendarName.slice(0, 80) : 'Atlas PM';
  const requestedToken = typeof req.body?.token === 'string' ? req.body.token : '';
  const admin = getSupabaseAdmin();
  if (!admin || !req.user?.profileId || !req.user.tenantId) {
    if (!demoApiAllowed() || !validEvents(req.body?.events)) { res.status(503).json({ error: 'Persistent calendar service is not configured' }); return; }
    const existing = requestedToken ? demoFeeds.get(requestedToken) : undefined;
    if (existing && existing.ownerId !== req.user?.id) { res.status(403).json({ error: 'Calendar feed belongs to another user.' }); return; }
    const token = existing ? requestedToken : randomBytes(32).toString('base64url');
    demoFeeds.set(token, { ownerId: req.user?.id ?? 'demo-user', calendarName, events: req.body.events });
    res.json(feedUrls(req, token));
    return;
  }

  if (requestedToken) {
    const { data: existing } = await admin.from('calendar_feeds').select('id').eq('token_hash', tokenHash(requestedToken))
      .eq('owner_profile_id', req.user.profileId).is('revoked_at', null).maybeSingle();
    if (existing) {
      await admin.from('calendar_feeds').update({ calendar_name: calendarName, updated_at: new Date().toISOString() }).eq('id', existing.id);
      res.json(feedUrls(req, requestedToken)); return;
    }
  }
  const token = randomBytes(32).toString('base64url');
  const { error } = await admin.from('calendar_feeds').insert({
    tenant_id: req.user.tenantId, owner_profile_id: req.user.profileId, token_hash: tokenHash(token), calendar_name: calendarName,
  });
  if (error) { res.status(500).json({ error: 'Calendar feed could not be created' }); return; }
  res.status(201).json(feedUrls(req, token));
});

router.delete('/:token', async (req: AuthedRequest, res) => {
  const admin = getSupabaseAdmin();
  if (!admin || !req.user?.profileId) {
    const feed = demoFeeds.get(req.params.token);
    if (feed && feed.ownerId !== req.user?.id) { res.status(403).json({ error: 'Calendar feed belongs to another user.' }); return; }
    demoFeeds.delete(req.params.token); res.status(204).end(); return;
  }
  await admin.from('calendar_feeds').update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('token_hash', tokenHash(req.params.token)).eq('owner_profile_id', req.user.profileId);
  res.status(204).end();
});

function feedUrls(req: { protocol: string; get(name: string): string | undefined }, token: string) {
  const base = (process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const httpUrl = `${base}/api/calendar-feed/${token}.ics`;
  return { token, httpUrl, webcalUrl: httpUrl.replace(/^https?:/, 'webcal:') };
}

export default router;

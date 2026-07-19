import { Router } from 'express';
import { AuthedRequest } from './auth';
import { demoApiAllowed } from './config';
import { getSupabaseAdmin } from './supabaseAdmin';

const router = Router();
const demoSubscriptions = new Map<string, unknown>();

router.post('/subscribe', async (req: AuthedRequest, res) => {
  const subscription = req.body?.subscription ?? req.body;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: 'Invalid push subscription' }); return; }
  const admin = getSupabaseAdmin();
  if (!admin || !req.user?.tenantId || !req.user.profileId) {
    if (!demoApiAllowed()) { res.status(503).json({ error: 'Push storage is not configured' }); return; }
    demoSubscriptions.set(endpoint, subscription); res.status(201).json({ id: endpoint, subscribed: true, demo: true }); return;
  }
  const { data, error } = await admin.from('push_subscriptions').upsert({
    tenant_id: req.user.tenantId, user_id: req.user.profileId, endpoint, p256dh, auth,
  }, { onConflict: 'endpoint' }).select('id').single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json({ id: data.id, subscribed: true, demo: false });
});

router.delete('/subscribe/:id', async (req: AuthedRequest, res) => {
  const admin = getSupabaseAdmin();
  if (admin && req.user?.profileId) await admin.from('push_subscriptions').delete().eq('id', req.params.id).eq('user_id', req.user.profileId);
  else demoSubscriptions.delete(req.params.id);
  res.sendStatus(204);
});

export default router;

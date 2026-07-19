import { Router } from 'express';
import { AuthedRequest, requireCompanyUser } from './auth';
import { demoApiAllowed } from './config';
import { getSupabaseAdmin } from './supabaseAdmin';

const router = Router();

router.post('/scan', requireCompanyUser, async (req: AuthedRequest, res) => {
  const bucket = req.body?.bucket;
  const path = req.body?.path;
  if (!['tenant-documents', 'tenant-branding'].includes(bucket) || typeof path !== 'string' || !req.user?.tenantId || !path.startsWith(`${req.user.tenantId}/`)) {
    res.status(400).json({ error: 'Invalid tenant-scoped file' }); return;
  }
  const admin = getSupabaseAdmin();
  if (!admin) { res.status(503).json({ error: 'Storage backend unavailable' }); return; }
  if (!process.env.FILE_SCAN_API_URL || !process.env.FILE_SCAN_API_KEY) {
    if (demoApiAllowed()) { res.json({ clean: true, demo: true }); return; }
    await admin.storage.from(bucket).remove([path]);
    res.status(503).json({ error: 'Malware scanner is not configured; upload removed' }); return;
  }
  const { data: blob, error } = await admin.storage.from(bucket).download(path);
  if (error || !blob) { res.status(404).json({ error: 'Uploaded file not found' }); return; }
  const form = new FormData();
  form.append('file', blob, path.split('/').pop() || 'upload');
  const response = await fetch(process.env.FILE_SCAN_API_URL, { method: 'POST', headers: { Authorization: `Bearer ${process.env.FILE_SCAN_API_KEY}` }, body: form });
  const result = await response.json().catch(() => ({})) as { clean?: boolean; threat?: string };
  if (!response.ok || result.clean !== true) {
    await admin.storage.from(bucket).remove([path]);
    res.status(422).json({ error: result.threat ? `Unsafe file: ${result.threat}` : 'File scan failed; upload removed' }); return;
  }
  res.json({ clean: true, demo: false });
});

export default router;

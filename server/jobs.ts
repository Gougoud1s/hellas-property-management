import { Router } from 'express';
import { getSupabaseAdmin } from './supabaseAdmin';
import { sendEmail, sendSms } from './providers';

const router = Router();

router.get('/retry-deliveries', async (req, res) => {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.header('authorization') !== `Bearer ${expected}`) { res.status(401).json({ error: 'Invalid cron authorization' }); return; }
  const admin = getSupabaseAdmin();
  if (!admin) { res.status(503).json({ error: 'Backend unavailable' }); return; }
  const { data: deliveries, error } = await admin.from('integration_deliveries').select('*')
    .eq('status', 'failed').lte('next_attempt_at', new Date().toISOString()).lt('attempt_count', 5).limit(100);
  if (error) { res.status(500).json({ error: error.message }); return; }
  let sent = 0;
  for (const delivery of deliveries ?? []) {
    try {
      const result = delivery.channel === 'email'
        ? await sendEmail({ to: delivery.recipient, subject: delivery.payload.subject, html: delivery.payload.html })
        : await sendSms({ to: delivery.recipient, text: delivery.payload.text });
      await admin.from('integration_deliveries').update({ status: 'sent', provider_message_id: result.providerMessageId,
        attempt_count: delivery.attempt_count + 1, last_error: null, next_attempt_at: null, updated_at: new Date().toISOString() }).eq('id', delivery.id);
      sent += 1;
    } catch (cause) {
      const attempts = delivery.attempt_count + 1;
      await admin.from('integration_deliveries').update({ status: attempts >= 5 ? 'cancelled' : 'failed', attempt_count: attempts,
        last_error: cause instanceof Error ? cause.message : 'Retry failed', next_attempt_at: attempts >= 5 ? null : new Date(Date.now() + 300_000 * 2 ** attempts).toISOString(),
        updated_at: new Date().toISOString() }).eq('id', delivery.id);
    }
  }
  res.json({ processed: deliveries?.length ?? 0, sent });
});

export default router;

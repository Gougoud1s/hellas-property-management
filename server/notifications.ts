import { Router } from 'express';
import { AuthedRequest, requireCompanyUser } from './auth';
import { getSupabaseAdmin } from './supabaseAdmin';
import { noticeEmailHtml, sendEmail, sendSms } from './providers';

const router = Router();

router.post('/notices/send', requireCompanyUser, async (req: AuthedRequest, res) => {
  const ids = Array.isArray(req.body?.noticeIds) ? req.body.noticeIds.filter((id: unknown) => typeof id === 'string').slice(0, 200) : [];
  const admin = getSupabaseAdmin();
  if (!admin || !req.user?.tenantId || !ids.length) { res.status(400).json({ error: 'Notice IDs and configured backend are required' }); return; }
  const { data: notices, error } = await admin.from('account_notices').select('*')
    .eq('tenant_id', req.user.tenantId).in('id', ids);
  if (error) { res.status(500).json({ error: error.message }); return; }

  const results = [];
  for (const notice of notices ?? []) {
    const idempotencyKey = `notice:${notice.id}:${notice.channel}`;
    const deliveryPayload = notice.channel === 'email'
      ? { subject: `Κοινόχρηστα ${notice.period}`, html: noticeEmailHtml({ period: notice.period, amount: Number(notice.amount), dueDate: notice.due_date }) }
      : { text: `Atlas PM: ${notice.period}, ${Number(notice.amount).toFixed(2)} EUR, λήξη ${notice.due_date}` };
    try {
      const delivery = notice.channel === 'email'
        ? await sendEmail({ to: notice.recipient, subject: deliveryPayload.subject!, html: deliveryPayload.html! })
        : notice.channel === 'sms'
          ? await sendSms({ to: notice.recipient, text: deliveryPayload.text! })
          : { providerMessageId: `print:${notice.id}` };
      await admin.from('integration_deliveries').upsert({
        tenant_id: req.user.tenantId, provider: notice.channel === 'email' ? 'resend' : notice.channel,
        channel: notice.channel, recipient: notice.recipient, template: 'account-notice', idempotency_key: idempotencyKey,
        payload: deliveryPayload, provider_message_id: delivery.providerMessageId, status: 'sent', attempt_count: 1, updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,idempotency_key' });
      await admin.from('account_notices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', notice.id).eq('tenant_id', req.user.tenantId);
      results.push({ id: notice.id, status: 'sent' });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Delivery failed';
      await admin.from('integration_deliveries').upsert({
        tenant_id: req.user.tenantId, provider: notice.channel, channel: notice.channel,
        recipient: notice.recipient, template: 'account-notice', idempotency_key: idempotencyKey,
        payload: deliveryPayload, status: 'failed', attempt_count: 1, last_error: message, next_attempt_at: new Date(Date.now() + 300_000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,idempotency_key' });
      results.push({ id: notice.id, status: 'failed', error: message });
    }
  }
  const failed = results.filter((result) => result.status === 'failed').length;
  res.status(failed ? 207 : 200).json({ sent: results.length - failed, failed, results });
});

router.post('/assemblies/:id/notify', requireCompanyUser, (_req, res) => {
  res.status(501).json({ error: 'Assembly delivery requires explicit recipient records; no simulated send was performed.' });
});

export default router;

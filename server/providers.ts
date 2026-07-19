import { integrationEnabled } from './config';

export interface DeliveryResult { providerMessageId: string }

export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<DeliveryResult> {
  if (!integrationEnabled('email')) throw new Error('Transactional email is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [input.to], subject: input.subject, html: input.html }),
  });
  const payload = await response.json() as { id?: string; message?: string };
  if (!response.ok || !payload.id) throw new Error(payload.message || `Email provider returned ${response.status}`);
  return { providerMessageId: payload.id };
}

export async function sendSms(input: { to: string; text: string }): Promise<DeliveryResult> {
  if (!integrationEnabled('sms') || !process.env.SMS_API_URL) throw new Error('SMS provider is not configured');
  const response = await fetch(process.env.SMS_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SMS_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.SMS_FROM, to: input.to, text: input.text }),
  });
  const payload = await response.json() as { id?: string; messageId?: string; error?: string };
  const id = payload.id || payload.messageId;
  if (!response.ok || !id) throw new Error(payload.error || `SMS provider returned ${response.status}`);
  return { providerMessageId: id };
}

export function noticeEmailHtml(input: { period: string; amount: number; dueDate: string }): string {
  return `<main style="font-family:Arial,sans-serif;color:#163b3f"><h1>Ειδοποιητήριο κοινοχρήστων</h1><p>Περίοδος: <strong>${escapeHtml(input.period)}</strong></p><p>Πληρωτέο ποσό: <strong>${input.amount.toFixed(2)} €</strong></p><p>Προθεσμία: <strong>${escapeHtml(input.dueDate)}</strong></p><p>Συνδεθείτε στην ασφαλή πύλη Atlas PM για την αναλυτική κατάσταση.</p></main>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]!));
}


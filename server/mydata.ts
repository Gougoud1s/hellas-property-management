import { Router } from 'express';
import crypto from 'node:crypto';
import { AuthedRequest, requireCompanyUser } from './auth';
import { demoApiAllowed, integrationEnabled } from './config';

const router = Router();
const baseUrl = () => (process.env.AADE_API_URL || 'https://mydatapi.aade.gr/myDATA').replace(/\/$/, '');

router.post('/transmit', requireCompanyUser, async (req: AuthedRequest, res) => {
  const { property, period, expenses = [], units = [], invoiceXml } = req.body;
  if (!property?.id || !period) { res.status(400).json({ error: 'Property and period are required' }); return; }
  const total = expenses.filter((item: { status: string }) => item.status === 'Verified').reduce((sum: number, item: { amount: number }) => sum + Number(item.amount), 0);
  if (!integrationEnabled('mydata')) {
    if (!demoApiAllowed()) { res.status(503).json({ error: 'AADE/myDATA is not configured' }); return; }
    const mark = `D-${Date.now().toString().slice(-8)}-${crypto.randomInt(100, 999)}`;
    res.json({ mark, demo: true, summary: { invoiceType: '13.1', total, recipients: units.length } }); return;
  }
  if (typeof invoiceXml !== 'string' || !invoiceXml.includes('<InvoicesDoc')) {
    res.status(422).json({ error: 'A validated InvoicesDoc XML payload is required. The accountant-approved issuer and classification data are incomplete.' }); return;
  }
  const response = await fetch(`${baseUrl()}/SendInvoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'aade-user-id': process.env.AADE_USER_ID!,
      'Ocp-Apim-Subscription-Key': process.env.AADE_SUBSCRIPTION_KEY!,
    },
    body: invoiceXml,
  });
  const body = await response.text();
  if (!response.ok) { res.status(502).json({ error: `AADE returned ${response.status}`, details: body.slice(0, 1000) }); return; }
  const mark = body.match(/<invoiceMark>([^<]+)<\/invoiceMark>/)?.[1];
  if (!mark) { res.status(502).json({ error: 'AADE response did not contain an invoice MARK', details: body.slice(0, 1000) }); return; }
  res.json({ mark, demo: false });
});

router.get('/status/:mark', requireCompanyUser, (_req, res) => res.status(501).json({ error: 'Use the AADE RequestTransmittedDocs workflow after accountant approval.' }));
router.post('/cancel/:mark', requireCompanyUser, (_req, res) => res.status(501).json({ error: 'Cancellation requires accountant-approved entity data and CancelInvoice transport.' }));

export default router;

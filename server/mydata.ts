import { Router } from 'express';
import crypto from 'node:crypto';

const router = Router();

router.post('/transmit', async (req, res) => {
  const { property, period, expenses = [], units = [] } = req.body;
  if (!property?.id || !period) { res.status(400).json({ error: 'Property and period are required' }); return; }
  const total = expenses.filter((item: { status: string }) => item.status === 'Verified').reduce((sum: number, item: { amount: number }) => sum + Number(item.amount), 0);
  if (process.env.MYDATA_DEMO !== 'false' || !process.env.AADE_USER_ID) {
    const mark = `D-${Date.now().toString().slice(-8)}-${crypto.randomInt(100, 999)}`;
    res.json({ mark, demo: true, summary: { invoiceType: '13.1', total, recipients: units.length } });
    return;
  }
  // Production deployments should sign and transmit the IAPR XML through a server-side credential vault.
  res.status(501).json({ error: 'AADE production transport requires the organisation credential vault.' });
});

router.get('/status/:mark', (req, res) => res.json({ mark: req.params.mark, status: req.params.mark.startsWith('D-') ? 'demo' : 'accepted' }));
router.post('/cancel/:mark', (req, res) => res.json({ mark: req.params.mark, status: 'cancelled', demo: req.params.mark.startsWith('D-') }));

export default router;

import { Router, Request, Response } from 'express';
import { validateAmount } from './validation';

const router = Router();

const SANDBOX = process.env.VIVAWALLET_SANDBOX !== 'false';
const TOKEN_URL = SANDBOX
  ? 'https://demo-accounts.vivapayments.com/connect/token'
  : 'https://accounts.vivapayments.com/connect/token';
const ORDER_URL = SANDBOX
  ? 'https://demo-api.vivapayments.com/checkout/v2/orders'
  : 'https://api.vivapayments.com/checkout/v2/orders';
const CHECKOUT_BASE = SANDBOX
  ? 'https://demo.vivapayments.com/web/checkout'
  : 'https://www.vivapayments.com/web/checkout';

const TX_BASE = SANDBOX
  ? 'https://demo-api.vivapayments.com/checkout/v2/transactions'
  : 'https://api.vivapayments.com/checkout/v2/transactions';

async function getVivaToken(): Promise<string> {
  const clientId = process.env.VIVAWALLET_CLIENT_ID;
  const clientSecret = process.env.VIVAWALLET_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Viva Wallet credentials not configured');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// POST /api/payments/create-order
router.post('/create-order', async (req: Request, res: Response) => {
  const { unitId, amount, ownerName, ownerEmail, propertyName, period } = req.body as {
    unitId: string;
    amount: number;
    ownerName: string;
    ownerEmail?: string;
    propertyName: string;
    period: string;
  };

  const validated = validateAmount(amount);
  if (!unitId || !validated) {
    res.status(400).json({ error: 'A valid unitId and amount (0.50–50000, max 2 decimals) are required' });
    return;
  }

  // Demo/fallback mode when Viva credentials are missing
  if (!process.env.VIVAWALLET_CLIENT_ID) {
    const demoCode = `DEMO-${unitId}-${Date.now()}`;
    res.json({
      orderCode: demoCode,
      checkoutUrl: `${CHECKOUT_BASE}?ref=${demoCode}`,
      demo: true,
    });
    return;
  }

  try {
    const token = await getVivaToken();
    const amountInCents = validated.cents;
    const description = `Κοινόχρηστα ${period} — ${propertyName} Διαμ. ${unitId}`;

    const orderRes = await fetch(ORDER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInCents,
        customerTrns: description,
        customer: {
          email: ownerEmail || 'noreply@hellaspm.gr',
          fullName: ownerName || 'Ιδιοκτήτης',
        },
        paymentTimeout: 86400,
        preauth: false,
        allowRecurring: false,
        maxInstallments: 0,
        paymentNotification: true,
        sourceCode: process.env.VIVAWALLET_SOURCE_CODE || '',
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      throw new Error(`Order creation failed: ${orderRes.status} — ${errText}`);
    }

    const order = await orderRes.json() as { orderCode: number };
    res.json({
      orderCode: order.orderCode,
      checkoutUrl: `${CHECKOUT_BASE}?ref=${order.orderCode}`,
      demo: false,
    });
  } catch (err: unknown) {
    console.error('[Viva] create-order error:', err);
    res.status(502).json({ error: err instanceof Error ? err.message : 'Payment order creation failed' });
  }
});

// GET /api/payments/verify/:orderCode
router.get('/verify/:orderCode', async (req: Request, res: Response) => {
  const { orderCode } = req.params;

  if (!process.env.VIVAWALLET_CLIENT_ID) {
    res.json({ status: 'demo', orderCode });
    return;
  }

  try {
    const token = await getVivaToken();
    const verifyUrl = SANDBOX
      ? `https://demo-api.vivapayments.com/checkout/v2/transactions/${orderCode}`
      : `https://api.vivapayments.com/checkout/v2/transactions/${orderCode}`;

    const verifyRes = await fetch(verifyUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!verifyRes.ok) {
      res.status(verifyRes.status).json({ error: 'Verification failed' });
      return;
    }

    const txData = await verifyRes.json();
    res.json(txData);
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Verification failed' });
  }
});

// POST /api/webhooks/vivawallet  (Viva sends GET first to verify, then POST for events)
router.get('/webhook', (req: Request, res: Response) => {
  const key = process.env.VIVAWALLET_WEBHOOK_KEY || 'demo-key';
  res.json({ key });
});

router.post('/webhook', async (req: Request, res: Response) => {
  // Viva delivers the event either flat or wrapped in EventData. We treat the
  // body as an UNTRUSTED notification only — never act on its StatusId directly.
  const body = req.body as {
    EventTypeId?: number;
    EventData?: { OrderCode?: number; TransactionId?: string; StatusId?: string };
    OrderCode?: number;
    TransactionId?: string;
    StatusId?: string;
  };
  const eventTypeId = body.EventTypeId;
  const transactionId = body.EventData?.TransactionId ?? body.TransactionId;
  const orderCode = body.EventData?.OrderCode ?? body.OrderCode;
  console.log('[Viva webhook] received', JSON.stringify({ eventTypeId, orderCode, transactionId }));

  // Always ACK quickly so Viva doesn't retry-storm; verification happens out of
  // band below. Only the "Transaction Payment Created" event (1796) matters.
  res.sendStatus(200);

  if (eventTypeId !== 1796) return;

  // In demo mode (no credentials) there is nothing authoritative to check.
  if (!process.env.VIVAWALLET_CLIENT_ID) {
    console.warn('[Viva webhook] DEMO mode — event NOT verified, no action taken.');
    return;
  }

  if (!transactionId) {
    console.warn('[Viva webhook] missing TransactionId — cannot verify; ignoring.');
    return;
  }

  try {
    // S3: re-verify against Viva's API. A forged POST cannot fake this, because
    // it requires our OAuth credentials and returns Viva's own record.
    const token = await getVivaToken();
    const verifyRes = await fetch(`${TX_BASE}/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!verifyRes.ok) {
      console.warn(`[Viva webhook] verification lookup failed (${verifyRes.status}) — ignoring event.`);
      return;
    }
    const tx = (await verifyRes.json()) as { statusId?: string; amount?: number; orderCode?: number };
    if (tx.statusId === 'F') {
      // Confirmed by Viva — safe to settle. Use the AMOUNT FROM VIVA, not the body.
      console.log(`[Viva] Payment verified & confirmed: order ${tx.orderCode ?? orderCode}, amount ${(tx.amount ?? 0) / 100} EUR`);
      // TODO(prod): mark the ledger paid here via the Supabase service-role client.
    } else {
      console.warn(`[Viva webhook] transaction ${transactionId} not in final paid state (statusId=${tx.statusId}) — no action.`);
    }
  } catch (err) {
    console.error('[Viva webhook] verification error:', err);
  }
});

export default router;

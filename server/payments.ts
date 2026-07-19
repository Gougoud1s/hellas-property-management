import { Router, Request, Response } from 'express';
import { validateAmount } from './validation';
import { AuthedRequest } from './auth';
import { demoApiAllowed, integrationEnabled } from './config';
import { getSupabaseAdmin } from './supabaseAdmin';

const router = Router();
export const paymentsWebhookRouter = Router();

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
router.post('/create-order', async (req: AuthedRequest, res: Response) => {
  const { unitId, propertyId, amount, ownerName, ownerEmail, propertyName, period } = req.body as {
    unitId: string;
    propertyId: string;
    amount: number;
    ownerName: string;
    ownerEmail?: string;
    propertyName: string;
    period: string;
  };

  const validated = validateAmount(amount);
  if (!unitId || !propertyId || !validated) {
    res.status(400).json({ error: 'A valid propertyId, unitId and amount (0.50–50000, max 2 decimals) are required' });
    return;
  }

  const idempotencyKey = String(req.header('idempotency-key') || '').trim();
  if (!idempotencyKey || idempotencyKey.length > 128) {
    res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!integrationEnabled('viva') || !supabase || !req.user?.tenantId || !req.user.profileId) {
    if (!demoApiAllowed()) { res.status(503).json({ error: 'Viva Wallet is not configured' }); return; }
    const demoCode = `DEMO-${unitId}-${Date.now()}`;
    res.json({
      orderCode: demoCode,
      checkoutUrl: `${CHECKOUT_BASE}?ref=${demoCode}`,
      demo: true,
    });
    return;
  }

  try {
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('id, tenant_id, property_id, code, balance, owner_name, owner_email, properties!inner(name,period)')
      .eq('tenant_id', req.user.tenantId)
      .eq('code', unitId)
      .eq('properties.code', propertyId)
      .maybeSingle();
    if (unitError || !unit) { res.status(404).json({ error: 'Unit not found' }); return; }
    if (req.user.role === 'owner' || req.user.role === 'resident') {
      const { count } = await supabase.from('user_unit_access').select('*', { count: 'exact', head: true })
        .eq('user_profile_id', req.user.profileId).eq('unit_id', unit.id);
      if (!count) { res.status(403).json({ error: 'Unit access denied' }); return; }
    }
    if (validated.euros > Math.max(0, Number(unit.balance))) {
      res.status(409).json({ error: 'Payment exceeds the current unit balance' });
      return;
    }
    const property = Array.isArray(unit.properties) ? unit.properties[0] : unit.properties;
    const { data: existing } = await supabase.from('payment_orders').select('*')
      .eq('tenant_id', req.user.tenantId).eq('idempotency_key', idempotencyKey).maybeSingle();
    if (existing?.provider_order_code) {
      res.json({ orderCode: existing.provider_order_code, checkoutUrl: `${CHECKOUT_BASE}?ref=${existing.provider_order_code}`, demo: false, reused: true });
      return;
    }
    const { data: pendingOrder, error: pendingError } = await supabase.from('payment_orders').insert({
      tenant_id: req.user.tenantId, property_id: unit.property_id, unit_id: unit.id,
      idempotency_key: idempotencyKey, amount: validated.euros,
      payer_name: ownerName || unit.owner_name, payer_email: ownerEmail || unit.owner_email,
      period: period || property?.period || '', status: 'created', created_by: req.user.profileId,
    }).select().single();
    if (pendingError) throw pendingError;

    const token = await getVivaToken();
    const amountInCents = validated.cents;
    const description = `Κοινόχρηστα ${period || property?.period} — ${propertyName || property?.name} Διαμ. ${unitId}`;

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
    const { error: updateError } = await supabase.from('payment_orders')
      .update({ provider_order_code: String(order.orderCode), status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', pendingOrder.id);
    if (updateError) throw updateError;
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
router.get('/verify/:orderCode', async (req: AuthedRequest, res: Response) => {
  const { orderCode } = req.params;

  if (!integrationEnabled('viva')) {
    if (!demoApiAllowed()) { res.status(503).json({ error: 'Viva Wallet is not configured' }); return; }
    res.json({ status: 'demo', orderCode });
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    if (!admin || !req.user?.tenantId || !req.user.profileId) { res.status(503).json({ error: 'Payment backend unavailable' }); return; }
    const { data: order } = await admin.from('payment_orders').select('unit_id')
      .eq('tenant_id', req.user.tenantId).eq('provider_order_code', orderCode).maybeSingle();
    if (!order) { res.status(404).json({ error: 'Payment order not found' }); return; }
    if (req.user.role === 'owner' || req.user.role === 'resident') {
      const { count } = await admin.from('user_unit_access').select('*', { count: 'exact', head: true })
        .eq('user_profile_id', req.user.profileId).eq('unit_id', order.unit_id);
      if (!count) { res.status(403).json({ error: 'Payment order access denied' }); return; }
    }
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
paymentsWebhookRouter.get('/webhook', (_req: Request, res: Response) => {
  const key = process.env.VIVAWALLET_WEBHOOK_KEY;
  if (!key) { res.sendStatus(demoApiAllowed() ? 200 : 503); return; }
  res.json({ key });
});

paymentsWebhookRouter.post('/webhook', async (req: Request, res: Response) => {
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
  if (!integrationEnabled('viva')) {
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
      const admin = getSupabaseAdmin();
      if (!admin || !tx.orderCode || !tx.amount) throw new Error('Verified payment is missing settlement data');
      const eventId = transactionId;
      const { error: replayError } = await admin.from('webhook_events').insert({
        provider: 'viva', provider_event_id: eventId, payload_hash: eventId, status: 'verified',
      });
      if (replayError?.code === '23505') return;
      if (replayError) throw replayError;
      const { error: settleError } = await admin.rpc('settle_provider_payment', {
        target_order_code: String(tx.orderCode), target_transaction_id: transactionId,
        confirmed_amount: tx.amount / 100,
      });
      await admin.from('webhook_events').update({
        status: settleError ? 'failed' : 'processed', error: settleError?.message ?? null, processed_at: new Date().toISOString(),
      }).eq('provider', 'viva').eq('provider_event_id', eventId);
      if (settleError) throw settleError;
    } else {
      console.warn(`[Viva webhook] transaction ${transactionId} not in final paid state (statusId=${tx.statusId}) — no action.`);
    }
  } catch (err) {
    console.error('[Viva webhook] verification error:', err);
  }
});

export default router;

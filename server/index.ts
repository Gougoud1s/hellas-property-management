import express from 'express';
import { config } from 'dotenv';

config({ path: '.env.local' });

const app = express();
const PORT = Number(process.env.API_PORT || 3001);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for local dev
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.VITE_APP_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

import paymentsRouter from './payments';
import mydataRouter from './mydata';
import ocrRouter from './ocr';
import notificationsRouter from './notifications';
import pushRouter from './push';
import { requireAuth } from './auth';
import { isBackendConfigured } from './supabaseAdmin';

// Viva webhooks are called server-to-server by Viva (not by an authenticated
// user), so they are NOT behind requireAuth — they are protected instead by
// re-verifying each event against the Viva API (see payments.ts). Mount them
// BEFORE the authenticated payments router.
app.use('/api/webhooks/vivawallet', paymentsRouter);

// Every user-facing API surface requires an authenticated session.
app.use('/api/payments', requireAuth, paymentsRouter);
app.use('/api/mydata', requireAuth, mydataRouter);
app.use('/api/expenses', requireAuth, ocrRouter);
app.use('/api', requireAuth, notificationsRouter);
app.use('/api/push', requireAuth, pushRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`[Atlas PM API] Listening on http://localhost:${PORT}`);
  console.log(`[auth] Backend: ${isBackendConfigured() ? 'configured — auth ENFORCED' : 'NOT configured — DEMO mode, auth NOT enforced'}`);
  console.log(`[Viva] Sandbox mode: ${process.env.VIVAWALLET_SANDBOX !== 'false'}`);
  console.log(`[Viva] Credentials: ${process.env.VIVAWALLET_CLIENT_ID ? 'configured' : 'missing — demo mode active'}`);
});

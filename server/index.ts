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
app.use('/api/payments', paymentsRouter);
app.use('/api/webhooks/vivawallet', paymentsRouter);
app.use('/api/mydata', mydataRouter);
app.use('/api/expenses', ocrRouter);
app.use('/api', notificationsRouter);
app.use('/api/push', pushRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`[Atlas PM API] Listening on http://localhost:${PORT}`);
  console.log(`[Viva] Sandbox mode: ${process.env.VIVAWALLET_SANDBOX !== 'false'}`);
  console.log(`[Viva] Credentials: ${process.env.VIVAWALLET_CLIENT_ID ? 'configured' : 'missing — demo mode active'}`);
});

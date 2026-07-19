import express from 'express';
import { config } from 'dotenv';

config({ path: '.env.local' });

const app = express();
const PORT = Number(process.env.API_PORT || 3001);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
import { assertProductionConfiguration, getReadinessChecks, runtimeMode } from './config';
import { rateLimit, requestContext, securityHeaders, trustedCors } from './security';

assertProductionConfiguration();
app.use(requestContext);
app.use(securityHeaders);
app.use(trustedCors);
app.use(rateLimit());

import paymentsRouter, { paymentsWebhookRouter } from './payments';
import mydataRouter from './mydata';
import ocrRouter from './ocr';
import notificationsRouter from './notifications';
import pushRouter from './push';
import calendarFeedsRouter, { calendarFeedPublicRouter } from './calendarFeeds';
import { requireAuth } from './auth';
import { isBackendConfigured } from './supabaseAdmin';
import jobsRouter from './jobs';
import filesRouter from './files';

// Viva webhooks are called server-to-server by Viva (not by an authenticated
// user), so they are NOT behind requireAuth — they are protected instead by
// re-verifying each event against the Viva API (see payments.ts). Mount them
// BEFORE the authenticated payments router.
app.use('/api/webhooks/vivawallet', rateLimit(60, 60_000), paymentsWebhookRouter, (_req, res) => res.status(404).json({ error: 'Webhook route not found' }));
app.use('/api/calendar-feed', calendarFeedPublicRouter);
app.use('/api/jobs', rateLimit(10, 60_000), jobsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/api/readiness', (_req, res) => {
  const checks = getReadinessChecks();
  const ready = checks.filter((check) => check.required).every((check) => check.ready);
  res.status(ready ? 200 : 503).json({ ready, mode: runtimeMode(), checks });
});

// Every user-facing API surface requires an authenticated session.
app.use('/api/payments', requireAuth, paymentsRouter);
app.use('/api/mydata', requireAuth, mydataRouter);
app.use('/api/expenses', requireAuth, ocrRouter);
app.use('/api', requireAuth, notificationsRouter);
app.use('/api/push', requireAuth, pushRouter);
app.use('/api/calendar-feeds', requireAuth, calendarFeedsRouter);
app.use('/api/files', requireAuth, filesRouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = res.locals.requestId;
  console.error(JSON.stringify({ level: 'error', event: 'unhandled_request_error', requestId, message: error instanceof Error ? error.message : 'Unknown error' }));
  res.status(500).json({ error: 'Internal server error', requestId });
});

export default app;

if (!process.env.VERCEL) app.listen(PORT, () => {
  console.log(`[Atlas PM API] Listening on http://localhost:${PORT}`);
  console.log(`[auth] Backend: ${isBackendConfigured() ? 'configured — auth ENFORCED' : 'NOT configured — DEMO mode, auth NOT enforced'}`);
  console.log(`[Viva] Sandbox mode: ${process.env.VIVAWALLET_SANDBOX !== 'false'}`);
  console.log(`[Viva] Credentials: ${process.env.VIVAWALLET_CLIENT_ID ? 'configured' : 'missing — demo mode active'}`);
});

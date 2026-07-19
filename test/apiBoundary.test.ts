import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';

process.env.VERCEL = '1';
const { default: app } = await import('../server/index');

test('API boundary exposes health but protects user routes and isolates webhook routes', async () => {
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json() as { ok: boolean }).ok, true);

    const protectedRoute = await fetch(`${base}/api/payments/create-order`, { method: 'POST' });
    assert.equal(protectedRoute.status, 401);

    const publicPrefixAttack = await fetch(`${base}/api/webhooks/vivawallet/create-order`, { method: 'POST' });
    assert.equal(publicPrefixAttack.status, 404);

    const untrustedOrigin = await fetch(`${base}/api/health`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(untrustedOrigin.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

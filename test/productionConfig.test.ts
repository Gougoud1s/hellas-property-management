import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedOrigins, demoApiAllowed, getReadinessChecks } from '../server/config';

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.entries(values).forEach(([key, value]) => value === undefined ? delete process.env[key] : process.env[key] = value);
  try { run(); } finally { Object.entries(previous).forEach(([key, value]) => value === undefined ? delete process.env[key] : process.env[key] = value); }
}

test('production never permits the unauthenticated demo API', () => withEnv({ NODE_ENV: 'production', ALLOW_DEMO_API: 'true' }, () => {
  assert.equal(demoApiAllowed(), false);
}));

test('trusted origins are normalized and split', () => withEnv({ APP_ORIGINS: 'https://app.example.com/, https://portal.example.com' }, () => {
  assert.deepEqual(allowedOrigins(), ['https://app.example.com', 'https://portal.example.com']);
}));

test('readiness exposes required backend credentials without exposing values', () => withEnv({ SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' }, () => {
  const check = getReadinessChecks().find((item) => item.key === 'supabase');
  assert.equal(check?.required, true);
  assert.equal(check?.ready, false);
  assert.equal(JSON.stringify(check).includes('service_role'), false);
}));


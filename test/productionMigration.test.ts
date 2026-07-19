import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('../supabase_0008_production_hardening.sql', import.meta.url), 'utf8');
const mfaSql = readFileSync(new URL('../supabase_0012_mfa_and_profile_security.sql', import.meta.url), 'utf8');
const balanceSql = readFileSync(new URL('../supabase_0014_authoritative_balances.sql', import.meta.url), 'utf8');
const periodBalanceSql = readFileSync(new URL('../supabase_0016_property_period_balance_refresh.sql', import.meta.url), 'utf8');
const immutablePaymentsSql = readFileSync(new URL('../supabase_0017_immutable_completed_payments.sql', import.meta.url), 'utf8');

test('production migration contains immutable financial history guards', () => {
  assert.match(sql, /statement_batches_immutable/);
  assert.match(sql, /statements_published_immutable/);
  assert.match(sql, /statement_lines_published_immutable/);
  assert.match(sql, /idempotency_key/);
});

test('administrator access requires AAL2 and direct role updates are revoked', () => {
  assert.match(mfaSql, /auth\.jwt\(\)->>'aal'.*aal2/s);
  assert.match(mfaSql, /revoke update on public\.user_profiles from authenticated/);
  assert.match(mfaSql, /grant update \(full_name, avatar_url, phone, job_title, notification_email, notification_sms\)/);
  assert.match(mfaSql, /admin_update_user/);
});

test('production migration scopes private data and storage by tenant', () => {
  assert.match(sql, /can_access_property/);
  assert.match(sql, /calendar_events_scoped_read/);
  assert.match(sql, /tenant-documents/);
  assert.match(sql, /storage\.foldername\(name\).*current_tenant_id/s);
});

test('provider settlement is service-role-only and replay-safe', () => {
  assert.match(sql, /settle_provider_payment/);
  assert.match(sql, /revoke all on function public\.settle_provider_payment/);
  assert.match(sql, /paid_transaction_id/);
  assert.match(sql, /webhook_events/);
});

test('unit balances are database-maintained from period statements and payments', () => {
  assert.match(balanceSql, /refresh_unit_financial_balance/);
  assert.match(balanceSql, /statement_total \+ correction_total - paid_total/);
  assert.match(balanceSql, /payment_ledger_refresh_balance/);
  assert.match(balanceSql, /statements_refresh_balance/);
  assert.match(balanceSql, /statement_batches_refresh_balances/);
  assert.match(periodBalanceSql, /properties_refresh_period_balances/);
  assert.match(balanceSql, /revoke insert, update on public\.units from authenticated/);
  assert.doesNotMatch(balanceSql, /grant update \([^)]*balance/);
  assert.match(immutablePaymentsSql, /payment_ledger_completed_immutable/);
  assert.match(immutablePaymentsSql, /Completed payments are immutable/);
});

# Atlas PM production launch

The application is designed to fail closed in production. Missing required backend configuration returns `503` from `/api/readiness`; optional providers remain unavailable and never report simulated success.

## 1. Database

Apply migrations `supabase_0001_initial_schema.sql` through `supabase_0017_immutable_completed_payments.sql` in order. Seed only the dedicated Anastassiadis dataset. Create Supabase Auth users and link `user_profiles.auth_user_id` to `auth.users.id`.

Financial balances are database-maintained. Never import or edit `units.balance` directly: issued statements, corrective batches and period-linked completed payments refresh it transactionally. After any data import, reconcile every unit against `statements`, `statement_batches` and `payment_ledger` before acceptance.

Verify RLS with one account for every role before importing real personal data. Never place the service-role key in a `VITE_` variable.
Populate `PROVISION_USERS_JSON`, run `npm run provision:users` once, then remove the value. This links strong Supabase Auth identities to the seeded profiles without shipping passwords in the frontend.

## 2. Required deployment variables

- `NODE_ENV=production`
- `VITE_DATA_MODE=supabase`
- `VITE_PRODUCT_MODE=single-tenant`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ORIGINS`, `VITE_APP_URL`, `API_PUBLIC_URL`
- `CRON_SECRET` (a new high-entropy value used only by the retry worker)
- `FILE_SCAN_API_URL`, `FILE_SCAN_API_KEY`
- `ALLOW_DEMO_API=false`

The Vercel project must be separate from the Anastassiadis corporate website.

## 3. Provider activation

- Viva: set all `VIVAWALLET_*` values, register `/api/webhooks/vivawallet/webhook`, make a sandbox payment and verify one ledger entry only.
- Email: verify the sending domain, then set `RESEND_API_KEY` and `EMAIL_FROM`.
- SMS: set the selected provider's compatible endpoint and `SMS_*` values.
- OCR: set `ANTHROPIC_API_KEY` and confirm allowed receipt MIME types.
- File security: connect a malware-scanning endpoint compatible with the documented multipart contract; uploads fail closed until it returns `{ "clean": true }`.
- AADE: set `AADE_*` values only after the accountant approves issuer, invoice type, classifications and cancellation data. Production transmission refuses an incomplete XML payload.

## 4. Release gate

Run `npm run check`, call `/api/readiness`, complete role-based UAT, perform a backup, rehearse restore in staging, deploy a preview, then promote the verified deployment. Roll back by promoting the previous Ready deployment.

`/api/readiness` must return HTTP `200` before promotion. A provider shown as optional may remain disabled, but its corresponding feature must not be included in the customer acceptance test until its sandbox/UAT has passed.

## 5. External approvals still required

- Accountant approval for AADE/myDATA semantics.
- Legal approval of privacy policy, terms, retention and processor agreements.
- DNS ownership for application and sending domains.
- Merchant/provider credentials and production webhook registration.

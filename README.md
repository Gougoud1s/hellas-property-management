# Hellas Property Management

Multi-tenant SaaS for Greek property management companies and property owners.

## Included modules

- Supabase authentication, tenant-scoped repositories and RLS schema
- Viva Wallet payment-link flow with a credential-free demo mode
- AADE myDATA period transmission workspace (type 13.1)
- Digital general assemblies, quorum tracking and owner voting
- AI-assisted Greek receipt extraction
- Owner self-service dashboard, payments and printable statements
- Greek/English application shell and installable PWA

## Current Mode

The app currently runs in `local-demo` mode, using browser storage and seeded mock data. The codebase also includes the first production backend boundary:

The commercial packaging is runtime-configurable without a fork:

- `VITE_PRODUCT_MODE="single-tenant"` locks login and navigation to Anastassiadis Group.
- `VITE_PRODUCT_MODE="multi-tenant"` enables the Atlas PM SaaS/platform surfaces.
- Tenant isolation remains enabled in both modes, so a future licensing decision does not require a data-model rewrite.

- Supabase/Postgres schema with tenant isolation and RLS: `supabase_0001_initial_schema.sql`
- Demo seed dataset: `supabase_seed_demo.sql`
- Frontend data contracts: `src/lib/backendContracts.ts`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo Logins

- `admin@hellaspm.gr` / `admin123`
- `staff@hellaspm.gr` / `staff123`
- `owner@example.gr` / `owner123`
- `resident@example.gr` / `resident123`

Single-tenant Anastassiadis demo accounts:

- Company admin: `demo@anastassiadis.com` / `demo123`
- Staff (Ilioupoli + Glyfada): `staff@anastassiadis.demo` / `staff123`
- Owner (Ilioupoli A1): `demo.owner1@example.gr` / `owner123`
- Resident/tenant (Ilioupoli A2): `resident@anastassiadis.demo` / `resident123`
- `demo@anastassiadis.com` / `demo123` — Anastassiadis Group tenant demo

## Environment

Copy `.env.example` to `.env.local`.

```bash
VITE_DATA_MODE="local-demo"
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
VITE_APP_URL="http://localhost:3000"
```

Use `VITE_DATA_MODE="supabase"` after configuring the Supabase project. Optional AADE, Anthropic, Resend and push credentials are documented in `.env.example`; blank credentials keep integrations in an explicitly labelled demo mode.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase_0001_initial_schema.sql` in the SQL editor.
3. Run `supabase_0002_tenant_branding.sql`.
4. Run `supabase_0003_operations_upgrade.sql`.
5. Run `supabase_0004_atomic_payments.sql`.
6. Run migrations `supabase_0005_corrective_statements.sql` through `supabase_0013_private_branding.sql` in order.
7. For the dedicated installation, run `supabase_seed_anastassiadis.sql` only.
8. Provision and link Supabase Auth users with `npm run provision:users`.

The RLS policies enforce:

- Company users read/manage records inside their own tenant.
- Owners/residents only read properties connected through `user_unit_access`.
- Owners/residents only read their own units, statements and payment ledger entries.
- Documents respect visibility: company-only, owners, or all.
- Bank reconciliation remains company-only.

## API server

Run `npm run server` beside `npm run dev`. The frontend proxies `/api` to port `3001`.

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
3. Run `supabase_seed_demo.sql`.
4. Create matching Supabase Auth users for the demo emails.
5. Update `public.user_profiles.auth_user_id` with each `auth.users.id`.

The RLS policies enforce:

- Company users read/manage records inside their own tenant.
- Owners/residents only read properties connected through `user_unit_access`.
- Owners/residents only read their own units, statements and payment ledger entries.
- Documents respect visibility: company-only, owners, or all.
- Bank reconciliation remains company-only.

## API server

Run `npm run server` beside `npm run dev`. The frontend proxies `/api` to port `3001`.

# Hellas Property Management

Multi-tenant SaaS prototype for Greek property management companies.

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



Use `VITE_DATA_MODE="supabase"` after wiring the Supabase client implementation.

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

## Next Backend Task

Install `@supabase/supabase-js` and implement a `SupabaseTenantDataRepository` behind `src/lib/backendContracts.ts`, then switch `App.tsx` from direct local state loading to repository-backed snapshot loading.

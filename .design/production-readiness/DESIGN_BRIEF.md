# Atlas PM Production Readiness Brief

Date: 2026-07-19

## Objective

Turn the Anastassiadis demo into a credential-ready production application. The deployed application must fail closed when required production configuration is absent, preserve tenant isolation and financial history, store user files privately, and expose clear operational readiness diagnostics.

## Product posture

- Dedicated Anastassiadis installation first, while retaining the tenant-aware data model.
- No platform subscription or platform-administration screens for tenant users.
- External services remain disabled until credentials are supplied; production must never silently fall back to simulated success.
- Issued financial records are immutable. Corrections create explicit, auditable deltas.

## Required workflows

1. Expense → verification → allocation → issue → notice → payment → reconciliation.
2. Maintenance issue → technician assignment → resolution → draft expense.
3. New unit → participation date → draft calculation or corrective issue.
4. Issued notice → calendar reminder → payment → ledger update.

## Acceptance criteria

- Supabase authentication and RLS are authoritative in production.
- API requests are authenticated and resource-scoped.
- Files use private object storage and signed URLs.
- Statement issuance is immutable and idempotent, with an audit trail.
- Unit participation supports start/end dates and full/prorated charging.
- Provider adapters are validated at startup and fail closed outside demo mode.
- CI runs typecheck, unit/integration tests, and production build.
- A readiness endpoint and launch runbook identify only credentials/DNS as remaining external inputs.


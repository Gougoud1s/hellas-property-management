# Build Tasks: Atlas PM Production Readiness

Generated from: `.design/production-readiness/DESIGN_BRIEF.md`
Date: 2026-07-19

## Foundation

- [x] **Fail-closed production configuration**: Validate runtime mode, origins, secrets and provider readiness; production cannot use demo authentication or simulated integrations. _Modifies: server configuration, API shell and frontend environment boundary._
- [x] **Authoritative access context**: Resolve each authenticated Supabase user to an active profile, tenant, role, property access and unit access for every API request. _Modifies: auth middleware and all API routes._
- [x] **Deployable API boundary**: Export the Express app for serverless hosting, add trusted CORS/security headers and health/readiness endpoints. _Modifies: server/index; creates Vercel entry/config._

## Financial integrity

- [x] **Immutable statement snapshots**: Persist unit, rule and expense snapshots in each issuance batch and prevent mutation of issued history. _Modifies: statement migrations and repository._
- [x] **Idempotent issuance and payments**: Require idempotency keys and unique provider/payment references for all money-changing operations. _Modifies: database functions, payment routes and repositories._
- [x] **Auditable corrections**: Record actor, reason, before/after metadata and supplementary deltas for corrections. _Creates: audit events and policies; modifies statement workflow._
- [x] **Unit participation periods**: Store participation start/end dates and full/prorated charging policy; include eligible units in draft calculations and corrections. _Modifies: unit form, calculation engine, repository and schema._

## Files and notifications

- [x] **Private file workflow**: Upload receipts, documents and logos to tenant-scoped private buckets with signed downloads and validation. _Modifies: document/expense/branding views and repository; creates storage policies._
- [x] **Persistent calendar subscriptions**: Store hashed, revocable feed tokens and generate reminders from issued notices. _Modifies: calendar API/view; creates schema/policies._
- [x] **Credential-ready provider adapters**: Implement fail-closed Viva, email, SMS, OCR and myDATA adapters with retries/status persistence. _Modifies: API integrations; creates provider interfaces._

## Security and operations

- [x] **Abuse and replay protection**: Add request limits, webhook replay prevention, payload limits and structured request IDs. _Modifies: API middleware and webhook storage._
- [x] **Operational readiness**: Add readiness diagnostics, structured logging hooks, backup/restore and secret-rotation runbooks. _Creates: health checks and operations documentation._
- [x] **CI/CD gate**: Run typecheck, tests and production build before deployment; document staging/promotion/rollback. _Creates: GitHub workflow and Vercel config._

## Verification

- [x] **Role and tenant isolation tests**: Verify company admin, staff, owner, resident and technician boundaries. _Modifies: test suite._
- [x] **Full workflow tests**: Verify the four critical workflows including retries, duplicate requests, corrections and prorating. _Modifies: test suite._
- [x] **Credential-only launch audit**: Confirm the remaining checklist contains external credentials, DNS and professional approvals only. _Creates: production launch runbook._

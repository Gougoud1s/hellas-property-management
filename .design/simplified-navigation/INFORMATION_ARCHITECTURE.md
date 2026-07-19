# Information Architecture: Anastassiadis Operations

## Site Map

- Dashboard — daily status and guided monthly workflow
- Properties — building selection and building records
- Common expenses — calculation, issuance and notices
- Maintenance — technical issues and resulting draft expenses
- Finance — payments and bank reconciliation
- More tools
  - Users and access
  - Units
  - Expenses
  - Distribution rules
  - Invoicing / myDATA
  - Assemblies
  - Calendar
  - Documents
- Profile and settings

## Navigation Model

- Primary navigation contains the five most frequent company tasks.
- Secondary navigation is collapsed under “More tools”.
- Profile remains a utility action at the bottom of the sidebar.
- Owner and resident navigation remains role-specific and is not forced into the company workflow.

## Content Hierarchy

### Company Dashboard

1. Selected property and current period
2. Next recommended action
3. Monthly workflow progress
4. Blockers and missing configuration

### Common Expenses

1. Period status
2. Verified expenses and allocation
3. Issue statements
4. Notice delivery status

## Critical User Flow

1. Register expenses.
2. Verify receipts.
3. Resolve missing distribution rules.
4. Review and issue common expenses.
5. Generate and deliver notices.
6. Reconcile payments.

## Naming Conventions

| Concept | UI label |
|---|---|
| Portfolio entity | Πολυκατοικία |
| Monthly charge cycle | Περίοδος κοινοχρήστων |
| Unissued cycle | Προετοιμασία |
| Issued cycle | Εκδόθηκε |
| Payment matching | Πληρωμές & τραπεζική συμφωνία |

## Component Reuse Map

| Component | Used on |
|---|---|
| Sidebar | All authenticated views |
| CompanyDashboardView | Company administrator and staff landing page |
| Property selector | Header and all property-scoped workflows |

## Content Growth Plan

Growing operational records remain inside their specialist modules with search and filtering. The primary navigation remains capped at five items regardless of future modules.

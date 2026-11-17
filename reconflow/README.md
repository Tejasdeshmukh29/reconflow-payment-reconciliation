# ReconFlow — Payment Reconciliation

ReconFlow is a browser-based assessment demo that compares a payment platform transaction ledger with bank settlement records, classifies discrepancies, and exports corrected working datasets.

## Features
- Deterministic sample data with timing, rounding, duplicate, and orphan-refund scenarios.
- CSV import with required-header validation.
- Transaction search and source data preview.
- Integer-paise financial comparisons.
- Reconciliation and discrepancy register.
- Safe duplicate exclusion while preserving raw inputs.
- Cross-month settlement classification.
- Separate corrected CSV and reconciliation report downloads.
- Audit trail and documented assumptions.
- Responsive white-and-green interface.

## Run locally
```bash
npm install
npm run dev
```

## Tests and production build
```bash
npm test
npm run build
```

## Deploy to Vercel
1. Push this project to a Git repository.
2. Import the repository in Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy. No environment variables or backend services are required.

## Data model
Platform CSV required columns:
`transaction_id, customer_id, transaction_date, transaction_amount, transaction_type, payment_status, original_transaction_id, currency`

Bank CSV required columns:
`settlement_id, transaction_id, settlement_date, gross_amount, settlement_fee, net_amount, settlement_status, currency`

## Important reconciliation policy
- Transaction reference is the primary matching key; amount equality alone is never sufficient.
- T+1/T+2 cross-month settlement is shown as a timing item.
- Currency is converted to integer paise for arithmetic.
- Duplicate settlement rows are excluded from corrected totals, not erased from raw data.
- Orphan refunds and missing settlements remain investigation items.
- This demo does not fabricate settlements or auto-create accounting journal entries.

## Assessment submission checklist
- [ ] Full brainstorming thread (export actual conversation; do not fabricate).
- [ ] Distilled and raw prompts (`docs/`).
- [ ] Full coding-tool execution thread (export actual thread, including wrong turns).
- [ ] Test cases and test results (`docs/test-cases.md`, `src/tests/`).
- [ ] Deployed Vercel URL (add only after successful deployment).
- [ ] Source ZIP.
- [ ] Demo video (record actual walkthrough).
- [ ] Three-sentence production limitations (`docs/production-limitations.md`).

## Scope and limitations
This is an assessment-grade demonstration, not a production accounting system. See `docs/production-limitations.md`.

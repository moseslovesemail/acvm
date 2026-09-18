# ACVM Signal

**New Zealand agricultural product regulatory intelligence.**

ACVM Signal turns public Ministry for Primary Industries (MPI) ACVM register data into a structured commercial monitoring layer for veterinary medicines, agricultural chemicals and vertebrate toxic agents.

## Product

The MVP provides:

- **Signal Feed** — new registrations and material changes detected between MPI snapshots.
- **Product Explorer** — search by registration number, trade name, registrant and active ingredient.
- **Competitor Monitor foundation** — normalized registrant portfolios and event history.
- **Market Entry foundation** — inspect existing products, ingredients and registrants before deeper regulatory research.

## Architecture

```
MPI ACVM register
      |
      v
CSV discovery + tolerant ingestion
      |
      v
Normalization by registration number
      |
      v
PostgreSQL current state + sync history
      |
      +--> snapshot diff --> regulatory events
      |
      +--> Next.js dashboard / product explorer
      |
      +--> Stripe subscription checkout
```

The Railway deployment uses three services:

1. **web** — Next.js application.
2. **Postgres** — persistent normalized products, events and sync runs.
3. **sync** — scheduled MPI ingestion/change-detection job.

## Verified baseline

The first production import on 19 September 2026 parsed **51,792 source rows** into **3,041 distinct ACVM products**. A repeat import produced zero inserts, updates or events, confirming the baseline/diff process is idempotent for an unchanged source snapshot.

Malformed source CSV records are skipped rather than allowing one bad source row to abort the whole register import.

## Routes

- `/` — public product/brand landing page
- `/dashboard` — regulatory signal dashboard
- `/products` — searchable ACVM product explorer
- `/api/health` — service health endpoint
- `/api/checkout` — Stripe subscription checkout
- `/success` — checkout success page

## Environment variables

```
DATABASE_URL=
PORT=3000

NEXT_PUBLIC_APP_URL=
STRIPE_SECRET_KEY=
STRIPE_PRICE_WATCH=
STRIPE_PRICE_INTELLIGENCE=
STRIPE_PRICE_PRO=
```

Stripe checkout is implemented but requires live Stripe product Price IDs and a secret key to accept subscriptions.

## Local development

```bash
npm install
npm run dev
```

Run a source sync with:

```bash
npm run sync
```

## Data provenance and attribution

The application dynamically discovers the current MPI **Entire register** CSV rather than hard-coding a transient download URL. Raw source rows are retained alongside normalized product records to preserve provenance.

This work is based on/includes MPI data which is licensed by Ministry for Primary Industries (MPI) for re-use under the Creative Commons Attribution 4.0 International licence.

ACVM Signal is an independent intelligence product and is not affiliated with or endorsed by MPI. Regulatory information should be checked against the official source before relying on it for regulatory decisions.

## Next product layers

Planned extensions include first-class registration conditions, cancellations and suspensions, label/pharmacovigilance changes, RVM seller data, manufacturer intelligence, customer watchlists, email alerts, account authentication and Stripe webhook-based entitlements.

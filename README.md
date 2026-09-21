# ACVM Signal

**New Zealand agricultural product regulatory intelligence.**

ACVM Signal turns public New Zealand regulatory data into a structured commercial monitoring layer for veterinary medicines, agricultural chemicals and vertebrate toxic agents.

## Product

The current production build provides:

- **ACVM Signal Feed** — new registrations, removals and material changes detected between MPI ACVM snapshots.
- **Product Explorer** — search by registration number, trade name, registrant and active ingredient.
- **Registrant & Ingredient Intelligence** — current portfolios, competitive sets and regulatory timelines.
- **Early Warning** — upstream EPA hazardous-substance applications and MPI maximum-residue-level activity kept separate from downstream ACVM registration events.
- **Watchlists** — monitor products, registrants and active ingredients.
- **Account & subscription foundation** — account authentication, Stripe Checkout integration and webhook-based billing fields.
- **Customer alert worker** — ACVM and upstream watchlist matching; email delivery remains inactive until Resend credentials are configured.

## Architecture

```
MPI ACVM register
      |
      v
Railway ACVM sync
      |
      v
PostgreSQL current state + ACVM event history
      |
      +------------------------------+
                                     |
EPA current application pipeline     |
MPI MRL consultations                |
      |                              |
      v                              |
GitHub Actions public-source capture |
      |                              |
      v                              |
data/upstream-signals.json           |
      |                              |
      v                              |
Railway Early Warning ingester ------+
      |
      v
PostgreSQL regulatory_signals
      |
      +--> /early-warning
      +--> ingredient timelines
      +--> customer watchlists
      +--> alert matching

Next.js web app
      |
      +--> dashboard / products / profiles / watchlists
      +--> Stripe subscription checkout + webhook
```

### Why GitHub Actions captures the upstream sources

EPA and MPI public pages return a small edge/anti-bot response to Railway-hosted requests. GitHub Actions can retrieve the same public pages successfully, so source acquisition is separated from the product runtime:

1. GitHub Actions captures only the structured regulatory fields required by ACVM Signal.
2. It writes a small versioned JSON snapshot to `data/upstream-signals.json`.
3. A snapshot commit automatically triggers the Railway `early-warning` service.
4. Railway enriches the snapshot against the live ACVM ingredient dictionary and upserts it into PostgreSQL.

The worker is event-driven rather than independently scheduled, avoiding timing drift between the source capture and ingestion.

## Production services

- **web** — Next.js application.
- **Postgres** — normalized products, users, watchlists, ACVM events and upstream regulatory signals.
- **sync** — scheduled MPI ACVM register ingestion/change detection.
- **early-warning** — one-shot snapshot ingester triggered by upstream snapshot commits.
- **alerts** — scheduled watchlist-email worker; safe no-op until Resend is configured.
- **typecheck** — deployment validation service used to run `tsc --noEmit`.

## Verified production data

### ACVM baseline

The first production import on 19 September 2026 parsed **51,792 valid source rows** into **3,041 distinct ACVM products**. A repeat import produced zero inserts, updates or events, confirming the baseline/diff process is idempotent for an unchanged snapshot.

Malformed source CSV records are skipped rather than allowing one bad source row to abort the whole register import.

### Early Warning baseline

Production validation on 21 September 2026 confirmed:

- **798** distinct known ACVM ingredient values available for enrichment.
- **8 EPA** current Category C application signals.
- **8 MPI MRL** regulatory activity signals.
- **16 stored upstream signals total** after deduplication.
- A fresh GitHub Actions capture independently reproduced the same **8 + 8** source set.

The EPA and MPI layers are intentionally labelled as upstream regulatory evidence. They are not treated as proof of ACVM registration, approval or market launch.

## Current source coverage

### MPI ACVM register

Used for the current registered-product state, normalized product search, registrant portfolios and snapshot-to-snapshot ACVM change detection.

### EPA hazardous-substance pipeline

Uses EPA's public current Category C application table, including fields such as:

- application number;
- product/short name;
- applicant;
- lodged date;
- current status; and
- next step.

### MPI MRL activity

Monitors MPI maximum-residue-level consultation activity and creates ingredient-level regulatory signals from proposed entries or amendments.

## Routes

- `/` — public landing page
- `/dashboard` — ACVM regulatory signal dashboard
- `/early-warning` — upstream regulatory intelligence
- `/products` — searchable ACVM product explorer
- `/products/[registration]` — product profile
- `/registrants/[slug]` — registrant portfolio
- `/ingredients/[slug]` — ingredient competitive set + upstream timeline
- `/watchlist` — customer monitored entities and matching ACVM/upstream signals
- `/account` — account/subscription view
- `/api/health` — service health endpoint
- `/api/checkout` — Stripe subscription checkout
- `/api/stripe/webhook` — Stripe billing webhook
- `/success` — checkout success page

## Automation

Current sequence:

- Railway `sync`: daily ACVM register ingestion.
- GitHub Actions: daily upstream EPA/MPI capture at `17 15 * * *` UTC.
- Snapshot commit: immediately triggers the Railway Early Warning ingester.
- Railway `alerts`: daily customer digest worker at `0 20 * * *` UTC.

The GitHub capture is deliberately scheduled well before the customer-alert digest to provide buffer for delayed GitHub scheduled runs.

## Environment variables

### Web

```
DATABASE_URL=
PORT=3000
NEXT_PUBLIC_APP_URL=
AUTH_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_WATCH=
STRIPE_PRICE_INTELLIGENCE=
STRIPE_PRICE_PRO=
```

### Alerts

```
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=
ALERT_FROM_EMAIL=
```

Stripe checkout/webhook code is implemented, but payment-live status depends on valid Stripe production credentials and Price IDs.

Email alerts are implemented but do not send until a Resend API key and verified sender address are configured.

## Local development

```bash
npm install
npm run dev
```

Run individual workers with:

```bash
npm run sync
npm run snapshot-upstream
npm run early-warning
npm run alerts
npm run typecheck
```

## Data provenance and attribution

The ACVM importer dynamically discovers the current MPI **Entire register** CSV rather than hard-coding a transient download URL. Raw ACVM source rows are retained alongside normalized product records.

Upstream regulatory snapshots retain their official source URL, external application/consultation identifier, source stage and structured raw fields.

This work is based on/includes MPI data which is licensed by Ministry for Primary Industries (MPI) for re-use under the Creative Commons Attribution 4.0 International licence.

ACVM Signal is an independent intelligence product and is not affiliated with or endorsed by MPI or EPA. Regulatory information should be checked against the official source before relying on it for regulatory decisions.

## Next product layer

The highest-value next extension is **regulatory trajectory history**: preserve changes to EPA status/next-step and MRL consultation state as timestamped events instead of only keeping the current upstream record. That would enable signals such as:

- application moved from assessment to public consultation;
- EPA next-step changed;
- MRL consultation opened/closed/updated;
- active ingredient gained a second independent upstream signal;
- new entrant appears before ACVM registration.

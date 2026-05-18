# Event Wallet POC

A full-stack proof of concept for a closed-loop prepaid wallet used at event bars. Attendees preload money, show a QR wallet, bartenders deduct purchases, and organizers track prepaid cash flow and bar analytics.

## Stack

- Next.js 16 app router with TypeScript and Tailwind CSS
- Supabase Postgres, Auth, Row Level Security, and RPC functions
- Stripe Checkout Sessions in test mode for top-ups
- Stripe webhook confirmation before wallet balances increase
- QR wallet generation with `qrcode`
- Recharts dashboard analytics

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The app runs with mock data when Supabase or Stripe environment variables are missing. This makes the POC browsable before infrastructure is configured.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/001_initial_schema.sql` in the Supabase SQL editor or through the Supabase CLI.
3. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into `.env.local`.
4. Run:

```bash
npm run seed
```

Seed users:

- `attendee@example.com` / `password123`
- `bartender@example.com` / `password123`
- `organizer@example.com` / `password123`

Event code: `NEON-2026`

## Stripe Test Mode

1. Use a Stripe test mode secret key for `STRIPE_SECRET_KEY`.
2. Create a local webhook listener:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.
4. Use Stripe test cards in Checkout.

Top-up flow:

- `/api/stripe/create-checkout-session` creates a new Checkout Session per payment attempt.
- The app records the session in `stripe_payments` with status `created`.
- `/api/stripe/webhook` listens for `checkout.session.completed`.
- Only the webhook calls `confirm_wallet_topup`, which increments the wallet balance and inserts the `topup` transaction.

Primary references:

- Stripe Checkout Sessions API: https://docs.stripe.com/api/checkout/sessions/create
- Stripe testing and sandbox mode: https://docs.stripe.com/testing
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

## Important App Routes

- `/login`
- `/attendee/events`
- `/attendee/wallet/[eventId]`
- `/attendee/topup/[eventId]`
- `/bartender`
- `/bartender/checkout/[eventId]`
- `/organizer/dashboard`
- `/organizer/events/[eventId]`
- `/organizer/events/[eventId]/menu`
- `/organizer/events/[eventId]/transactions`

## API Routes

- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/webhook`
- `POST /api/purchase`
- `GET /api/dashboard/[eventId]`
- `GET /api/export-transactions/[eventId]`

## Balance Safety

- Money is stored as integer cents.
- `wallets.balance_cents` has a database check constraint preventing negative balances.
- Purchases run through `deduct_wallet_purchase`, which locks the wallet row with `for update`, computes menu prices server-side, rejects insufficient balance, deducts, and records purchase items in one database transaction.
- Stripe top-ups are idempotent through `stripe_session_id` and only confirmed by webhook.

## Production TODO

- Stored-value / prepaid balance legal review
- Refund policy and real refund workflow
- KYC/payment compliance
- Offline mode for weak internet
- NFC/RFID support
- Fraud detection and velocity checks
- Age verification where legally required
- Replace POC login/role selection with complete RBAC onboarding
- Add authenticated server-side route guards and cookie-based Supabase SSR sessions
- Add end-to-end tests for webhook idempotency and concurrent purchase deductions

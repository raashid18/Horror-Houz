# Horror Houz — Ticket Booking Website

A mobile-first ticket booking site for the "Horror Houz" attraction. ₹80/ticket, QR-driven customer journey, Razorpay payments, Supabase-backed tickets, PDF download.

## Status: Live in production ✅

All 6 phases are complete and deployed. Full loop confirmed working: scan QR → book → pay → ticket created in Supabase → PDF with QR → scan that QR → verify page confirms it's valid.

### Post-launch: Cash payment removed

Online (Razorpay) is now the only payment method. Changes:

- Removed the Online/Cash choice from the booking modal — "Choose Payment Method" became a simple "Confirm & Pay" step, since there's no longer a choice to make.
- **Deleted `api/create-cash-ticket.js` entirely**, not just its UI. Leaving that endpoint live while removing the button would have meant anyone who found the URL could still POST to it directly and get a free confirmed ticket with no payment — removing the frontend path alone isn't enough for something like this.
- Removed the now-dead `.payment-options` CSS and `handleCashBooking()` JS.
- Left the database's `payment_method` check constraint as-is (still technically allows `'CASH'` as a value) — existing test rows from earlier aren't affected either way, and nothing in the app can insert one anymore now that the endpoint is gone. Tightening the constraint itself is optional; see below if you want it anyway.

<details>
<summary>Optional: tighten the database constraint to match (only if you want CASH rejected at the DB level too)</summary>

Run this in Supabase's SQL Editor. It's safe to run — it doesn't touch existing rows, only what's allowed to be inserted going forward:

```sql
alter table tickets drop constraint tickets_payment_method_check;
alter table tickets add constraint tickets_payment_method_check
  check (payment_method in ('ONLINE'));
```

</details>

## Earlier phase history

The sections below are the original phase-by-phase build log — left as-is for reference, even though Cash is no longer part of the live app.

## Status: Phase 5 — Public verify page ✅

**Phases 1–4** (frontend, Supabase + cash tickets, Razorpay, QR + PDF) are done.

What Phase 5 adds:

- `api/verify/[token].js` — **GET**, public lookup by `qr_token` (not `ticket_number` — see the note in the Phase 4 section above). Returns only `ticket_number` and `ticket_status`, nothing else — this endpoint is reachable by literally anyone who scans a QR, including a stranger who finds a dropped ticket, so it stays as minimal as possible.
- `verify.html` + `js/verify.js` — the actual page a scanned QR lands on. Shows a themed loading state, then either a **VALID TICKET** or **INVALID TICKET** state, matching the brief's mockups. A separate network-error state (`THE CONNECTION DISAPPEARED…`) is shown if the fetch itself fails, distinct from a genuinely-not-found ticket.
- `vercel.json` — adds a rewrite so `/verify/:token` serves `verify.html` while keeping that URL in the browser's address bar. The token is read from `window.location.pathname` client-side, not a query string.

**No admin/scan-to-mark-used functionality** — deliberately, per the brief. This page only answers "is this ticket real," nothing else.

What's still missing: production deployment itself (Phase 6) — right now everything only runs via `vercel dev` locally.

## Run it locally

```bash
npm install -g vercel   # one-time
cd horror-houz
npm install
cp .env.example .env
# Fill in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — see SUPABASE_SETUP.md
# Fill in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — see RAZORPAY_SETUP.md
vercel dev
```

Test at 360px, 390px, 412px, 768px, 1024px, 1440px widths (dev tools device toolbar).

## What to check in Phase 5

No new external setup needed.

1. Book any ticket (Cash or Online) and download its PDF.
2. Get that ticket's `qr_token` — either scan the QR in the PDF with your phone (if you can read the URL it opens without actually navigating, e.g. via a QR-reading app rather than your camera's auto-open), or just open Supabase's Table Editor and copy the `qr_token` column value for that row directly.
3. With `vercel dev` running, open `http://localhost:3000/verify/<that qr_token>` in your browser. You should see "Checking Ticket…" briefly, then **VALID TICKET** with the correct ticket number and status.
4. Try `http://localhost:3000/verify/not-a-real-token` — should show **INVALID TICKET**, not a crash or a blank page.
5. Confirm the URL in your browser's address bar stays as `/verify/<token>` the whole time (not `/verify.html?token=...`) — that's the rewrite working correctly.
6. Turn off `vercel dev` mid-request (or throttle/disconnect network) and reload a verify page — you should see the "THE CONNECTION DISAPPEARED…" state, not a generic browser error page.

## Coming up

- **Phase 6** — Deploy: GitHub → Vercel → Supabase → Razorpay production env vars, and set `PUBLIC_APP_URL` for real so QR codes printed on posters actually resolve to your live domain

## Project structure

```
horror-houz/
├── index.html
├── verify.html
├── vercel.json
├── css/style.css
├── js/
│   ├── app.js
│   ├── payment.js
│   └── verify.js
├── lib/
│   ├── supabaseAdmin.js
│   ├── razorpay.js
│   ├── ticketNumber.js
│   ├── validate.js
│   ├── qr.js
│   ├── verifyUrl.js
│   └── pdfTicket.js
├── api/
│   ├── create-order.js
│   ├── verify-payment.js
│   ├── verify/[token].js
│   └── ticket/
│       ├── [ticketNumber].js
│       └── [ticketNumber]/pdf.js
├── supabase/schema.sql
├── SUPABASE_SETUP.md
├── RAZORPAY_SETUP.md
├── public/images/  (empty — add hero/background assets here)
├── .env.example
├── package.json
└── README.md
```
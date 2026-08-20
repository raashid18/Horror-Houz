# Horror Houz — Ticket Booking Website

A mobile-first ticket booking site for the "Horror Houz" attraction. ₹80/ticket, QR-driven customer journey, Razorpay payments, Supabase-backed tickets, PDF download.

## Status: Phase 4 — QR code + PDF ticket ✅

**Phases 1–3** (frontend, Supabase + cash tickets, Razorpay) are done.

What Phase 4 adds:

- `lib/qr.js` — generates the ticket's QR as a PNG buffer via the `qrcode` package. Deliberately kept black-on-white regardless of the site's red/black theme — contrast matters more than branding for something a scanner has to read.
- `lib/verifyUrl.js` — builds the `/verify/{qr_token}` URL encoded in the QR. Uses `PUBLIC_APP_URL` when set (needed for anything printed on posters/banners, since Vercel preview URLs change per deploy); falls back to the request's own host for local dev.
- `lib/pdfTicket.js` — renders the actual ticket PDF with `pdfkit`: dark background, red/white type, dashed "ticket stub" dividers, the QR on a white plate so it stays scannable. Uses PDFKit's built-in Helvetica/Courier fonts rather than bundling Bebas Neue/Cinzel as font files — swappable later via `doc.registerFont()` if you want an exact match to the site's type.
- `api/ticket/[ticketNumber]/pdf.js` — **GET**, looks the ticket up, generates the QR + PDF on the fly, and streams it back with `Content-Disposition: attachment; filename="Horror-Houz-<ticket_number>.pdf"`.
- `js/app.js` — "Download Ticket" now really downloads. Shows "Preparing Your Ticket…" while it fetches, a themed inline error if it fails, and restores the button either way.

**Important — QR encodes `qr_token`, not `ticket_number`.** The ticket number stays printed as human-readable text for staff to read/type manually; the scannable code uses the random `qr_token` instead, since it can't be guessed the way a date-plus-6-characters ticket number theoretically could. **Phase 5's verify page needs to look tickets up by `qr_token`, not `ticket_number`**, to match.

What's still missing: the public `/verify/{token}` page itself (Phase 5) — right now scanning the QR will 404, since that route doesn't exist yet.

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

## What to check in Phase 4

No new external setup needed — `qrcode` and `pdfkit` are plain npm packages, just `npm install` picks them up.

1. Book a ticket (either Cash or Online) through to the success screen.
2. Click **Download Ticket** — button should read "Preparing Your Ticket…" briefly, then a PDF named `Horror-Houz-<ticket_number>.pdf` should download.
3. Open the PDF — confirm it shows the correct ticket number, customer name, quantity, amount, payment method, status, and booking date, plus a QR code on a white plate.
4. Scan the QR with your phone camera — since `PUBLIC_APP_URL` probably isn't set to a real domain yet, it'll likely point at `localhost` or a preview URL and won't resolve to anything real. That's expected until Phase 5 exists and you deploy with a real domain in Phase 6 — for now just confirm the QR *scans cleanly* (readable, not garbled) rather than expecting it to load a working page.
5. Hit `/api/ticket/<a-real-ticket-number>/pdf` directly in the browser — should download the same PDF.
6. Hit `/api/ticket/does-not-exist/pdf` — should get a clean 404 JSON error, not a crash or a broken PDF.
7. On a slow/throttled connection (dev tools network throttling), confirm the "Preparing Your Ticket…" state actually shows and the button re-enables if the request fails.

## Coming up

- **Phase 5** — Public `/verify/{qr_token}` page (valid/invalid states), fuller error handling
- **Phase 6** — Deploy: GitHub → Vercel → Supabase → Razorpay production env vars, and set `PUBLIC_APP_URL` for real so QR codes actually resolve

## Project structure

```
horror-houz/
├── index.html
├── css/style.css
├── js/
│   ├── app.js
│   └── payment.js
├── lib/
│   ├── supabaseAdmin.js
│   ├── razorpay.js
│   ├── ticketNumber.js
│   ├── validate.js
│   ├── qr.js
│   ├── verifyUrl.js
│   └── pdfTicket.js
├── api/
│   ├── create-cash-ticket.js
│   ├── create-order.js
│   ├── verify-payment.js
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

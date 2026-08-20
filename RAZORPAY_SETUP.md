# Razorpay Setup — Horror Houz

## 1. Create an account

Sign up at [razorpay.com](https://razorpay.com) if you don't have an account. New accounts start in **Test Mode** by default — that's what you want for now.

## 2. Get your test keys

In the Razorpay Dashboard: **Settings → API Keys → Generate Test Key**.

You'll get two values:

- `Key Id` (starts with `rzp_test_...`) → this is `RAZORPAY_KEY_ID`. It's public — safe to send to the browser, and `/api/create-order` does exactly that so Checkout can open.
- `Key Secret` → this is `RAZORPAY_KEY_SECRET`. **Never** put this in frontend code. It only ever lives in Vercel's environment variables and is read by `lib/razorpay.js` and `api/verify-payment.js`, both server-side.

## 3. Add them to your environment

In `.env` (create it from `.env.example` if you haven't already):

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

Add the same two variables in Vercel under **Project → Settings → Environment Variables** when you deploy.

## 4. Test a payment

With `vercel dev` running, go through the booking flow, choose **Online**, and complete checkout using Razorpay's test-mode payment methods (test cards, test UPI, etc. — the exact numbers to use are shown inside the Razorpay Checkout widget itself in test mode, and are also listed in Razorpay's own documentation, since these can change).

After a successful test payment:

1. Confirm the modal shows the success screen with a real `ticket_number`.
2. Check Supabase's **Table Editor** — a new row should exist with `payment_method = ONLINE`, `payment_status = PAID`, and both `razorpay_order_id` and `razorpay_payment_id` populated.
3. Try refreshing right after a successful payment, or triggering the same `handler` twice — you should get the *same* ticket back, not a duplicate row. That's the idempotency check in `verify-payment.js` doing its job.
4. Close the Checkout widget without paying (click outside it or the X) — you should land back on the payment step with no error shown, not stuck on a spinner.
5. Trigger a failed payment (Razorpay's test mode has specific test values documented in their dashboard for this) — you should see the horror-themed error message, not a raw error page.

## Going live later

Switching `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` to your live keys (`rzp_live_...`) after Razorpay activates your account is the only change needed — nothing in the code is test-mode-specific.

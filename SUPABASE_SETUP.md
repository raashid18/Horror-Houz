# Supabase Setup — Horror Houz

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) → **New Project**.
2. Pick any name/region, set a database password (you won't need it directly — we use the service role key).
3. Wait for provisioning to finish (~2 min).

## 2. Run the schema

1. In the Supabase dashboard, open **SQL Editor**.
2. Paste the contents of `supabase/schema.sql` (in this repo) and run it.
3. Confirm under **Table Editor** that a `tickets` table now exists with RLS enabled and no policies.

## 3. Get your keys

Go to **Project Settings → API**:

- `Project URL` → this is `SUPABASE_URL`
- `service_role` secret key (NOT the `anon` key) → this is `SUPABASE_SERVICE_ROLE_KEY`

## 4. Add them to your environment

Copy `.env.example` to `.env` locally, and fill in:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TICKET_PRICE=80
```

When you deploy to Vercel, add the same variables under **Project → Settings → Environment Variables** — never commit `.env`.

## Why the service role key is safe here

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security and must **never** reach the browser. It's only read inside `lib/supabaseAdmin.js`, which is only ever imported by files under `/api` — code that runs on Vercel's server, not in the customer's browser. The frontend (`js/app.js`) never sees it and never will.

-- =========================================================
-- Horror Houz — tickets table
-- Run this once in the Supabase SQL Editor for your project.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists tickets (
  id                   uuid primary key default gen_random_uuid(),
  ticket_number        text not null unique,
  customer_name        text not null,
  customer_mobile      text not null,
  quantity             integer not null check (quantity > 0 and quantity <= 10),
  amount               integer not null check (amount > 0),
  payment_method       text not null check (payment_method in ('ONLINE', 'CASH')),
  payment_status       text not null,
  ticket_status        text not null default 'CONFIRMED' check (ticket_status in ('CONFIRMED', 'CANCELLED')),
  razorpay_order_id    text,
  razorpay_payment_id  text unique,
  qr_token             text not null unique,
  created_at           timestamptz not null default now()
);

create index if not exists idx_tickets_ticket_number     on tickets (ticket_number);
create index if not exists idx_tickets_razorpay_order_id on tickets (razorpay_order_id);
create index if not exists idx_tickets_created_at        on tickets (created_at desc);

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------
-- All reads/writes go through Vercel serverless functions using
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely.
-- We enable RLS and deliberately define NO policies, so any
-- request using the public anon key (e.g. if a key ever leaked
-- into the frontend by mistake) gets zero rows, zero access.
alter table tickets enable row level security;

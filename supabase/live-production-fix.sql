-- Run this in the Supabase SQL editor for the live project connected to your domain.
-- It is safe to run more than once.

alter table if exists public.users add column if not exists age integer;
alter table if exists public.users add column if not exists activity_level text not null default 'moderate';
alter table if exists public.users add column if not exists lifestyle_description text not null default '';
alter table if exists public.users add column if not exists health_notes text not null default '';
alter table if exists public.users add column if not exists profile_image text not null default '';
alter table if exists public.users add column if not exists updated_at timestamptz not null default now();
alter table if exists public.users add column if not exists balance numeric not null default 0;
alter table if exists public.users add column if not exists wallet_balance numeric not null default 0;
alter table if exists public.users add column if not exists total_earned numeric not null default 0;
alter table if exists public.users add column if not exists total_spent numeric not null default 0;
alter table if exists public.users add column if not exists current_streak integer not null default 0;
alter table if exists public.users add column if not exists is_premium boolean not null default false;
alter table if exists public.users add column if not exists plan_status text not null default 'free';
alter table if exists public.users add column if not exists subscription_status text not null default 'free';
alter table if exists public.users add column if not exists trial_start_date timestamptz;
alter table if exists public.users add column if not exists trial_end_date timestamptz;
alter table if exists public.users add column if not exists subscription_start timestamptz;
alter table if exists public.users add column if not exists subscription_end timestamptz;
alter table if exists public.users add column if not exists razorpay_customer_id text;

alter table public.users drop constraint if exists users_subscription_status_check;
alter table public.users
add constraint users_subscription_status_check
check (subscription_status in ('free', 'trial', 'premium', 'expired'));

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('reward', 'penalty', 'bonus')),
  amount numeric not null,
  reason text not null,
  date text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists wallet_transactions_user_date_reason_idx
on public.wallet_transactions(user_id, date, type, reason);

alter table public.wallet_transactions drop constraint if exists wallet_transactions_type_check;
alter table public.wallet_transactions
add constraint wallet_transactions_type_check
check (type in ('reward', 'penalty', 'bonus'));

alter table public.wallet_transactions enable row level security;

drop policy if exists "Users can read own wallet transactions" on public.wallet_transactions;
drop policy if exists "Users can insert own wallet transactions" on public.wallet_transactions;

create policy "Users can read own wallet transactions"
on public.wallet_transactions for select
using (auth.uid() = user_id);

create policy "Users can insert own wallet transactions"
on public.wallet_transactions for insert
with check (auth.uid() = user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  amount numeric not null,
  status text not null check (status in ('success', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

drop policy if exists "Users can read own payments" on public.payments;
drop policy if exists "Users can insert own payments" on public.payments;

create policy "Users can read own payments"
on public.payments for select
using (auth.uid() = user_id);

create policy "Users can insert own payments"
on public.payments for insert
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users can view profile images" on storage.objects;
drop policy if exists "Users can upload own profile images" on storage.objects;
drop policy if exists "Users can update own profile images" on storage.objects;
drop policy if exists "Users can view avatars" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;

create policy "Users can view profile images"
on storage.objects for select
using (bucket_id = 'profile-images');

create policy "Users can upload own profile images"
on storage.objects for insert
with check (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own profile images"
on storage.objects for update
using (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can view avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and name = 'profiles/' || auth.uid()::text || '.png'
);

create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and name = 'profiles/' || auth.uid()::text || '.png'
)
with check (
  bucket_id = 'avatars'
  and name = 'profiles/' || auth.uid()::text || '.png'
);

notify pgrst, 'reload schema';

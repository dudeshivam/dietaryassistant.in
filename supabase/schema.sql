create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  age integer,
  height numeric not null,
  weight numeric not null,
  goal text not null check (goal in ('fat loss', 'muscle gain', 'balance')),
  diet_type text not null check (diet_type in ('veg', 'non-veg')),
  activity_level text not null default 'moderate' check (activity_level in ('low', 'moderate', 'high')),
  lifestyle text not null,
  lifestyle_description text not null default '',
  health_notes text not null default '',
  profile_image text not null default '',
  updated_at timestamptz not null default now(),
  balance numeric not null default 0,
  wallet_balance numeric not null default 0,
  total_earned numeric not null default 0,
  total_spent numeric not null default 0,
  current_streak integer not null default 0,
  is_premium boolean not null default false,
  plan_status text not null default 'free' check (plan_status in ('free', 'trial', 'premium')),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  meals jsonb not null,
  meal_statuses jsonb not null default '{}',
  streak_processed boolean not null default false,
  date text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists daily_plans_user_date_idx
on public.daily_plans(user_id, date);

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid references public.daily_plans(id) on delete cascade,
  date text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  water_glasses integer not null default 0,
  completed_meals integer not null default 0,
  skipped_meals integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid references public.daily_plans(id) on delete cascade,
  date text not null,
  energy text not null,
  notes text not null default '',
  health_status text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('reward', 'penalty')),
  amount numeric not null,
  reason text not null,
  date text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists wallet_transactions_user_date_reason_idx
on public.wallet_transactions(user_id, date, type, reason);

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

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
alter table if exists public.daily_plans add column if not exists meal_statuses jsonb not null default '{}';
alter table if exists public.daily_plans add column if not exists streak_processed boolean not null default false;

comment on column public.daily_plans.meals is
'Roadmap array of meal nodes: [{name,time,type,items,calories,protein,status,is_user_customized}]';

alter table public.users enable row level security;
alter table public.daily_plans enable row level security;
alter table public.user_activity enable row level security;
alter table public.feedback enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can read own plans" on public.daily_plans;
drop policy if exists "Users can insert own plans" on public.daily_plans;
drop policy if exists "Users can update own plans" on public.daily_plans;
drop policy if exists "Users can read own activity" on public.user_activity;
drop policy if exists "Users can insert own activity" on public.user_activity;
drop policy if exists "Users can update own activity" on public.user_activity;
drop policy if exists "Users can read own feedback" on public.feedback;
drop policy if exists "Users can insert own feedback" on public.feedback;
drop policy if exists "Users can read own wallet transactions" on public.wallet_transactions;
drop policy if exists "Users can insert own wallet transactions" on public.wallet_transactions;
drop policy if exists "Users can view profile images" on storage.objects;
drop policy if exists "Users can upload own profile images" on storage.objects;
drop policy if exists "Users can update own profile images" on storage.objects;

create policy "Users can read own profile"
on public.users for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read own plans"
on public.daily_plans for select
using (auth.uid() = user_id);

create policy "Users can insert own plans"
on public.daily_plans for insert
with check (auth.uid() = user_id);

create policy "Users can update own plans"
on public.daily_plans for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read own activity"
on public.user_activity for select
using (auth.uid() = user_id);

create policy "Users can insert own activity"
on public.user_activity for insert
with check (auth.uid() = user_id);

create policy "Users can update own activity"
on public.user_activity for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read own feedback"
on public.feedback for select
using (auth.uid() = user_id);

create policy "Users can insert own feedback"
on public.feedback for insert
with check (auth.uid() = user_id);

create policy "Users can read own wallet transactions"
on public.wallet_transactions for select
using (auth.uid() = user_id);

create policy "Users can insert own wallet transactions"
on public.wallet_transactions for insert
with check (auth.uid() = user_id);

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

notify pgrst, 'reload schema';

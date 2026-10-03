-- Run this in the Supabase SQL editor for the live project connected to your domain.
-- It is safe to run more than once.

-- Repair accounts created while Supabase email confirmation was enabled.
-- Without this, those users cannot log in and see "Email not confirmed".
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email is not null
  and email_confirmed_at is null;

alter table if exists public.users add column if not exists age integer;
alter table if exists public.users add column if not exists activity_level text not null default 'moderate';
alter table if exists public.users add column if not exists lifestyle_description text not null default '';
alter table if exists public.users add column if not exists user_timezone text not null default 'Asia/Kolkata';
alter table if exists public.users add column if not exists health_notes text not null default '';
alter table if exists public.users add column if not exists profile_image text not null default '';
alter table if exists public.users add column if not exists updated_at timestamptz not null default now();
alter table if exists public.users add column if not exists balance numeric not null default 0;
alter table if exists public.users add column if not exists wallet_balance numeric not null default 0;
alter table if exists public.users add column if not exists total_earned numeric not null default 0;
alter table if exists public.users add column if not exists total_spent numeric not null default 0;
alter table if exists public.users add column if not exists coins_balance integer not null default 0;
alter table if exists public.users add column if not exists total_coins_earned integer not null default 0;
alter table if exists public.users add column if not exists total_coins_spent integer not null default 0;
alter table if exists public.users add column if not exists current_streak integer not null default 0;
alter table if exists public.users add column if not exists best_streak integer not null default 0;
alter table if exists public.users add column if not exists last_completed_date text;
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

create table if not exists public.adapt_day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  issue_text text not null,
  ai_response text not null,
  created_at timestamptz not null default now()
);

alter table public.adapt_day_logs enable row level security;

drop policy if exists "Users can read own adapt day logs" on public.adapt_day_logs;
drop policy if exists "Users can insert own adapt day logs" on public.adapt_day_logs;

create policy "Users can read own adapt day logs"
on public.adapt_day_logs for select
using (auth.uid() = user_id);

create policy "Users can insert own adapt day logs"
on public.adapt_day_logs for insert
with check (auth.uid() = user_id);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('reward', 'penalty', 'bonus', 'redeem')),
  coins integer not null,
  meal_id text not null default '',
  reason text not null,
  date text not null,
  created_at timestamptz not null default now()
);

alter table if exists public.coin_transactions add column if not exists meal_id text not null default '';
alter table if exists public.coin_transactions alter column meal_id set default '';
update public.coin_transactions set meal_id = '' where meal_id is null;
alter table if exists public.coin_transactions alter column meal_id set not null;

drop index if exists coin_transactions_user_date_reason_idx;
create unique index if not exists coin_transactions_user_date_reason_meal_idx
on public.coin_transactions(user_id, date, type, reason, meal_id);

alter table public.coin_transactions drop constraint if exists coin_transactions_type_check;
alter table public.coin_transactions
add constraint coin_transactions_type_check
check (type in ('reward', 'penalty', 'bonus', 'redeem'));

alter table public.coin_transactions enable row level security;

drop policy if exists "Users can read own coin transactions" on public.coin_transactions;
drop policy if exists "Users can insert own coin transactions" on public.coin_transactions;

create policy "Users can read own coin transactions"
on public.coin_transactions for select
using (auth.uid() = user_id);

create policy "Users can insert own coin transactions"
on public.coin_transactions for insert
with check (auth.uid() = user_id);

update public.users
set
  coins_balance = greatest(coins_balance, round(coalesce(wallet_balance, balance, 0) * 100)::integer),
  total_coins_earned = greatest(total_coins_earned, round(coalesce(total_earned, 0) * 100)::integer),
  total_coins_spent = greatest(total_coins_spent, round(coalesce(total_spent, 0) * 100)::integer);

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
  and (
    name = 'profiles/' || auth.uid()::text || '.png'
    or name = 'profiles/' || auth.uid()::text || '.jpg'
  )
);

create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (
    name = 'profiles/' || auth.uid()::text || '.png'
    or name = 'profiles/' || auth.uid()::text || '.jpg'
  )
)
with check (
  bucket_id = 'avatars'
  and (
    name = 'profiles/' || auth.uid()::text || '.png'
    or name = 'profiles/' || auth.uid()::text || '.jpg'
  )
);

notify pgrst, 'reload schema';

-- Meal-state repair and protected plan persistence. A legacy auto_skip flag without
-- a skipped status is invalid; normalize those rows before the UI reads them.
update public.daily_plans
set meals = repaired.meals
from (
  select
    id,
    jsonb_agg(
      case
        when coalesce(item->>'auto_skipped', item->>'autoSkipped', 'false') in ('true', '1')
          and lower(coalesce(item->>'status', 'pending')) = 'pending'
          then jsonb_set(item, '{status}', '"skipped"'::jsonb, true)
        else item
      end
      order by ordinal
    ) as meals
  from public.daily_plans,
    jsonb_array_elements(case when jsonb_typeof(meals) = 'array' then meals else '[]'::jsonb end)
      with ordinality as nodes(item, ordinal)
  group by id
) repaired
where public.daily_plans.id = repaired.id;

update public.daily_plans
set meals = repaired.meals
from (
  select
    id,
    jsonb_agg(
      case when coalesce(item->>'id', '') = ''
        then jsonb_set(item, '{id}', to_jsonb(gen_random_uuid()::text), true)
        else item
      end
      order by ordinal
    ) as meals
  from public.daily_plans,
    jsonb_array_elements(case when jsonb_typeof(meals) = 'array' then meals else '[]'::jsonb end)
      with ordinality as nodes(item, ordinal)
  group by id
) repaired
where public.daily_plans.id = repaired.id;

create or replace function public.save_today_plan(
  p_user_id uuid,
  p_meals jsonb
)
returns table(id uuid, meals jsonb, date text, streak_processed boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_plan public.daily_plans%rowtype;
  v_timezone text;
  v_today text;
  v_existing_meals jsonb := '[]'::jsonb;
  v_output jsonb := '[]'::jsonb;
  v_existing jsonb;
  v_candidate jsonb;
  v_index integer;
  v_count integer;
begin
  if auth.uid() <> p_user_id then raise exception 'Not authorized'; end if;
  if jsonb_typeof(p_meals) <> 'array' or jsonb_array_length(p_meals) = 0 then
    raise exception 'A meal plan must contain at least one meal';
  end if;

  select coalesce(user_timezone, 'Asia/Kolkata') into v_timezone
  from public.users where users.id = p_user_id;
  if v_timezone is null then raise exception 'User profile not found'; end if;
  v_today := timezone(v_timezone, now())::date::text;

  select * into v_plan from public.daily_plans
  where user_id = p_user_id and daily_plans.date = v_today for update;

  if found then
    v_existing_meals := case
      when jsonb_typeof(v_plan.meals) = 'array' then v_plan.meals
      else '[]'::jsonb
    end;
  end if;
  v_count := greatest(jsonb_array_length(v_existing_meals), jsonb_array_length(p_meals));

  for v_index in 0..v_count - 1 loop
    v_existing := v_existing_meals -> v_index;
    v_candidate := p_meals -> v_index;

    if v_existing is not null and lower(coalesce(v_existing->>'status', 'pending')) in ('completed', 'skipped') then
      v_output := v_output || jsonb_build_array(v_existing);
    elsif v_candidate is not null then
      v_candidate := jsonb_set(v_candidate, '{status}', '"pending"'::jsonb, true);
      v_candidate := jsonb_set(v_candidate, '{auto_skipped}', 'false'::jsonb, true);
      v_candidate := jsonb_set(v_candidate, '{autoSkipped}', 'false'::jsonb, true);
      v_candidate := jsonb_set(v_candidate, '{penalty_applied}', 'false'::jsonb, true);
      if coalesce(v_candidate->>'id', '') = '' then
        v_candidate := jsonb_set(v_candidate, '{id}', to_jsonb(gen_random_uuid()::text), true);
      end if;
      v_output := v_output || jsonb_build_array(v_candidate);
    elsif v_existing is not null then
      v_output := v_output || jsonb_build_array(v_existing);
    end if;
  end loop;

  if found then
    update public.daily_plans
    set meals = v_output, meal_statuses = '{}'::jsonb
    where daily_plans.id = v_plan.id
    returning daily_plans.id, daily_plans.meals, daily_plans.date, daily_plans.streak_processed
    into id, meals, date, streak_processed;
  else
    insert into public.daily_plans(user_id, meals, meal_statuses, streak_processed, date)
    values (p_user_id, v_output, '{}'::jsonb, false, v_today)
    returning daily_plans.id, daily_plans.meals, daily_plans.date, daily_plans.streak_processed
    into id, meals, date, streak_processed;
  end if;
  return next;
end;
$$;
revoke all on function public.save_today_plan(uuid, jsonb) from public;
grant execute on function public.save_today_plan(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

-- Production consistency hardening for meal actions and diagnostics.
alter table public.adapt_day_logs add column if not exists adaptation_date text not null default (now()::date::text);
alter table public.adapt_day_logs add column if not exists adaptation_reason text not null default '';
alter table public.adapt_day_logs add column if not exists adaptation_plan jsonb;
alter table public.adapt_day_logs add column if not exists expires_at timestamptz;

create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  component text not null,
  action text not null,
  error text not null,
  stack_trace text not null default '',
  created_at timestamptz not null default now()
);
alter table public.app_error_logs enable row level security;
drop policy if exists "Users can insert own error logs" on public.app_error_logs;
create policy "Users can insert own error logs" on public.app_error_logs for insert
with check (user_id is null or auth.uid() = user_id);

create index if not exists daily_plans_user_date_status_idx on public.daily_plans(user_id, date, streak_processed);
create index if not exists coin_transactions_user_date_type_idx on public.coin_transactions(user_id, date, type);
create index if not exists adapt_day_logs_user_date_idx on public.adapt_day_logs(user_id, adaptation_date);
create index if not exists user_activity_user_date_idx on public.user_activity(user_id, date);
create unique index if not exists payments_razorpay_payment_id_idx on public.payments(razorpay_payment_id) where razorpay_payment_id is not null;

create or replace function public.apply_meal_status_change(
  p_user_id uuid,
  p_plan_id uuid,
  p_meal_id text,
  p_status text,
  p_auto_skipped boolean default false
)
returns table(applied boolean, meals jsonb, coins_balance integer, total_coins_earned integer, total_coins_spent integer)
language plpgsql security definer set search_path = public as $$
declare
  v_plan public.daily_plans%rowtype;
  v_meal jsonb;
  v_meals jsonb;
  v_index integer;
  v_completed integer;
  v_count integer;
  v_delta integer := 0;
  v_reward record;
begin
  if auth.uid() <> p_user_id then raise exception 'Not authorized'; end if;
  if p_status not in ('completed', 'skipped') then raise exception 'Invalid meal status'; end if;

  select * into v_plan from public.daily_plans where id = p_plan_id and user_id = p_user_id for update;
  if not found then raise exception 'Meal plan not found'; end if;
  v_meals := coalesce(v_plan.meals, '[]'::jsonb);
  select ordinality - 1, value into v_index, v_meal
  from jsonb_array_elements(v_meals) with ordinality where value->>'id' = p_meal_id limit 1;
  if v_index is null then raise exception 'Meal not found'; end if;
  if coalesce(lower(v_meal->>'status'), 'pending') <> 'pending' then
    return query select false, v_meals, u.coins_balance, u.total_coins_earned, u.total_coins_spent
    from public.users u where u.id = p_user_id;
    return;
  end if;

  v_meal := jsonb_set(v_meal, '{status}', to_jsonb(p_status), true);
  v_meal := jsonb_set(v_meal, '{auto_skipped}', to_jsonb(p_auto_skipped), true);
  v_meal := jsonb_set(v_meal, '{autoSkipped}', to_jsonb(p_auto_skipped), true);
  if p_status = 'skipped' then v_meal := jsonb_set(v_meal, '{penalty_applied}', 'true'::jsonb, true); end if;
  v_meals := jsonb_set(v_meals, array[v_index::text], v_meal, false);
  update public.daily_plans set meals = v_meals, meal_statuses = '{}'::jsonb where id = p_plan_id;

  if p_status = 'skipped' then
    insert into public.coin_transactions(user_id, type, coins, meal_id, reason, date)
    values (p_user_id, 'penalty', -10, p_meal_id, 'Skipped Meal', v_plan.date)
    on conflict (user_id, date, type, reason, meal_id) do nothing;
    if found then v_delta := -10; end if;
  else
    select count(*) into v_completed from jsonb_array_elements(v_meals) item where lower(coalesce(item->>'status', 'pending')) = 'completed';
    v_count := jsonb_array_length(v_meals);
    for v_reward in select * from (values (25, 5), (50, 20), (75, 35), (100, 50)) as rewards(percent, coins) loop
      if v_count > 0 and v_completed * 100 >= v_count * v_reward.percent then
        insert into public.coin_transactions(user_id, type, coins, meal_id, reason, date)
        values (p_user_id, 'reward', v_reward.coins, '', 'Daily ' || v_reward.percent || '% completion reward', v_plan.date)
        on conflict (user_id, date, type, reason, meal_id) do nothing;
        if found then v_delta := v_delta + v_reward.coins; end if;
      end if;
    end loop;
  end if;

  update public.users
  set coins_balance = coins_balance + v_delta,
      total_coins_earned = total_coins_earned + greatest(v_delta, 0),
      total_coins_spent = total_coins_spent + greatest(-v_delta, 0)
  where id = p_user_id;
  return query select true, v_meals, u.coins_balance, u.total_coins_earned, u.total_coins_spent
  from public.users u where u.id = p_user_id;
end;
$$;
revoke all on function public.apply_meal_status_change(uuid, uuid, text, text, boolean) from public;
grant execute on function public.apply_meal_status_change(uuid, uuid, text, text, boolean) to authenticated;

create or replace function public.edit_pending_meal(
  p_user_id uuid,
  p_plan_id uuid,
  p_meal_id text,
  p_meal jsonb
)
returns table(applied boolean, meals jsonb)
language plpgsql security definer set search_path = public as $$
declare
  v_plan public.daily_plans%rowtype;
  v_existing jsonb;
  v_index integer;
  v_replacement jsonb;
begin
  if auth.uid() <> p_user_id then raise exception 'Not authorized'; end if;
  select * into v_plan from public.daily_plans where id = p_plan_id and user_id = p_user_id for update;
  if not found then raise exception 'Meal plan not found'; end if;
  select ordinality - 1, value into v_index, v_existing
  from jsonb_array_elements(coalesce(v_plan.meals, '[]'::jsonb)) with ordinality where value->>'id' = p_meal_id limit 1;
  if v_index is null or coalesce(lower(v_existing->>'status'), 'pending') <> 'pending' then
    return query select false, v_plan.meals;
    return;
  end if;
  v_replacement := jsonb_set(coalesce(p_meal, '{}'::jsonb), '{id}', to_jsonb(p_meal_id), true);
  v_replacement := jsonb_set(v_replacement, '{status}', '"pending"'::jsonb, true);
  v_replacement := jsonb_set(v_replacement, '{auto_skipped}', 'false'::jsonb, true);
  v_replacement := jsonb_set(v_replacement, '{penalty_applied}', 'false'::jsonb, true);
  update public.daily_plans
  set meals = jsonb_set(v_plan.meals, array[v_index::text], v_replacement, false), meal_statuses = '{}'::jsonb
  where id = p_plan_id;
  return query select true, plan.meals from public.daily_plans plan where plan.id = p_plan_id;
end;
$$;
revoke all on function public.edit_pending_meal(uuid, uuid, text, jsonb) from public;
grant execute on function public.edit_pending_meal(uuid, uuid, text, jsonb) to authenticated;

create or replace function public.apply_coin_transaction(
  p_user_id uuid,
  p_type text,
  p_coins integer,
  p_reason text,
  p_date text,
  p_meal_id text default ''
)
returns table(applied boolean, transaction_id uuid, coins_balance integer, total_coins_earned integer, total_coins_spent integer)
language plpgsql security definer set search_path = public as $$
declare
  v_amount integer := abs(coalesce(p_coins, 0));
  v_signed_amount integer;
  v_transaction_id uuid;
begin
  if auth.uid() <> p_user_id then raise exception 'Not authorized'; end if;
  if p_type not in ('reward', 'penalty', 'bonus', 'redeem') or v_amount = 0 then raise exception 'Invalid coin transaction'; end if;
  v_signed_amount := case when p_type in ('penalty', 'redeem') then -v_amount else v_amount end;
  insert into public.coin_transactions(user_id, type, coins, meal_id, reason, date)
  values (p_user_id, p_type, v_signed_amount, coalesce(p_meal_id, ''), p_reason, p_date)
  on conflict (user_id, date, type, reason, meal_id) do nothing
  returning id into v_transaction_id;
  if v_transaction_id is null then
    return query select false, null::uuid, u.coins_balance, u.total_coins_earned, u.total_coins_spent from public.users u where u.id = p_user_id;
    return;
  end if;
  update public.users
  set coins_balance = coins_balance + v_signed_amount,
      total_coins_earned = total_coins_earned + case when v_signed_amount > 0 then v_signed_amount else 0 end,
      total_coins_spent = total_coins_spent + case when v_signed_amount < 0 then -v_signed_amount else 0 end
  where id = p_user_id;
  return query select true, v_transaction_id, u.coins_balance, u.total_coins_earned, u.total_coins_spent from public.users u where u.id = p_user_id;
end;
$$;
revoke all on function public.apply_coin_transaction(uuid, text, integer, text, text, text) from public;
grant execute on function public.apply_coin_transaction(uuid, text, integer, text, text, text) to authenticated;

notify pgrst, 'reload schema';

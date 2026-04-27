-- ClasR Supabase Setup

-- 1. User subscriptions
create table if not exists user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','basic','pro')),
  lifetime_count integer not null default 0,
  monthly_count integer not null default 0,
  period_start timestamptz not null default now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Analyses
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text,
  q_variant text,
  mode text,
  input_length integer,
  report text not null,
  created_at timestamptz not null default now()
);

-- 3. Indexes
create index if not exists analyses_user_id_idx on analyses(user_id);
create index if not exists analyses_created_at_idx on analyses(created_at desc);

-- 4. RLS
alter table user_subscriptions enable row level security;
alter table analyses enable row level security;

-- Service role bypasses RLS — no extra policies needed for backend

-- 5. Increment functions
create or replace function increment_lifetime_count(p_user_id uuid)
returns void language sql as $$
  update user_subscriptions set lifetime_count = lifetime_count + 1, updated_at = now()
  where user_id = p_user_id;
$$;

create or replace function increment_monthly_count(p_user_id uuid)
returns void language sql as $$
  update user_subscriptions set monthly_count = monthly_count + 1, updated_at = now()
  where user_id = p_user_id;
$$;

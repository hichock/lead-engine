-- Lead Engine schema. Append-only: never edit this file after it is applied; add a new migration instead.
-- Access: only signed-in team members (table team_members) read and write through the API. The service role
-- (server routes and cron) bypasses RLS. The run ledger is written by the server only.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Team -------------------------------------------------------------------------------------------------------------
create table public.team_members (
  email text primary key check (email = lower(email)),
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now()
);

create or replace function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function public.is_team() from public;
grant execute on function public.is_team() to authenticated;

-- Companies, people, signals ---------------------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique check (domain = lower(domain) and domain !~ '^www\.'),
  name text not null default '',
  country text,
  timezone text,
  size_band text,
  tech text[] not null default '{}',
  source text not null default 'manual',
  evidence text,            -- one checkable line about their system, used in the first email
  evidence_url text,
  qualified boolean,        -- null = not checked yet
  qualify_reason text,
  excluded boolean not null default false, -- competitor, client or excluded segment
  score integer check (score between 0 and 100),
  fit numeric(4,2),
  trigger numeric(4,2),
  why text[] not null default '{}',
  status text not null default 'new' check (status in ('new','qualified','rejected','contacted','replied','won','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index companies_score_idx on public.companies (score desc nulls last);
create index companies_status_idx on public.companies (status);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null default '',
  role text,
  email text check (email is null or email = lower(email)),
  verify_status text not null default 'unverified'
    check (verify_status in ('unverified','ok','catch_all','unknown','invalid','disposable')),
  verify_source text,
  verified_at timestamptz,
  linkedin_url text,
  interests jsonb,
  offer_key text,
  suppressed boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index people_email_uq on public.people (email) where email is not null;
create index people_company_idx on public.people (company_id);

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  kind text not null check (kind in ('tech','register','job','ad','review','comment','request')),
  value text not null,
  url text,
  source text,
  observed_at timestamptz not null default now(),
  fetched_at timestamptz not null default now(),
  unique (company_id, kind, value)
);
create index signals_company_idx on public.signals (company_id, observed_at desc);

-- Run ledger -------------------------------------------------------------------------------------------------------
-- One row per source call. The exclusion constraint refuses a second pending/ok row with the same source and input
-- hash inside 24 hours, so a repeated call cannot bill twice even if the app check is bypassed.
create table public.sources_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  input_hash text not null,
  params jsonb not null default '{}',
  company_id uuid references public.companies (id) on delete set null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default now(), -- set to started_at + 24 h by the trigger below
  finished_at timestamptz,
  rows_in integer not null default 0,
  rows_kept integer not null default 0,
  cost_usd numeric(10,4) not null default 0,
  units numeric(12,3) not null default 0, -- checks, searches, pages or GB billed
  provider_job_id text,
  status text not null default 'pending' check (status in ('pending','ok','failed','refused')),
  note text,
  constraint sources_runs_no_rerun_24h exclude using gist (
    source with =, input_hash with =, tstzrange(started_at, expires_at) with &&
  ) where (status in ('pending','ok'))
);
create index sources_runs_source_idx on public.sources_runs (source, started_at desc);

create or replace function public.sources_runs_set_expiry() returns trigger language plpgsql as $$
begin
  new.expires_at := new.started_at + interval '24 hours';
  return new;
end $$;
create trigger sources_runs_expiry before insert or update of started_at on public.sources_runs
  for each row execute function public.sources_runs_set_expiry();

-- Outreach ---------------------------------------------------------------------------------------------------------
create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  from_name text not null,
  smtp_host text not null default 'smtp.gmail.com',
  smtp_port integer not null default 465,
  imap_host text not null default 'imap.gmail.com',
  imap_port integer not null default 993,
  daily_cap integer not null default 15 check (daily_cap between 0 and 50),
  active boolean not null default true,
  last_sent_at timestamptz,
  imap_last_uid bigint not null default 0,
  created_at timestamptz not null default now()
);

-- App passwords live in their own table with RLS on and no policy: only the service role (server) can read them.
create table public.mailbox_secrets (
  mailbox_id uuid primary key references public.mailboxes (id) on delete cascade,
  app_password_enc text not null -- AES-256-GCM with MAILBOX_ENCRYPTION_KEY
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','doc','linkedin')),
  direction text not null default 'out' check (direction in ('out','in')),
  step integer not null default 1 check (step between 0 and 5),
  mailbox text,
  subject text not null default '',
  body text not null default '',
  message_id text,
  in_reply_to text,
  class text, -- in: positive, question, objection, not_now, unsubscribe, hostile, auto_reply, bounce
  status text not null default 'draft' check (status in ('draft','queued','sent','stopped','failed','received')),
  send_after timestamptz,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
-- One outbound row per person, channel and step: re-running first-lines updates drafts instead of duplicating them.
create unique index messages_out_step_uq on public.messages (person_id, channel, step) where direction = 'out';
create index messages_status_idx on public.messages (status, send_after);
create index messages_message_id_idx on public.messages (message_id);

create table public.suppression (
  id uuid primary key default gen_random_uuid(),
  email text check (email is null or email = lower(email)),
  domain text check (domain is null or domain = lower(domain)),
  reason text not null default 'opt-out',
  created_at timestamptz not null default now(),
  check (email is not null or domain is not null)
);
create unique index suppression_email_uq on public.suppression (email) where email is not null;
create unique index suppression_domain_uq on public.suppression (domain) where domain is not null;

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('caps', '{"monidUsd":1.5,"mvChecks":80,"bigqueryGb":30,"bigqueryGbPerQuery":200,"apifyUsd":0,"urlscanSearches":200,"apolloPages":20,"monthlyUsd":30}'),
  ('send', '{"windowStartHour":9,"windowEndHour":17,"minGapMinutes":8,"stepDelays":[3,5],"newPerDay":15,"optOutLine":"If this isn''t relevant, reply \"no\" and I won''t write again.","autoQueue":false}'),
  ('sources_enabled', '{"httparchive":true,"urlscan":true,"reverseip":false,"apollo":true,"apify":false,"monid":true,"millionverifier":true}'),
  ('scoring', '{"countries":[],"tools":[],"sizeBands":{"1-10":0.6,"11-50":1,"51-200":0.8,"201-500":0.4,"500+":0.1},"halfLifeDays":30}'),
  ('cron_jobs', '{"urlscan":[]}')
on conflict (key) do nothing;

-- Per-source totals for the Sources page (runs as the caller, so RLS applies).
create view public.source_stats with (security_invoker = true) as
select source,
  count(*) filter (where status in ('ok','pending')) as runs,
  count(*) filter (where status = 'refused') as refused,
  coalesce(sum(rows_in), 0) as rows_in,
  coalesce(sum(rows_kept), 0) as rows_kept,
  coalesce(sum(cost_usd), 0) as cost_usd,
  coalesce(sum(cost_usd) filter (where started_at >= date_trunc('month', now())), 0) as cost_month,
  max(started_at) as last_run
from public.sources_runs
group by source;

-- updated_at on companies
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger companies_touch before update on public.companies for each row execute function public.touch_updated_at();

-- Row level security -----------------------------------------------------------------------------------------------
alter table public.team_members enable row level security;
alter table public.companies enable row level security;
alter table public.people enable row level security;
alter table public.signals enable row level security;
alter table public.sources_runs enable row level security;
alter table public.mailboxes enable row level security;
alter table public.mailbox_secrets enable row level security; -- no policy on purpose
alter table public.messages enable row level security;
alter table public.suppression enable row level security;
alter table public.settings enable row level security;

create policy team_read on public.team_members for select to authenticated using (public.is_team());
create policy team_read on public.sources_runs for select to authenticated using (public.is_team());

do $$
declare t text;
begin
  foreach t in array array['companies','people','signals','messages','suppression','settings'] loop
    execute format('create policy team_all on public.%I for all to authenticated using (public.is_team()) with check (public.is_team())', t);
  end loop;
end $$;

create policy team_all on public.mailboxes for all to authenticated using (public.is_team()) with check (public.is_team());

revoke all on all tables in schema public from anon;

-- Runs the frequent app jobs from Supabase pg_cron (Vercel Hobby crons run at most once a day).
-- /lead-engine:setup fills APP_URL and CRON_SECRET and runs this once in the SQL editor or with `supabase db query`.
-- Not a migration on purpose: it holds your deployment URL and a secret (stored in Supabase Vault, not in git).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('{{CRON_SECRET}}', 'lead_engine_cron_secret')
where not exists (select 1 from vault.secrets where name = 'lead_engine_cron_secret');

create or replace function public.lead_engine_call(path text) returns void language sql security definer as $$
  select net.http_post(
    url := '{{APP_URL}}' || path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lead_engine_cron_secret'), 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
$$;
revoke all on function public.lead_engine_call(text) from public, anon, authenticated;

-- every 5 minutes on weekdays (the app itself checks each lead's local window)
select cron.schedule('lead-engine-send', '*/5 * * * 1-5', $$ select public.lead_engine_call('/api/cron/send') $$);
-- every 15 minutes
select cron.schedule('lead-engine-replies', '*/15 * * * *', $$ select public.lead_engine_call('/api/cron/replies') $$);
-- daily 06:17 UTC
select cron.schedule('lead-engine-sources', '17 6 * * *', $$ select public.lead_engine_call('/api/cron/sources') $$);

-- To stop: select cron.unschedule('lead-engine-send'); (same for the others)

-- Checks access and the ledger rule as each real role. Every block raises an exception on failure.
\set ON_ERROR_STOP on
insert into public.team_members (email, role) values ('owner@example.com', 'owner');
insert into public.companies (domain, name) values ('acme.example', 'Acme');

-- anon sees nothing
set role anon;
do $$ begin
  perform 1 from public.companies;
  raise exception 'FAIL: anon can read companies';
exception when insufficient_privilege then null; end $$;
reset role;

-- a signed-in stranger sees no rows and cannot write
set role authenticated;
select set_config('request.jwt.claims', '{"email":"stranger@example.com"}', false);
do $$ begin
  if (select count(*) from public.companies) <> 0 then raise exception 'FAIL: stranger sees companies'; end if;
  begin
    insert into public.companies (domain) values ('evil.example');
    raise exception 'FAIL: stranger inserted a company';
  exception when insufficient_privilege then null; end;
end $$;

-- a team member reads and writes
select set_config('request.jwt.claims', '{"email":"Owner@Example.com"}', false);
do $$ begin
  if (select count(*) from public.companies) <> 1 then raise exception 'FAIL: team member cannot read'; end if;
  insert into public.companies (domain) values ('beta.example');
  -- the run ledger is read-only for users
  begin
    insert into public.sources_runs (source, input_hash) values ('urlscan', 'h');
    raise exception 'FAIL: user wrote the ledger';
  exception when insufficient_privilege then null; end;
  -- mailbox passwords are not readable
  begin
    perform 1 from public.mailbox_secrets;
    if found then raise exception 'FAIL: user read mailbox secrets'; end if;
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ledger: same source + input inside 24 h is refused by the database; failed rows don't block; after 24 h is fine
do $$ begin
  insert into public.sources_runs (source, input_hash, status) values ('apify', 'abc', 'ok');
  begin
    insert into public.sources_runs (source, input_hash, status) values ('apify', 'abc', 'pending');
    raise exception 'FAIL: duplicate run inside 24 h accepted';
  exception when exclusion_violation then null; end;
  insert into public.sources_runs (source, input_hash, status) values ('apify', 'abc', 'refused');
  insert into public.sources_runs (source, input_hash, status) values ('apify', 'def', 'failed');
  insert into public.sources_runs (source, input_hash, status) values ('apify', 'def', 'ok');
  insert into public.sources_runs (source, input_hash, status, started_at) values ('apify', 'abc', 'ok', now() + interval '25 hours');
  insert into public.sources_runs (source, input_hash, status) values ('urlscan', 'abc', 'ok');
end $$;

-- drafts are idempotent per person, channel and step
do $$ declare c uuid; p uuid; begin
  select id into c from public.companies where domain = 'acme.example';
  insert into public.people (company_id, name, email) values (c, 'Ana', 'ana@acme.example') returning id into p;
  insert into public.messages (person_id, company_id, step, subject, body) values (p, c, 1, 's', 'b');
  begin
    insert into public.messages (person_id, company_id, step, subject, body) values (p, c, 1, 's', 'b2');
    raise exception 'FAIL: duplicate draft accepted';
  exception when unique_violation then null; end;
end $$;

select 'all migration checks passed' as result;

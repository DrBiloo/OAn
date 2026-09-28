-- Rate limiting used to live in an in-memory Map (lib/rate-limit.ts), which is
-- per-serverless-instance on Vercel: concurrent instances each have their own
-- counters, so a client spread across instances could exceed the real limit.
-- Move the counters into Postgres so every instance shares the same state.

create table public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;

-- Atomically increments (or starts) the window for `p_key` and reports
-- whether this request is still within `p_limit`. The insert/on-conflict is a
-- single statement, so concurrent callers for the same key serialize on the
-- row instead of racing.
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when public.rate_limits.reset_at <= now() then 1 else public.rate_limits.count + 1 end,
        reset_at = case when public.rate_limits.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else public.rate_limits.reset_at end
  returning count into v_count;

  -- Opportunistic cleanup of long-expired rows instead of a cron job.
  delete from public.rate_limits where reset_at < now() - interval '1 day' and random() < 0.01;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

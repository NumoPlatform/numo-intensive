create table if not exists public.intensive_login_throttle (
  key_hash text primary key,
  failures integer not null default 0 check (failures >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.intensive_login_throttle enable row level security;
revoke all on table public.intensive_login_throttle from public, anon, authenticated;
grant all on table public.intensive_login_throttle to service_role;

create or replace function public.intensive_login_rate_check(p_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_row public.intensive_login_throttle%rowtype;
  v_retry integer;
begin
  if p_key_hash is null or length(p_key_hash) <> 64 then
    raise exception 'INVALID_RATE_KEY';
  end if;

  select * into v_row
  from public.intensive_login_throttle
  where key_hash = p_key_hash
  for update;

  if not found then
    return jsonb_build_object('allowed', true, 'retry_after', 0);
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > now() then
    v_retry := greatest(1, ceil(extract(epoch from (v_row.blocked_until - now())))::integer);
    return jsonb_build_object('allowed', false, 'retry_after', v_retry);
  end if;

  if v_row.window_started_at < now() - interval '15 minutes' then
    update public.intensive_login_throttle
    set failures = 0, window_started_at = now(), blocked_until = null, updated_at = now()
    where key_hash = p_key_hash;
  end if;

  return jsonb_build_object('allowed', true, 'retry_after', 0);
end
$function$;

create or replace function public.intensive_login_rate_failure(p_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_row public.intensive_login_throttle%rowtype;
  v_failures integer;
  v_blocked_until timestamptz;
begin
  if p_key_hash is null or length(p_key_hash) <> 64 then
    raise exception 'INVALID_RATE_KEY';
  end if;

  insert into public.intensive_login_throttle(key_hash, failures, window_started_at, updated_at)
  values(p_key_hash, 1, now(), now())
  on conflict(key_hash) do update
  set
    failures = case
      when public.intensive_login_throttle.window_started_at < now() - interval '15 minutes' then 1
      else public.intensive_login_throttle.failures + 1
    end,
    window_started_at = case
      when public.intensive_login_throttle.window_started_at < now() - interval '15 minutes' then now()
      else public.intensive_login_throttle.window_started_at
    end,
    blocked_until = case
      when (
        case
          when public.intensive_login_throttle.window_started_at < now() - interval '15 minutes' then 1
          else public.intensive_login_throttle.failures + 1
        end
      ) >= 5 then now() + interval '15 minutes'
      else null
    end,
    updated_at = now()
  returning * into v_row;

  v_failures := v_row.failures;
  v_blocked_until := v_row.blocked_until;
  return jsonb_build_object(
    'failures', v_failures,
    'blocked', v_blocked_until is not null and v_blocked_until > now(),
    'blocked_until', v_blocked_until
  );
end
$function$;

create or replace function public.intensive_login_rate_success(p_key_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  delete from public.intensive_login_throttle where key_hash = p_key_hash;
  return true;
end
$function$;

revoke all on function public.intensive_login_rate_check(text) from public, anon, authenticated;
revoke all on function public.intensive_login_rate_failure(text) from public, anon, authenticated;
revoke all on function public.intensive_login_rate_success(text) from public, anon, authenticated;
grant execute on function public.intensive_login_rate_check(text) to service_role;
grant execute on function public.intensive_login_rate_failure(text) to service_role;
grant execute on function public.intensive_login_rate_success(text) to service_role;

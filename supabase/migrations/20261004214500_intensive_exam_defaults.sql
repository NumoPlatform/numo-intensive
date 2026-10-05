alter table public.intensive_settings
  add column if not exists default_section_minutes integer not null default 30,
  add column if not exists default_attempts integer not null default 4,
  add column if not exists default_result_release text not null default 'IMMEDIATE';

alter table public.intensive_settings
  drop constraint if exists intensive_settings_default_section_minutes_check,
  add constraint intensive_settings_default_section_minutes_check
    check (default_section_minutes between 1 and 240);

alter table public.intensive_settings
  drop constraint if exists intensive_settings_default_attempts_check,
  add constraint intensive_settings_default_attempts_check
    check (default_attempts between 1 and 20);

alter table public.intensive_settings
  drop constraint if exists intensive_settings_default_result_release_check,
  add constraint intensive_settings_default_result_release_check
    check (default_result_release in ('IMMEDIATE','AFTER_END','MANUAL'));

create or replace function public.intensive_admin_get_settings()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_settings public.intensive_settings%rowtype;
begin
  if auth.uid() is null or not public.intensive_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_settings from public.intensive_settings where id=true limit 1;
  if not found then raise exception 'SETTINGS_NOT_FOUND'; end if;

  return jsonb_build_object(
    'support_phone',v_settings.support_phone,
    'support_whatsapp',v_settings.support_whatsapp,
    'support_website',v_settings.support_website,
    'support_email',v_settings.support_email,
    'timezone',v_settings.timezone,
    'default_section_minutes',v_settings.default_section_minutes,
    'default_attempts',v_settings.default_attempts,
    'default_result_release',v_settings.default_result_release,
    'updated_at',v_settings.updated_at
  );
end
$function$;

create or replace function public.intensive_admin_update_settings(
  p_support_phone text,
  p_support_whatsapp text,
  p_support_website text,
  p_support_email text,
  p_timezone text,
  p_default_section_minutes integer,
  p_default_attempts integer,
  p_default_result_release text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_settings public.intensive_settings%rowtype;
begin
  if auth.uid() is null or not public.intensive_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_timezone is null or btrim(p_timezone)='' then raise exception 'INVALID_TIMEZONE'; end if;
  if p_default_section_minutes < 1 or p_default_section_minutes > 240 then raise exception 'INVALID_DEFAULT_SECTION_MINUTES'; end if;
  if p_default_attempts < 1 or p_default_attempts > 20 then raise exception 'INVALID_DEFAULT_ATTEMPTS'; end if;
  if p_default_result_release not in ('IMMEDIATE','AFTER_END','MANUAL') then raise exception 'INVALID_DEFAULT_RESULT_RELEASE'; end if;

  update public.intensive_settings
  set support_phone=nullif(btrim(coalesce(p_support_phone,'')),''),
      support_whatsapp=nullif(btrim(coalesce(p_support_whatsapp,'')),''),
      support_website=nullif(btrim(coalesce(p_support_website,'')),''),
      support_email=nullif(btrim(coalesce(p_support_email,'')),''),
      timezone=btrim(p_timezone),
      default_section_minutes=p_default_section_minutes,
      default_attempts=p_default_attempts,
      default_result_release=p_default_result_release,
      updated_at=now(),
      updated_by=auth.uid()
  where id=true
  returning * into v_settings;

  if not found then raise exception 'SETTINGS_NOT_FOUND'; end if;

  insert into public.intensive_audit_logs(admin_id,action,target_type,target_id,details)
  values(
    auth.uid(),'UPDATE_SETTINGS','intensive_settings','global',
    jsonb_build_object(
      'timezone',v_settings.timezone,
      'default_section_minutes',v_settings.default_section_minutes,
      'default_attempts',v_settings.default_attempts,
      'default_result_release',v_settings.default_result_release
    )
  );

  return jsonb_build_object(
    'support_phone',v_settings.support_phone,
    'support_whatsapp',v_settings.support_whatsapp,
    'support_website',v_settings.support_website,
    'support_email',v_settings.support_email,
    'timezone',v_settings.timezone,
    'default_section_minutes',v_settings.default_section_minutes,
    'default_attempts',v_settings.default_attempts,
    'default_result_release',v_settings.default_result_release,
    'updated_at',v_settings.updated_at
  );
end
$function$;

revoke all on function public.intensive_admin_update_settings(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.intensive_admin_update_settings(text,text,text,text,text,integer,integer,text) from public, anon;
grant execute on function public.intensive_admin_update_settings(text,text,text,text,text,integer,integer,text) to authenticated, service_role;

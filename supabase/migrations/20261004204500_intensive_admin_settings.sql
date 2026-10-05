create or replace function public.intensive_admin_get_settings()
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare v_settings public.intensive_settings%rowtype;
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
    'updated_at',v_settings.updated_at
  );
end
$function$;

create or replace function public.intensive_admin_update_settings(
  p_support_phone text,
  p_support_whatsapp text,
  p_support_website text,
  p_support_email text,
  p_timezone text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare v_settings public.intensive_settings%rowtype;
begin
  if auth.uid() is null or not public.intensive_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_timezone is null or btrim(p_timezone)='' then raise exception 'INVALID_TIMEZONE'; end if;

  update public.intensive_settings
  set support_phone=nullif(btrim(coalesce(p_support_phone,'')),''),
      support_whatsapp=nullif(btrim(coalesce(p_support_whatsapp,'')),''),
      support_website=nullif(btrim(coalesce(p_support_website,'')),''),
      support_email=nullif(btrim(coalesce(p_support_email,'')),''),
      timezone=btrim(p_timezone),
      updated_at=now(),
      updated_by=auth.uid()
  where id=true
  returning * into v_settings;

  if not found then raise exception 'SETTINGS_NOT_FOUND'; end if;

  insert into public.intensive_audit_logs(admin_id,action,target_type,target_id,details)
  values(auth.uid(),'UPDATE_SETTINGS','intensive_settings','global',jsonb_build_object('timezone',v_settings.timezone));

  return jsonb_build_object(
    'support_phone',v_settings.support_phone,
    'support_whatsapp',v_settings.support_whatsapp,
    'support_website',v_settings.support_website,
    'support_email',v_settings.support_email,
    'timezone',v_settings.timezone,
    'updated_at',v_settings.updated_at
  );
end
$function$;

revoke all on function public.intensive_admin_get_settings() from public, anon;
revoke all on function public.intensive_admin_update_settings(text,text,text,text,text) from public, anon;
grant execute on function public.intensive_admin_get_settings() to authenticated, service_role;
grant execute on function public.intensive_admin_update_settings(text,text,text,text,text) to authenticated, service_role;

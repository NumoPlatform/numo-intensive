create or replace function public.intensive_login_identity(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_id uuid;
  v_email text;
begin
  select p.id, u.email
  into v_id, v_email
  from public.intensive_profiles p
  join auth.users u on u.id = p.id
  where p.username = btrim(coalesce(p_username,''))
    and p.status = 'ACTIVE'
    and (p.start_date is null or p.start_date <= (now() at time zone 'Asia/Riyadh')::date)
    and (p.expiration_date is null or p.expiration_date >= (now() at time zone 'Asia/Riyadh')::date)
  limit 1;

  if v_id is null or v_email is null then
    return null;
  end if;

  return jsonb_build_object('id', v_id, 'email', v_email);
end
$function$;

revoke all on function public.intensive_login_identity(text) from public;
grant execute on function public.intensive_login_identity(text) to anon, authenticated;

drop policy if exists audit_admin_insert on public.intensive_audit_logs;
create policy audit_admin_insert
on public.intensive_audit_logs
for insert
to authenticated
with check (public.intensive_is_admin());

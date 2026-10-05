create or replace function public.intensive_reset_device(p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.intensive_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  update public.intensive_trusted_devices
  set
    status='RESET',
    token_hash=encode(extensions.gen_random_bytes(32),'hex'),
    active_session_id=null,
    reset_at=now()
  where student_id=p_student_id;

  insert into public.intensive_audit_logs(admin_id,action,target_type,target_id)
  values(auth.uid(),'DEVICE_RESET','STUDENT',p_student_id::text);

  return true;
end
$$;

revoke all on function public.intensive_reset_device(uuid) from public, anon;
grant execute on function public.intensive_reset_device(uuid) to authenticated, service_role;

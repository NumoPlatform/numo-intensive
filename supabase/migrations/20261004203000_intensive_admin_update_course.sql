create or replace function public.intensive_admin_update_course(
  p_course_id uuid,
  p_title text,
  p_description text,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_course public.intensive_courses%rowtype;
begin
  if auth.uid() is null or not public.intensive_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_title is null or length(btrim(p_title)) < 2 or length(btrim(p_title)) > 160 then
    raise exception 'INVALID_COURSE_TITLE';
  end if;
  select * into v_course from public.intensive_courses where id=p_course_id for update;
  if not found then raise exception 'COURSE_NOT_FOUND'; end if;
  update public.intensive_courses
  set title=btrim(p_title),
      description=nullif(btrim(coalesce(p_description,'')),''),
      is_active=coalesce(p_is_active,is_active),
      updated_at=now()
  where id=p_course_id
  returning * into v_course;
  insert into public.intensive_audit_logs(admin_id,action,target_type,target_id,details)
  values(auth.uid(),'UPDATE_COURSE','intensive_courses',p_course_id::text,
    jsonb_build_object('code',v_course.code,'title',v_course.title,'is_active',v_course.is_active));
  return jsonb_build_object('id',v_course.id,'code',v_course.code,'title',v_course.title,'description',v_course.description,'is_active',v_course.is_active);
end
$function$;
revoke all on function public.intensive_admin_update_course(uuid,text,text,boolean) from public, anon;
grant execute on function public.intensive_admin_update_course(uuid,text,text,boolean) to authenticated, service_role;
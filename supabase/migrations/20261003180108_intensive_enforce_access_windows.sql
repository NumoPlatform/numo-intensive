create or replace function public.intensive_student_access_active(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists(
    select 1
    from public.intensive_profiles p
    where
      p.id = p_student_id
      and p.role = 'STUDENT'
      and p.status = 'ACTIVE'
      and (p.start_date is null or p.start_date <= current_date)
      and (p.expiration_date is null or p.expiration_date >= current_date)
  );
$function$;

create or replace function public.intensive_is_assigned(p_exam_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    public.intensive_student_access_active(p_student_id)
    and exists(
      select 1
      from public.intensive_exams ex
      join public.intensive_enrollments en
        on en.course_id = ex.course_id
       and en.student_id = p_student_id
       and en.is_active
       and en.start_date <= current_date
       and (en.expiration_date is null or en.expiration_date >= current_date)
      where
        ex.id = p_exam_id
        and exists(
          select 1
          from public.intensive_exam_assignments a
          where
            a.exam_id = p_exam_id
            and (
              a.student_id = p_student_id
              or (
                a.group_id is not null
                and exists(
                  select 1
                  from public.intensive_group_members gm
                  where gm.group_id = a.group_id
                    and gm.student_id = p_student_id
                )
              )
              or a.all_course_students
            )
        )
    );
$function$;

create or replace function public.intensive_verify_device(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_session uuid;
begin
  if auth.uid() is null then return false; end if;
  if not public.intensive_student_access_active(auth.uid()) then return false; end if;
  v_session := nullif(auth.jwt()->>'session_id','')::uuid;
  return exists(
    select 1
    from public.intensive_trusted_devices
    where student_id = auth.uid()
      and token_hash = p_token_hash
      and status = 'ACTIVE'
      and active_session_id = v_session
  );
end
$function$;

revoke all on function public.intensive_student_access_active(uuid) from public, anon;
grant execute on function public.intensive_student_access_active(uuid) to authenticated, service_role;

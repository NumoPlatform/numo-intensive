create or replace function public.intensive_student_access_active(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    (
      p_student_id = auth.uid()
      or public.intensive_is_admin()
      or auth.role() = 'service_role'
    )
    and exists (
      select 1
      from public.intensive_profiles p
      where p.id = p_student_id
        and p.role = 'STUDENT'
        and p.status = 'ACTIVE'
        and (
          p.start_date is null
          or p.start_date <= (timezone('Asia/Riyadh', now()))::date
        )
        and (
          p.expiration_date is null
          or p.expiration_date >= (timezone('Asia/Riyadh', now()))::date
        )
    );
$$;

create or replace function public.intensive_is_assigned(p_exam_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    (
      p_student_id = auth.uid()
      or public.intensive_is_admin()
      or auth.role() = 'service_role'
    )
    and public.intensive_student_access_active(p_student_id)
    and exists (
      select 1
      from public.intensive_exams ex
      join public.intensive_enrollments en
        on en.course_id = ex.course_id
       and en.student_id = p_student_id
       and en.is_active
       and en.start_date <= (timezone('Asia/Riyadh', now()))::date
       and (
         en.expiration_date is null
         or en.expiration_date >= (timezone('Asia/Riyadh', now()))::date
       )
      where ex.id = p_exam_id
        and exists (
          select 1
          from public.intensive_exam_assignments a
          where a.exam_id = p_exam_id
            and (
              a.student_id = p_student_id
              or (
                a.group_id is not null
                and exists (
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
$$;

create or replace function public.intensive_has_active_device()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and public.intensive_student_access_active(auth.uid())
    and exists (
      select 1
      from public.intensive_trusted_devices d
      where d.student_id = auth.uid()
        and d.status = 'ACTIVE'
        and d.active_session_id = nullif(auth.jwt()->>'session_id','')::uuid
    );
$$;

create or replace function public.intensive_register_or_verify_device(
  p_token_hash text,
  p_user_agent text default null,
  p_ip inet default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile public.intensive_profiles%rowtype;
  v_device public.intensive_trusted_devices%rowtype;
  v_session uuid;
  v_today date := (timezone('Asia/Riyadh', now()))::date;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select * into v_profile
  from public.intensive_profiles
  where id = auth.uid()
    and role = 'STUDENT';

  if not found then
    raise exception 'STUDENT_ACCOUNT_REQUIRED';
  end if;

  if v_profile.status <> 'ACTIVE' then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  if v_profile.start_date is not null and v_profile.start_date > v_today then
    raise exception 'ACCOUNT_NOT_STARTED';
  end if;

  if v_profile.expiration_date is not null and v_profile.expiration_date < v_today then
    raise exception 'ACCOUNT_EXPIRED';
  end if;

  v_session := nullif(auth.jwt()->>'session_id','')::uuid;

  select * into v_device
  from public.intensive_trusted_devices
  where student_id = auth.uid()
  for update;

  if not found or v_device.status = 'RESET' then
    insert into public.intensive_trusted_devices(
      student_id,
      token_hash,
      user_agent,
      active_session_id,
      last_ip,
      status,
      registered_at,
      last_access_at
    )
    values(
      auth.uid(),
      p_token_hash,
      left(p_user_agent,500),
      v_session,
      p_ip,
      'ACTIVE',
      now(),
      now()
    )
    on conflict(student_id)
    do update set
      token_hash = excluded.token_hash,
      user_agent = excluded.user_agent,
      active_session_id = excluded.active_session_id,
      last_ip = excluded.last_ip,
      status = 'ACTIVE',
      registered_at = now(),
      last_access_at = now();

    insert into public.intensive_access_logs(student_id,outcome,ip,user_agent)
    values(auth.uid(),'DEVICE_REGISTERED',p_ip,left(p_user_agent,500));

    return jsonb_build_object('authorized',true,'registered',true);
  end if;

  if v_device.status <> 'ACTIVE' or v_device.token_hash <> p_token_hash then
    insert into public.intensive_access_logs(student_id,outcome,ip,user_agent)
    values(auth.uid(),'DEVICE_DENIED',p_ip,left(p_user_agent,500));

    return jsonb_build_object('authorized',false,'reason','DEVICE_NOT_AUTHORIZED');
  end if;

  update public.intensive_trusted_devices
  set
    active_session_id = v_session,
    last_access_at = now(),
    last_ip = p_ip,
    user_agent = left(p_user_agent,500)
  where student_id = auth.uid();

  insert into public.intensive_access_logs(student_id,outcome,ip,user_agent)
  values(auth.uid(),'DEVICE_VERIFIED',p_ip,left(p_user_agent,500));

  return jsonb_build_object('authorized',true,'registered',false);
end
$$;

drop policy if exists courses_select on public.intensive_courses;
create policy courses_select
on public.intensive_courses
for select
to authenticated
using (
  public.intensive_is_admin()
  or (
    public.intensive_has_active_device()
    and exists (
      select 1
      from public.intensive_enrollments e
      where e.course_id = intensive_courses.id
        and e.student_id = auth.uid()
        and e.is_active
        and e.start_date <= (timezone('Asia/Riyadh', now()))::date
        and (
          e.expiration_date is null
          or e.expiration_date >= (timezone('Asia/Riyadh', now()))::date
        )
    )
  )
);

revoke all on function public.intensive_student_access_active(uuid) from public, anon;
grant execute on function public.intensive_student_access_active(uuid) to authenticated, service_role;

revoke all on function public.intensive_is_assigned(uuid,uuid) from public, anon;
grant execute on function public.intensive_is_assigned(uuid,uuid) to authenticated, service_role;

revoke all on function public.intensive_has_active_device() from public, anon;
grant execute on function public.intensive_has_active_device() to authenticated, service_role;

revoke all on function public.intensive_register_or_verify_device(text,text,inet) from public, anon;
grant execute on function public.intensive_register_or_verify_device(text,text,inet) to authenticated, service_role;

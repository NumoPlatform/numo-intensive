-- NUMO INTENSIVE role-based access smoke test
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table rbac_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_course uuid;
  v_admin_create_blocked boolean := false;
  v_reset_blocked boolean := false;
begin
  select id into v_user
  from public.intensive_profiles
  where role='ADMIN'
  order by created_at
  limit 1;

  select id into v_course
  from public.intensive_courses
  where is_active
  order by code
  limit 1;

  if v_user is null then raise exception 'QA_ADMIN_REQUIRED'; end if;
  if v_course is null then raise exception 'QA_COURSE_REQUIRED'; end if;

  update public.intensive_profiles
  set role='STUDENT',
      status='ACTIVE',
      expiration_date=current_date + 7
  where id=v_user;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_user,
      'role','authenticated',
      'session_id','cccccccc-3333-4333-8333-333333333333'::uuid
    )::text,
    true
  );

  begin
    perform public.intensive_admin_create_exam_timed(
      v_course,
      'QA unauthorized exam',
      'QUIZ',
      'QA',
      now(),
      now() + interval '1 day',
      30,
      '["Grammar"]'::jsonb,
      4,
      'IMMEDIATE',
      30
    );
  exception when others then
    if sqlerrm like '%ADMIN_REQUIRED%' then
      v_admin_create_blocked := true;
    else
      raise;
    end if;
  end;

  begin
    perform public.intensive_reset_device(v_user);
  exception when others then
    if sqlerrm like '%ADMIN_REQUIRED%' then
      v_reset_blocked := true;
    else
      raise;
    end if;
  end;

  insert into rbac_qa(payload)
  values(jsonb_build_object(
    'student_cannot_create_exam',v_admin_create_blocked,
    'student_cannot_reset_device',v_reset_blocked
  ));
end
$$;

select payload from rbac_qa;

rollback;

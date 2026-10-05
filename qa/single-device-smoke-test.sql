-- NUMO INTENSIVE single-device smoke test
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table device_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_session_a uuid := 'aaaaaaaa-1111-4111-8111-111111111111';
  v_session_b uuid := 'bbbbbbbb-2222-4222-8222-222222222222';
  v_first jsonb;
  v_second jsonb;
  v_reset boolean;
  v_after_reset jsonb;
  v_course uuid;
  v_exam uuid;
  v_start jsonb;
  v_attempt uuid;
  v_untrusted_advance_blocked boolean := false;
begin
  select id into v_user
  from public.intensive_profiles
  where role='ADMIN'
  order by created_at
  limit 1;

  if v_user is null then raise exception 'QA_ADMIN_REQUIRED'; end if;

  select e.course_id,e.id into v_course,v_exam
  from public.intensive_exams e
  join public.intensive_courses c on c.id=e.course_id
  where c.code='EL111' and e.title='EL111 Midterm — Model 1'
  limit 1;

  if v_exam is null then raise exception 'QA_EL111_MODEL_REQUIRED'; end if;

  update public.intensive_profiles
  set role='STUDENT',
      status='ACTIVE',
      expiration_date=current_date + 7
  where id=v_user;

  insert into public.intensive_enrollments(student_id,course_id,start_date,expiration_date,is_active)
  values(v_user,v_course,current_date-1,current_date+7,true)
  on conflict(student_id,course_id)
  do update set start_date=excluded.start_date,expiration_date=excluded.expiration_date,is_active=true;

  delete from public.intensive_exam_attempts
  where student_id=v_user and exam_id=v_exam;

  delete from public.intensive_trusted_devices
  where student_id=v_user;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_user,
      'role','authenticated',
      'session_id',v_session_a
    )::text,
    true
  );

  v_first := public.intensive_register_or_verify_device(
    'device-a-token-hash',
    'NUMO QA Device A',
    '127.0.0.1'::inet
  );

  v_start := public.intensive_start_exam_sectioned(v_exam);
  v_attempt := (v_start->>'attempt_id')::uuid;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_user,
      'role','authenticated',
      'session_id',v_session_b
    )::text,
    true
  );

  begin
    perform public.intensive_advance_section(v_attempt);
  exception when others then
    if sqlerrm like '%DEVICE_NOT_AUTHORIZED%' then
      v_untrusted_advance_blocked := true;
    else
      raise;
    end if;
  end;

  v_second := public.intensive_register_or_verify_device(
    'device-b-token-hash',
    'NUMO QA Device B',
    '127.0.0.2'::inet
  );

  update public.intensive_profiles
  set role='ADMIN'
  where id=v_user;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_user,
      'role','authenticated',
      'session_id',v_session_a
    )::text,
    true
  );

  v_reset := public.intensive_reset_device(v_user);

  update public.intensive_profiles
  set role='STUDENT'
  where id=v_user;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_user,
      'role','authenticated',
      'session_id',v_session_b
    )::text,
    true
  );

  v_after_reset := public.intensive_register_or_verify_device(
    'device-b-token-hash',
    'NUMO QA Device B',
    '127.0.0.2'::inet
  );

  insert into device_qa(payload)
  values(jsonb_build_object(
    'first_device_authorized',coalesce((v_first->>'authorized')::boolean,false),
    'first_device_registered',coalesce((v_first->>'registered')::boolean,false),
    'second_device_denied',not coalesce((v_second->>'authorized')::boolean,true),
    'second_device_reason',v_second->>'reason',
    'untrusted_session_cannot_advance_section',v_untrusted_advance_blocked,
    'admin_reset_succeeded',v_reset,
    'second_device_after_reset_authorized',coalesce((v_after_reset->>'authorized')::boolean,false),
    'second_device_after_reset_registered',coalesce((v_after_reset->>'registered')::boolean,false)
  ));
end
$$;

select payload from device_qa;

rollback;

-- NUMO INTENSIVE expired-attempt resume smoke test
-- Verifies that an expired attempt is graded/published before another attempt can start.
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table expiry_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_exam uuid;
  v_course uuid;
  v_session uuid := '12121212-7777-4777-8777-777777777777';
  v_first jsonb;
  v_resume jsonb;
  v_attempt uuid;
  v_count integer;
  v_result public.intensive_results%rowtype;
begin
  select id into v_user
  from public.intensive_profiles
  where role='ADMIN'
  order by created_at
  limit 1;

  select e.id,c.id into v_exam,v_course
  from public.intensive_exams e
  join public.intensive_courses c on c.id=e.course_id
  where c.code='EL111'
    and e.title='EL111 Midterm — Model 1'
  limit 1;

  if v_user is null then raise exception 'QA_ADMIN_REQUIRED'; end if;
  if v_exam is null then raise exception 'QA_EL111_MODEL_REQUIRED'; end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_user,
      'role','authenticated',
      'session_id',v_session
    )::text,
    true
  );

  update public.intensive_profiles
  set role='STUDENT',
      status='ACTIVE',
      expiration_date=current_date+7
  where id=v_user;

  insert into public.intensive_enrollments(
    student_id,course_id,start_date,expiration_date,is_active
  )
  values(v_user,v_course,current_date-1,current_date+7,true)
  on conflict(student_id,course_id)
  do update set
    start_date=excluded.start_date,
    expiration_date=excluded.expiration_date,
    is_active=true;

  delete from public.intensive_exam_attempts
  where student_id=v_user and exam_id=v_exam;

  delete from public.intensive_trusted_devices
  where student_id=v_user;

  perform public.intensive_register_or_verify_device(
    'qa-expiry-device',
    'NUMO Expiry QA',
    '127.0.0.1'::inet
  );

  v_first := public.intensive_start_exam_sectioned(v_exam);
  v_attempt := (v_first->>'attempt_id')::uuid;

  update public.intensive_exam_attempts
  set
    expires_at=now()-interval '1 minute',
    current_section_expires_at=now()-interval '1 minute'
  where id=v_attempt;

  v_resume := public.intensive_start_exam_sectioned(v_exam);

  select count(*) into v_count
  from public.intensive_exam_attempts
  where student_id=v_user and exam_id=v_exam;

  select * into v_result
  from public.intensive_results
  where attempt_id=v_attempt;

  insert into expiry_qa(payload)
  values(jsonb_build_object(
    'same_attempt_returned',(v_resume->>'attempt_id')::uuid=v_attempt,
    'expired_attempt_submitted',coalesce((v_resume->>'expired_attempt_submitted')::boolean,false),
    'section_finished',coalesce((v_resume->>'section_finished')::boolean,false),
    'attempt_count_still_one',v_count=1,
    'result_published',coalesce(v_result.is_published,false),
    'grading_status',v_result.grading_status
  ));
end
$$;

select payload from expiry_qa;

rollback;

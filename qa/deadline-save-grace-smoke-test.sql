-- NUMO INTENSIVE section-deadline transport grace smoke test
-- A one-second in-flight save may finish after the visible timer reaches zero,
-- but saves outside the two-second transport grace are rejected.
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table deadline_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_exam uuid;
  v_course uuid;
  v_session uuid := '14141414-9999-4999-8999-999999999999';
  v_start jsonb;
  v_attempt uuid;
  v_section uuid;
  v_question uuid;
  v_correct text;
  v_within_grace boolean := false;
  v_after_grace_blocked boolean := false;
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
      expiration_date=(timezone('Asia/Riyadh',now()))::date+7
  where id=v_user;

  insert into public.intensive_enrollments(
    student_id,course_id,start_date,expiration_date,is_active
  )
  values(
    v_user,
    v_course,
    (timezone('Asia/Riyadh',now()))::date-1,
    (timezone('Asia/Riyadh',now()))::date+7,
    true
  )
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
    'qa-deadline-device',
    'NUMO Deadline QA',
    '127.0.0.1'::inet
  );

  v_start := public.intensive_start_exam_sectioned(v_exam);
  v_attempt := (v_start->>'attempt_id')::uuid;
  v_section := (v_start->>'current_section_id')::uuid;

  select (item->>'id')::uuid
  into v_question
  from jsonb_array_elements(v_start->'questions') item
  where item->>'sectionId'=v_section::text
  limit 1;

  select key_item->>'correctOptionId'
  into v_correct
  from public.intensive_attempt_keys k
  cross join lateral jsonb_array_elements(k.key_data) key_item
  where k.attempt_id=v_attempt
    and key_item->>'questionId'=v_question::text
  limit 1;

  update public.intensive_exam_attempts
  set
    expires_at=now()-interval '1 second',
    current_section_expires_at=now()-interval '1 second'
  where id=v_attempt;

  begin
    perform public.intensive_save_answer_sectioned(
      v_attempt,
      v_question,
      to_jsonb(v_correct),
      false
    );
    v_within_grace := true;
  exception when others then
    v_within_grace := false;
  end;

  update public.intensive_exam_attempts
  set
    expires_at=now()-interval '3 seconds',
    current_section_expires_at=now()-interval '3 seconds'
  where id=v_attempt;

  begin
    perform public.intensive_save_answer_sectioned(
      v_attempt,
      v_question,
      to_jsonb(v_correct),
      false
    );
  exception when others then
    if sqlerrm like '%SECTION_EXPIRED%' or sqlerrm like '%ATTEMPT_EXPIRED%' then
      v_after_grace_blocked := true;
    else
      raise;
    end if;
  end;

  insert into deadline_qa(payload)
  values(jsonb_build_object(
    'one_second_transport_grace_saved',v_within_grace,
    'three_seconds_after_deadline_blocked',v_after_grace_blocked
  ));
end
$$;

select payload from deadline_qa;

rollback;

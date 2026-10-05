-- NUMO INTENSIVE resume/autosave/section-timer smoke test
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table resume_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_exam uuid;
  v_course uuid;
  v_session uuid := '13131313-8888-4888-8888-888888888888';
  v_start jsonb;
  v_resume jsonb;
  v_after_expiry jsonb;
  v_attempt uuid;
  v_section uuid;
  v_question uuid;
  v_correct text;
  v_answer_count integer;
  v_same_attempt boolean;
  v_advanced boolean;
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
    'qa-resume-device',
    'NUMO Resume QA',
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

  perform public.intensive_save_answer_sectioned(
    v_attempt,
    v_question,
    to_jsonb(v_correct),
    true
  );

  v_resume := public.intensive_start_exam_sectioned(v_exam);
  v_same_attempt := (v_resume->>'attempt_id')::uuid = v_attempt;
  v_answer_count := jsonb_array_length(coalesce(v_resume->'answers','[]'::jsonb));

  update public.intensive_exam_attempts
  set current_section_expires_at=now()-interval '1 second'
  where id=v_attempt;

  v_after_expiry := public.intensive_start_exam_sectioned(v_exam);
  v_advanced := (v_after_expiry->>'current_section_id')::uuid <> v_section;

  insert into resume_qa(payload)
  values(jsonb_build_object(
    'same_attempt_on_resume',v_same_attempt,
    'saved_answers_restored',v_answer_count=1,
    'saved_answer_count',v_answer_count,
    'expired_section_auto_advanced',v_advanced,
    'new_section_position',
      (select position
       from public.intensive_exam_sections
       where id=(v_after_expiry->>'current_section_id')::uuid)
  ));
end
$$;

select payload from resume_qa;

rollback;

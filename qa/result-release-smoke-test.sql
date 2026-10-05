-- NUMO INTENSIVE AFTER_END result-release smoke test
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table release_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_course uuid;
  v_exam uuid;
  v_section uuid;
  v_question uuid;
  v_correct uuid;
  v_attempt uuid;
  v_session uuid := '18181818-dddd-4ddd-8ddd-dddddddddddd';
  v_start jsonb;
  v_before boolean;
  v_after boolean;
  v_released integer;
begin
  select id into v_user
  from public.intensive_profiles
  where role='ADMIN'
  order by created_at
  limit 1;

  select id into v_course
  from public.intensive_courses
  where code='EL111'
  limit 1;

  if v_user is null then raise exception 'QA_ADMIN_REQUIRED'; end if;
  if v_course is null then raise exception 'QA_EL111_REQUIRED'; end if;

  update public.intensive_profiles
  set role='ADMIN',status='ACTIVE'
  where id=v_user;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_user,
      'role','authenticated',
      'session_id',v_session
    )::text,
    true
  );

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,starts_at,ends_at,
    duration_minutes,attempts_allowed,total_marks,passing_score,result_release,
    status,allow_answer_review,shuffle_questions,shuffle_answers,created_by
  )
  values(
    v_course,'QA AFTER_END Release','CUSTOM','Transactional QA',
    'Answer the question.',
    now()-interval '1 minute',now()+interval '1 hour',
    30,1,1,1,'AFTER_END','LIVE',false,false,false,v_user
  )
  returning id into v_exam;

  insert into public.intensive_exam_sections(
    exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes
  )
  values(v_exam,'Grammar','Release QA',1,1,1,true,30)
  returning id into v_section;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,grading_mode,marks,
    acceptable_answers,tags,is_active,created_by
  )
  values(
    v_course,'CUSTOM','Grammar','MULTIPLE_CHOICE','EASY',
    'Select the correct answer.','AUTO',1,'{}',array['QA_RELEASE'],true,v_user
  )
  returning id into v_question;

  insert into public.intensive_question_options(
    question_id,label,value,is_correct,position
  )
  values
    (v_question,'Correct','correct',true,1),
    (v_question,'Wrong','wrong',false,2);

  select id into v_correct
  from public.intensive_question_options
  where question_id=v_question
    and is_correct
  limit 1;

  insert into public.intensive_exam_questions(
    exam_id,section_id,question_id,marks,position
  )
  values(v_exam,v_section,v_question,1,1);

  insert into public.intensive_exam_assignments(
    exam_id,all_course_students,created_by
  )
  values(v_exam,true,v_user);

  update public.intensive_profiles
  set
    role='STUDENT',
    status='ACTIVE',
    start_date=(timezone('Asia/Riyadh',now()))::date-1,
    expiration_date=(timezone('Asia/Riyadh',now()))::date+7
  where id=v_user;

  insert into public.intensive_enrollments(
    student_id,course_id,start_date,expiration_date,is_active
  )
  values(
    v_user,v_course,
    (timezone('Asia/Riyadh',now()))::date-1,
    (timezone('Asia/Riyadh',now()))::date+7,
    true
  )
  on conflict(student_id,course_id)
  do update set
    start_date=excluded.start_date,
    expiration_date=excluded.expiration_date,
    is_active=true;

  delete from public.intensive_trusted_devices
  where student_id=v_user;

  perform public.intensive_register_or_verify_device(
    'qa-release-device',
    'NUMO Release QA',
    '127.0.0.1'::inet
  );

  v_start := public.intensive_start_exam_sectioned(v_exam);
  v_attempt := (v_start->>'attempt_id')::uuid;

  perform public.intensive_save_answer_sectioned(
    v_attempt,
    v_question,
    to_jsonb(v_correct::text),
    false
  );

  perform public.intensive_submit_attempt_sectioned(v_attempt);

  select is_published into v_before
  from public.intensive_results
  where attempt_id=v_attempt;

  update public.intensive_exams
  set
    ends_at=now()-interval '1 second',
    status='CLOSED'
  where id=v_exam;

  v_released := public.intensive_release_due_results();

  select is_published into v_after
  from public.intensive_results
  where attempt_id=v_attempt;

  insert into release_qa(payload)
  values(jsonb_build_object(
    'unpublished_before_end',not coalesce(v_before,true),
    'released_rows',v_released,
    'published_after_end',coalesce(v_after,false)
  ));
end
$$;

select payload from release_qa;

rollback;

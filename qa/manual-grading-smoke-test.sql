-- NUMO INTENSIVE manual-grading smoke test
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table manual_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_course uuid;
  v_exam uuid;
  v_section uuid;
  v_question uuid;
  v_attempt uuid;
  v_answer_id uuid;
  v_session uuid := '17171717-cccc-4ccc-8ccc-cccccccccccc';
  v_start jsonb;
  v_submit jsonb;
  v_finalize jsonb;
  v_result public.intensive_results%rowtype;
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
    v_course,'QA Manual Grading','CUSTOM','Transactional QA',
    'Answer the written question.',
    now()-interval '1 minute',now()+interval '1 day',
    30,1,5,3,'IMMEDIATE','LIVE',false,false,false,v_user
  )
  returning id into v_exam;

  insert into public.intensive_exam_sections(
    exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes
  )
  values(v_exam,'Writing','Manual grading QA',1,5,1,true,30)
  returning id into v_section;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,grading_mode,marks,
    acceptable_answers,tags,is_active,created_by
  )
  values(
    v_course,'CUSTOM','Writing','SHORT_ANSWER','MEDIUM',
    'Write one sentence for manual grading.','MANUAL',5,
    '{}',array['QA_MANUAL'],true,v_user
  )
  returning id into v_question;

  insert into public.intensive_exam_questions(
    exam_id,section_id,question_id,marks,position
  )
  values(v_exam,v_section,v_question,5,1);

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
    'qa-manual-device',
    'NUMO Manual QA',
    '127.0.0.1'::inet
  );

  v_start := public.intensive_start_exam_sectioned(v_exam);
  v_attempt := (v_start->>'attempt_id')::uuid;

  perform public.intensive_save_answer_sectioned(
    v_attempt,
    v_question,
    to_jsonb('A manually graded answer.'::text),
    false
  );

  select id into v_answer_id
  from public.intensive_student_answers
  where attempt_id=v_attempt
    and question_id=v_question;

  v_submit := public.intensive_submit_attempt_sectioned(v_attempt);

  update public.intensive_profiles
  set role='ADMIN'
  where id=v_user;

  update public.intensive_student_answers
  set
    score=4,
    auto_graded=false,
    admin_feedback='Good answer.',
    graded_at=now(),
    graded_by=v_user
  where id=v_answer_id;

  v_finalize := public.intensive_finalize_grading(v_attempt,true);

  select * into v_result
  from public.intensive_results
  where attempt_id=v_attempt;

  insert into manual_qa(payload)
  values(jsonb_build_object(
    'submitted_pending_before_grade',coalesce((v_submit->>'pending_grading')::boolean,false),
    'finalize_complete',coalesce((v_finalize->>'complete')::boolean,false),
    'final_score',v_result.final_score,
    'total_marks',v_result.total_marks,
    'percentage',v_result.percentage,
    'grading_status',v_result.grading_status,
    'published',v_result.is_published,
    'result_status',v_result.status
  ));
end
$$;

select payload from manual_qa;

rollback;

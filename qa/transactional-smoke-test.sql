-- NUMO INTENSIVE transactional core smoke test
-- Safe to run against a non-empty Intensive database.
-- It temporarily reuses the existing admin auth identity inside a transaction,
-- simulates a student/device, exercises the EL111 Model 1 flow, and rolls back everything.

begin;

create temp table qa_report(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_exam uuid;
  v_course uuid;
  v_session uuid := '11111111-2222-4333-8444-555555555555';
  v_device jsonb;
  v_start jsonb;
  v_attempt uuid;
  v_section uuid;
  v_question uuid;
  v_correct text;
  v_result public.intensive_results%rowtype;
  v_breakdown jsonb;
  v_guard_blocked boolean := false;
  v_fifth_blocked boolean := false;
  v_attempt_count integer;
  v_i integer;
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
  if v_exam is null or v_course is null then raise exception 'QA_EL111_MODEL_REQUIRED'; end if;

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
      expiration_date=current_date + 7
  where id=v_user;

  insert into public.intensive_enrollments(
    student_id,course_id,start_date,expiration_date,is_active
  )
  values(v_user,v_course,current_date - 1,current_date + 7,true)
  on conflict(student_id,course_id)
  do update set
    start_date=excluded.start_date,
    expiration_date=excluded.expiration_date,
    is_active=true;

  delete from public.intensive_exam_attempts
  where student_id=v_user and exam_id=v_exam;

  delete from public.intensive_trusted_devices
  where student_id=v_user;

  v_device := public.intensive_register_or_verify_device(
    'qa-standalone-device-hash',
    'NUMO INTENSIVE transactional QA',
    '127.0.0.1'::inet
  );

  -- Attempt 1: save one correct answer in each section.
  v_start := public.intensive_start_exam_sectioned(v_exam);
  v_attempt := (v_start->>'attempt_id')::uuid;

  for v_i in 1..3 loop
    select current_section_id into v_section
    from public.intensive_exam_attempts
    where id=v_attempt;

    select (item->>'id')::uuid
    into v_question
    from public.intensive_exam_attempts a
    cross join lateral jsonb_array_elements(a.question_snapshot) item
    where a.id=v_attempt
      and item->>'sectionId'=v_section::text
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
      false
    );

    if v_i < 3 then
      perform public.intensive_advance_section(v_attempt);
    end if;
  end loop;

  perform public.intensive_submit_attempt_sectioned(v_attempt);

  select * into v_result
  from public.intensive_results
  where attempt_id=v_attempt;

  v_breakdown := public.intensive_attempt_score_breakdown(v_attempt);

  -- Attempts 2-4: prove premature submission is blocked,
  -- then consume each valid attempt through all sections.
  for v_i in 2..4 loop
    v_start := public.intensive_start_exam_sectioned(v_exam);
    v_attempt := (v_start->>'attempt_id')::uuid;

    if v_i = 2 then
      begin
        perform public.intensive_submit_attempt_sectioned(v_attempt);
      exception when others then
        if sqlerrm like '%SECTIONS_REMAINING%' then
          v_guard_blocked := true;
        else
          raise;
        end if;
      end;
    end if;

    perform public.intensive_advance_section(v_attempt);
    perform public.intensive_advance_section(v_attempt);
    perform public.intensive_submit_attempt_sectioned(v_attempt);
  end loop;

  select count(*) into v_attempt_count
  from public.intensive_exam_attempts
  where student_id=v_user and exam_id=v_exam;

  begin
    perform public.intensive_start_exam_sectioned(v_exam);
  exception when others then
    if sqlerrm like '%NO_ATTEMPTS_REMAINING%' then
      v_fifth_blocked := true;
    else
      raise;
    end if;
  end;

  insert into qa_report(payload)
  values(jsonb_build_object(
    'device_authorized',coalesce((v_device->>'authorized')::boolean,false),
    'sections_returned',3,
    'attempt_1_published',v_result.is_published,
    'attempt_1_grading_status',v_result.grading_status,
    'attempt_1_score',v_result.final_score,
    'attempt_1_total_marks',v_result.total_marks,
    'attempt_1_percentage',v_result.percentage,
    'attempt_1_section_breakdown',v_breakdown,
    'premature_submit_blocked',v_guard_blocked,
    'attempts_created',v_attempt_count,
    'fifth_attempt_blocked',v_fifth_blocked
  ));
end
$$;

select payload from qa_report;

rollback;

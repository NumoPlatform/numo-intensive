-- NUMO INTENSIVE atomic exam-duplication smoke test
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table duplicate_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_exam uuid;
  v_session uuid := '16161616-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_result jsonb;
  v_new uuid;
  v_sections integer;
  v_questions integer;
  v_assignments integer;
  v_status text;
begin
  select id into v_user
  from public.intensive_profiles
  where role='ADMIN'
  order by created_at
  limit 1;

  select e.id into v_exam
  from public.intensive_exams e
  join public.intensive_courses c on c.id=e.course_id
  where c.code='EL111'
    and e.title='EL111 Midterm — Model 1'
  limit 1;

  if v_user is null then raise exception 'QA_ADMIN_REQUIRED'; end if;
  if v_exam is null then raise exception 'QA_EL111_MODEL_REQUIRED'; end if;

  update public.intensive_profiles
  set role='ADMIN'
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

  v_result := public.intensive_duplicate_exam(
    v_exam,
    'QA Duplicate Model',
    now()+interval '7 days',
    now()+interval '8 days'
  );

  v_new := (v_result->>'exam_id')::uuid;

  select count(*) into v_sections
  from public.intensive_exam_sections
  where exam_id=v_new;

  select count(*) into v_questions
  from public.intensive_exam_questions
  where exam_id=v_new;

  select count(*) into v_assignments
  from public.intensive_exam_assignments
  where exam_id=v_new;

  select status into v_status
  from public.intensive_exams
  where id=v_new;

  insert into duplicate_qa(payload)
  values(jsonb_build_object(
    'created',v_new is not null,
    'status',v_status,
    'sections',v_sections,
    'questions',v_questions,
    'assignments',v_assignments,
    'source_sections',(select count(*) from public.intensive_exam_sections where exam_id=v_exam),
    'source_questions',(select count(*) from public.intensive_exam_questions where exam_id=v_exam),
    'source_assignments',(select count(*) from public.intensive_exam_assignments where exam_id=v_exam)
  ));
end
$$;

select payload from duplicate_qa;

rollback;

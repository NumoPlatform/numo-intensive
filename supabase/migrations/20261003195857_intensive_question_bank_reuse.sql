create or replace function public.intensive_admin_attach_question(
  p_question_id uuid,
  p_exam_id uuid,
  p_section_id uuid,
  p_marks numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_question public.intensive_questions%rowtype;
  v_exam public.intensive_exams%rowtype;
  v_section public.intensive_exam_sections%rowtype;
  v_marks numeric(8,2);
  v_position integer;
begin
  if auth.uid() is null or not public.intensive_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into v_question
  from public.intensive_questions
  where id = p_question_id
  for share;

  if not found then raise exception 'QUESTION_NOT_FOUND'; end if;
  if not v_question.is_active then raise exception 'QUESTION_INACTIVE'; end if;

  select * into v_exam
  from public.intensive_exams
  where id = p_exam_id
  for update;

  if not found then raise exception 'EXAM_NOT_FOUND'; end if;
  if v_exam.status = 'ARCHIVED' then raise exception 'EXAM_ARCHIVED'; end if;
  if v_question.course_id <> v_exam.course_id then raise exception 'QUESTION_COURSE_MISMATCH'; end if;

  select * into v_section
  from public.intensive_exam_sections
  where id = p_section_id and exam_id = p_exam_id
  for update;

  if not found then raise exception 'SECTION_NOT_FOUND'; end if;

  if exists(
    select 1 from public.intensive_exam_questions
    where exam_id = p_exam_id and question_id = p_question_id
  ) then
    raise exception 'QUESTION_ALREADY_IN_EXAM';
  end if;

  v_marks := coalesce(p_marks, v_question.marks);
  if v_marks is null or v_marks <= 0 or v_marks > 1000 then
    raise exception 'INVALID_QUESTION_MARKS';
  end if;

  select coalesce(max(position), 0) + 1
  into v_position
  from public.intensive_exam_questions
  where exam_id = p_exam_id and section_id = p_section_id;

  insert into public.intensive_exam_questions(
    exam_id, section_id, question_id, marks, position
  )
  values(
    p_exam_id, p_section_id, p_question_id, v_marks, v_position
  );

  update public.intensive_exam_sections s
  set
    marks = coalesce(x.total_marks, 0),
    question_count = coalesce(x.question_count, 0),
    updated_at = now()
  from (
    select
      p_section_id as section_id,
      coalesce(sum(eq.marks), 0) as total_marks,
      count(eq.id)::integer as question_count
    from public.intensive_exam_questions eq
    where eq.section_id = p_section_id
  ) x
  where s.id = x.section_id;

  update public.intensive_exams e
  set
    total_marks = coalesce(x.total_marks, 0),
    updated_at = now()
  from (
    select
      p_exam_id as exam_id,
      coalesce(sum(eq.marks), 0) as total_marks
    from public.intensive_exam_questions eq
    where eq.exam_id = p_exam_id
  ) x
  where e.id = x.exam_id;

  insert into public.intensive_audit_logs(
    admin_id, action, target_type, target_id, details
  )
  values(
    auth.uid(),
    'ATTACH_BANK_QUESTION',
    'intensive_questions',
    p_question_id::text,
    jsonb_build_object(
      'exam_id', p_exam_id,
      'section_id', p_section_id,
      'marks', v_marks
    )
  );

  return jsonb_build_object(
    'question_id', p_question_id,
    'exam_id', p_exam_id,
    'section_id', p_section_id,
    'position', v_position,
    'marks', v_marks
  );
end
$$;

revoke all on function public.intensive_admin_attach_question(uuid,uuid,uuid,numeric) from public;
grant execute on function public.intensive_admin_attach_question(uuid,uuid,uuid,numeric) to authenticated;
grant execute on function public.intensive_admin_attach_question(uuid,uuid,uuid,numeric) to service_role;

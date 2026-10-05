create or replace function public.intensive_duplicate_exam(
  p_source_exam_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_source public.intensive_exams%rowtype;
  v_new_exam_id uuid;
  v_section public.intensive_exam_sections%rowtype;
  v_new_section_id uuid;
  v_title text := btrim(coalesce(p_title,''));
begin
  if auth.uid() is null or not public.intensive_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if length(v_title) < 2 or length(v_title) > 160 then
    raise exception 'INVALID_TITLE';
  end if;

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'INVALID_SCHEDULE';
  end if;

  select * into v_source
  from public.intensive_exams
  where id=p_source_exam_id;

  if not found then
    raise exception 'EXAM_NOT_FOUND';
  end if;

  insert into public.intensive_exams(
    course_id,
    title,
    category,
    description,
    instructions,
    starts_at,
    ends_at,
    duration_minutes,
    attempts_allowed,
    total_marks,
    passing_score,
    result_release,
    status,
    allow_answer_review,
    shuffle_questions,
    shuffle_answers,
    created_by
  )
  values(
    v_source.course_id,
    v_title,
    v_source.category,
    v_source.description,
    v_source.instructions,
    p_starts_at,
    p_ends_at,
    v_source.duration_minutes,
    v_source.attempts_allowed,
    v_source.total_marks,
    v_source.passing_score,
    v_source.result_release,
    'DRAFT',
    v_source.allow_answer_review,
    v_source.shuffle_questions,
    v_source.shuffle_answers,
    auth.uid()
  )
  returning id into v_new_exam_id;

  for v_section in
    select *
    from public.intensive_exam_sections
    where exam_id=p_source_exam_id
    order by position
  loop
    insert into public.intensive_exam_sections(
      exam_id,
      title,
      instructions,
      position,
      marks,
      question_count,
      is_enabled,
      time_limit_minutes
    )
    values(
      v_new_exam_id,
      v_section.title,
      v_section.instructions,
      v_section.position,
      v_section.marks,
      v_section.question_count,
      v_section.is_enabled,
      v_section.time_limit_minutes
    )
    returning id into v_new_section_id;

    insert into public.intensive_exam_questions(
      exam_id,
      section_id,
      question_id,
      marks,
      position
    )
    select
      v_new_exam_id,
      v_new_section_id,
      eq.question_id,
      eq.marks,
      eq.position
    from public.intensive_exam_questions eq
    where eq.exam_id=p_source_exam_id
      and eq.section_id=v_section.id;

    insert into public.intensive_exam_pool_rules(
      exam_id,
      section_id,
      skill,
      question_type,
      difficulty,
      tags,
      question_count,
      marks_each
    )
    select
      v_new_exam_id,
      v_new_section_id,
      pr.skill,
      pr.question_type,
      pr.difficulty,
      pr.tags,
      pr.question_count,
      pr.marks_each
    from public.intensive_exam_pool_rules pr
    where pr.exam_id=p_source_exam_id
      and pr.section_id=v_section.id;
  end loop;

  insert into public.intensive_exam_assignments(
    exam_id,
    student_id,
    group_id,
    all_course_students,
    created_by
  )
  select
    v_new_exam_id,
    a.student_id,
    a.group_id,
    a.all_course_students,
    auth.uid()
  from public.intensive_exam_assignments a
  where a.exam_id=p_source_exam_id;

  insert into public.intensive_audit_logs(
    admin_id,
    action,
    target_type,
    target_id,
    details
  )
  values(
    auth.uid(),
    'DUPLICATE_EXAM',
    'intensive_exams',
    v_new_exam_id::text,
    jsonb_build_object(
      'source_exam_id',p_source_exam_id,
      'title',v_title
    )
  );

  return jsonb_build_object(
    'ok',true,
    'exam_id',v_new_exam_id,
    'title',v_title,
    'status','DRAFT'
  );
end
$$;

revoke all on function public.intensive_duplicate_exam(uuid,text,timestamptz,timestamptz) from public, anon;
grant execute on function public.intensive_duplicate_exam(uuid,text,timestamptz,timestamptz) to authenticated, service_role;

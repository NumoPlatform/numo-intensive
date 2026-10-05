create or replace function public.intensive_admin_create_exam(
  p_course_id uuid,
  p_title text,
  p_category text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_duration_minutes integer,
  p_skills jsonb,
  p_attempts_allowed integer default 1,
  p_result_release text default 'MANUAL'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_exam_id uuid;
  v_skill text;
  v_position integer := 0;
  v_sections jsonb := '[]'::jsonb;
  v_section_id uuid;
begin
  if auth.uid() is null or not public.intensive_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_title is null or length(btrim(p_title)) < 2 or length(btrim(p_title)) > 160 then
    raise exception 'INVALID_EXAM_TITLE';
  end if;

  if p_category not in ('QUIZ 1','QUIZ 2','MIDTERM','FINAL','MOCK EXAM','PRACTICE EXAM','CUSTOM') then
    raise exception 'INVALID_EXAM_CATEGORY';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'INVALID_EXAM_WINDOW';
  end if;

  if p_duration_minutes < 1 or p_duration_minutes > 480 then
    raise exception 'INVALID_EXAM_DURATION';
  end if;

  if p_attempts_allowed < 1 or p_attempts_allowed > 20 then
    raise exception 'INVALID_ATTEMPTS_ALLOWED';
  end if;

  if p_result_release not in ('IMMEDIATE','AFTER_END','MANUAL') then
    raise exception 'INVALID_RESULT_RELEASE';
  end if;

  if jsonb_typeof(p_skills) <> 'array' or jsonb_array_length(p_skills) <> 4 then
    raise exception 'FOUR_SKILLS_REQUIRED';
  end if;

  if not exists (
    select 1 from public.intensive_courses
    where id = p_course_id and is_active
  ) then
    raise exception 'COURSE_NOT_FOUND';
  end if;

  if (
    select count(distinct lower(btrim(value)))
    from jsonb_array_elements_text(p_skills)
    where length(btrim(value)) between 1 and 80
  ) <> 4 then
    raise exception 'FOUR_UNIQUE_SKILLS_REQUIRED';
  end if;

  insert into public.intensive_exams(
    course_id,
    title,
    category,
    description,
    starts_at,
    ends_at,
    duration_minutes,
    attempts_allowed,
    total_marks,
    result_release,
    status,
    created_by
  )
  values(
    p_course_id,
    btrim(p_title),
    p_category,
    nullif(btrim(coalesce(p_description,'')), ''),
    p_starts_at,
    p_ends_at,
    p_duration_minutes,
    p_attempts_allowed,
    0,
    p_result_release,
    'SCHEDULED',
    auth.uid()
  )
  returning id into v_exam_id;

  for v_skill in
    select btrim(value)
    from jsonb_array_elements_text(p_skills)
  loop
    v_position := v_position + 1;
    insert into public.intensive_exam_sections(
      exam_id,
      title,
      position,
      marks,
      question_count,
      is_enabled
    )
    values(
      v_exam_id,
      v_skill,
      v_position,
      0,
      0,
      true
    )
    returning id into v_section_id;

    v_sections := v_sections || jsonb_build_array(
      jsonb_build_object(
        'id', v_section_id,
        'title', v_skill,
        'position', v_position
      )
    );
  end loop;

  insert into public.intensive_exam_assignments(
    exam_id,
    all_course_students,
    created_by
  )
  values(v_exam_id, true, auth.uid());

  insert into public.intensive_audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values(
    auth.uid(),
    'CREATE_EXAM',
    'intensive_exams',
    v_exam_id,
    jsonb_build_object(
      'course_id', p_course_id,
      'category', p_category,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    )
  );

  return jsonb_build_object(
    'exam_id', v_exam_id,
    'sections', v_sections
  );
end
$function$;

revoke all on function public.intensive_admin_create_exam(uuid,text,text,text,timestamptz,timestamptz,integer,jsonb,integer,text)
from public, anon;
grant execute on function public.intensive_admin_create_exam(uuid,text,text,text,timestamptz,timestamptz,integer,jsonb,integer,text)
to authenticated, service_role;

create or replace function public.intensive_admin_add_question(
  p_exam_id uuid,
  p_section_id uuid,
  p_skill text,
  p_type text,
  p_prompt text,
  p_marks numeric,
  p_difficulty text default 'MEDIUM',
  p_options jsonb default null,
  p_correct_boolean boolean default null,
  p_acceptable_answers text[] default '{}',
  p_grading_mode text default 'AUTO',
  p_passage_title text default null,
  p_passage_body text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_exam public.intensive_exams%rowtype;
  v_section public.intensive_exam_sections%rowtype;
  v_question_id uuid;
  v_passage_id uuid;
  v_position integer;
  v_option jsonb;
  v_option_position integer := 0;
  v_correct_count integer := 0;
begin
  if auth.uid() is null or not public.intensive_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into v_exam
  from public.intensive_exams
  where id = p_exam_id
  for update;

  if not found then
    raise exception 'EXAM_NOT_FOUND';
  end if;

  select * into v_section
  from public.intensive_exam_sections
  where id = p_section_id and exam_id = p_exam_id
  for update;

  if not found then
    raise exception 'SECTION_NOT_FOUND';
  end if;

  if p_type not in ('MULTIPLE_CHOICE','TRUE_FALSE','SHORT_ANSWER') then
    raise exception 'INVALID_QUESTION_TYPE';
  end if;

  if p_difficulty not in ('EASY','MEDIUM','HARD') then
    raise exception 'INVALID_DIFFICULTY';
  end if;

  if p_marks is null or p_marks <= 0 or p_marks > 1000 then
    raise exception 'INVALID_QUESTION_MARKS';
  end if;

  if p_prompt is null or length(btrim(p_prompt)) < 1 then
    raise exception 'QUESTION_PROMPT_REQUIRED';
  end if;

  if p_skill is null or length(btrim(p_skill)) < 1 or length(btrim(p_skill)) > 80 then
    raise exception 'QUESTION_SKILL_REQUIRED';
  end if;

  if p_type <> 'SHORT_ANSWER' and p_grading_mode <> 'AUTO' then
    raise exception 'OBJECTIVE_QUESTIONS_MUST_BE_AUTO_GRADED';
  end if;

  if p_grading_mode not in ('AUTO','MANUAL') then
    raise exception 'INVALID_GRADING_MODE';
  end if;

  if p_type = 'MULTIPLE_CHOICE' then
    if p_options is null
       or jsonb_typeof(p_options) <> 'array'
       or jsonb_array_length(p_options) < 2
       or jsonb_array_length(p_options) > 10 then
      raise exception 'MCQ_OPTIONS_REQUIRED';
    end if;

    select count(*)
    into v_correct_count
    from jsonb_array_elements(p_options) item
    where coalesce((item->>'isCorrect')::boolean, false);

    if v_correct_count <> 1 then
      raise exception 'MCQ_REQUIRES_ONE_CORRECT_OPTION';
    end if;
  end if;

  if p_type = 'TRUE_FALSE' and p_correct_boolean is null then
    raise exception 'TRUE_FALSE_CORRECT_ANSWER_REQUIRED';
  end if;

  if p_type = 'SHORT_ANSWER'
     and p_grading_mode = 'AUTO'
     and coalesce(cardinality(p_acceptable_answers), 0) = 0 then
    raise exception 'SHORT_ANSWER_ACCEPTABLE_ANSWER_REQUIRED';
  end if;

  if nullif(btrim(coalesce(p_passage_body,'')), '') is not null then
    insert into public.intensive_passages(
      course_id,
      title,
      body,
      created_by
    )
    values(
      v_exam.course_id,
      coalesce(nullif(btrim(coalesce(p_passage_title,'')), ''), 'Reading Passage'),
      btrim(p_passage_body),
      auth.uid()
    )
    returning id into v_passage_id;
  end if;

  insert into public.intensive_questions(
    course_id,
    exam_category,
    skill,
    type,
    difficulty,
    prompt,
    passage_id,
    grading_mode,
    acceptable_answers,
    correct_boolean,
    marks,
    created_by
  )
  values(
    v_exam.course_id,
    v_exam.category,
    btrim(p_skill),
    p_type,
    p_difficulty,
    btrim(p_prompt),
    v_passage_id,
    p_grading_mode,
    coalesce(p_acceptable_answers, '{}'),
    p_correct_boolean,
    p_marks,
    auth.uid()
  )
  returning id into v_question_id;

  if p_type = 'MULTIPLE_CHOICE' then
    for v_option in
      select value
      from jsonb_array_elements(p_options)
    loop
      v_option_position := v_option_position + 1;
      if nullif(btrim(coalesce(v_option->>'label','')), '') is null then
        raise exception 'OPTION_LABEL_REQUIRED';
      end if;

      insert into public.intensive_question_options(
        question_id,
        label,
        value,
        is_correct,
        position
      )
      values(
        v_question_id,
        btrim(v_option->>'label'),
        coalesce(nullif(btrim(coalesce(v_option->>'value','')), ''), btrim(v_option->>'label')),
        coalesce((v_option->>'isCorrect')::boolean, false),
        v_option_position
      );
    end loop;
  end if;

  select coalesce(max(position), 0) + 1
  into v_position
  from public.intensive_exam_questions
  where exam_id = p_exam_id and section_id = p_section_id;

  insert into public.intensive_exam_questions(
    exam_id,
    section_id,
    question_id,
    marks,
    position
  )
  values(
    p_exam_id,
    p_section_id,
    v_question_id,
    p_marks,
    v_position
  );

  update public.intensive_exam_sections s
  set
    marks = x.total_marks,
    question_count = x.question_count,
    updated_at = now()
  from (
    select
      section_id,
      coalesce(sum(marks),0) as total_marks,
      count(*)::integer as question_count
    from public.intensive_exam_questions
    where section_id = p_section_id
    group by section_id
  ) x
  where s.id = x.section_id;

  update public.intensive_exams e
  set
    total_marks = x.total_marks,
    updated_at = now()
  from (
    select exam_id, coalesce(sum(marks),0) as total_marks
    from public.intensive_exam_questions
    where exam_id = p_exam_id
    group by exam_id
  ) x
  where e.id = x.exam_id;

  insert into public.intensive_audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values(
    auth.uid(),
    'ADD_EXAM_QUESTION',
    'intensive_questions',
    v_question_id,
    jsonb_build_object(
      'exam_id', p_exam_id,
      'section_id', p_section_id,
      'type', p_type,
      'marks', p_marks
    )
  );

  return jsonb_build_object(
    'question_id', v_question_id,
    'passage_id', v_passage_id,
    'position', v_position
  );
end
$function$;

revoke all on function public.intensive_admin_add_question(uuid,uuid,text,text,text,numeric,text,jsonb,boolean,text[],text,text,text)
from public, anon;
grant execute on function public.intensive_admin_add_question(uuid,uuid,text,text,text,numeric,text,jsonb,boolean,text[],text,text,text)
to authenticated, service_role;

-- Allow NUMO INTENSIVE exam builder to use the production three-section structure:
-- Grammar, Vocabulary, Reading. Keep database compatibility for 1-4 unique
-- sections so existing legacy exams are not broken.

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
  v_skill_count integer;
  v_unique_count integer;
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

  if jsonb_typeof(p_skills) <> 'array' then
    raise exception 'INVALID_SECTIONS';
  end if;

  v_skill_count := jsonb_array_length(p_skills);
  if v_skill_count < 1 or v_skill_count > 4 then
    raise exception 'INVALID_SECTIONS';
  end if;

  select count(distinct lower(btrim(value)))
  into v_unique_count
  from jsonb_array_elements_text(p_skills)
  where length(btrim(value)) between 1 and 80;

  if v_unique_count <> v_skill_count then
    raise exception 'SECTIONS_MUST_BE_UNIQUE';
  end if;

  if not exists (
    select 1 from public.intensive_courses
    where id = p_course_id and is_active
  ) then
    raise exception 'COURSE_NOT_FOUND';
  end if;

  insert into public.intensive_exams(
    course_id,title,category,description,starts_at,ends_at,duration_minutes,
    attempts_allowed,total_marks,result_release,status,created_by
  )
  values(
    p_course_id,btrim(p_title),p_category,
    nullif(btrim(coalesce(p_description,'')), ''),
    p_starts_at,p_ends_at,p_duration_minutes,p_attempts_allowed,0,
    p_result_release,'SCHEDULED',auth.uid()
  )
  returning id into v_exam_id;

  for v_skill in
    select btrim(value)
    from jsonb_array_elements_text(p_skills)
  loop
    v_position := v_position + 1;
    insert into public.intensive_exam_sections(
      exam_id,title,position,marks,question_count,is_enabled
    )
    values(v_exam_id,v_skill,v_position,0,0,true)
    returning id into v_section_id;

    v_sections := v_sections || jsonb_build_array(
      jsonb_build_object('id',v_section_id,'title',v_skill,'position',v_position)
    );
  end loop;

  insert into public.intensive_exam_assignments(exam_id,all_course_students,created_by)
  values(v_exam_id,true,auth.uid());

  insert into public.intensive_audit_logs(
    admin_id,action,target_type,target_id,details
  )
  values(
    auth.uid(),
    'CREATE_EXAM',
    'intensive_exams',
    v_exam_id::text,
    jsonb_build_object(
      'course_id',p_course_id,
      'category',p_category,
      'starts_at',p_starts_at,
      'ends_at',p_ends_at,
      'sections',p_skills
    )
  );

  return jsonb_build_object('exam_id',v_exam_id,'sections',v_sections);
end
$function$;

revoke all on function public.intensive_admin_create_exam(uuid,text,text,text,timestamptz,timestamptz,integer,jsonb,integer,text)
from public, anon;
grant execute on function public.intensive_admin_create_exam(uuid,text,text,text,timestamptz,timestamptz,integer,jsonb,integer,text)
to authenticated, service_role;

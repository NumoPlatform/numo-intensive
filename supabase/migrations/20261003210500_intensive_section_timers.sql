alter table public.intensive_exam_sections
  add column if not exists time_limit_minutes integer not null default 30;

alter table public.intensive_exam_sections
  drop constraint if exists intensive_exam_sections_time_limit_minutes_check;

alter table public.intensive_exam_sections
  add constraint intensive_exam_sections_time_limit_minutes_check
  check (time_limit_minutes between 1 and 240);

alter table public.intensive_exam_attempts
  add column if not exists current_section_id uuid references public.intensive_exam_sections(id) on delete set null,
  add column if not exists current_section_started_at timestamptz,
  add column if not exists current_section_expires_at timestamptz,
  add column if not exists section_progress jsonb not null default '{}'::jsonb;

create index if not exists intensive_attempts_current_section_idx
  on public.intensive_exam_attempts(current_section_id)
  where current_section_id is not null;

create or replace function public.intensive_advance_section(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.intensive_exam_attempts%rowtype;
  v_exam public.intensive_exams%rowtype;
  v_current public.intensive_exam_sections%rowtype;
  v_next public.intensive_exam_sections%rowtype;
  v_expiry timestamptz;
  v_progress jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.intensive_has_active_device() then
    raise exception 'DEVICE_NOT_AUTHORIZED';
  end if;

  select * into v_attempt
  from public.intensive_exam_attempts
  where id = p_attempt_id and student_id = auth.uid()
  for update;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status <> 'IN_PROGRESS' then raise exception 'ATTEMPT_NOT_ACTIVE'; end if;

  if now() >= v_attempt.expires_at then
    return jsonb_build_object(
      'finished', true,
      'attempt_id', p_attempt_id,
      'reason', 'ATTEMPT_TIME_EXPIRED'
    );
  end if;

  select * into v_exam
  from public.intensive_exams
  where id = v_attempt.exam_id;

  if v_attempt.current_section_id is null then
    select * into v_next
    from public.intensive_exam_sections
    where exam_id = v_attempt.exam_id and is_enabled
    order by position
    limit 1;
  else
    select * into v_current
    from public.intensive_exam_sections
    where id = v_attempt.current_section_id;

    v_progress := coalesce(v_attempt.section_progress, '{}'::jsonb);
    v_progress := jsonb_set(
      v_progress,
      array[v_attempt.current_section_id::text],
      jsonb_build_object(
        'started_at', v_attempt.current_section_started_at,
        'expires_at', v_attempt.current_section_expires_at,
        'completed_at', now()
      ),
      true
    );

    select * into v_next
    from public.intensive_exam_sections
    where exam_id = v_attempt.exam_id
      and is_enabled
      and position > coalesce(v_current.position, 0)
    order by position
    limit 1;
  end if;

  if v_next.id is null then
    update public.intensive_exam_attempts
    set
      current_section_id = null,
      current_section_started_at = null,
      current_section_expires_at = null,
      section_progress = coalesce(v_progress, section_progress, '{}'::jsonb),
      updated_at = now()
    where id = p_attempt_id;

    return jsonb_build_object(
      'finished', true,
      'attempt_id', p_attempt_id
    );
  end if;

  v_expiry := least(
    now() + make_interval(mins => v_next.time_limit_minutes),
    v_exam.ends_at,
    v_attempt.expires_at
  );

  update public.intensive_exam_attempts
  set
    current_section_id = v_next.id,
    current_section_started_at = now(),
    current_section_expires_at = v_expiry,
    section_progress = coalesce(v_progress, section_progress, '{}'::jsonb),
    updated_at = now()
  where id = p_attempt_id;

  return jsonb_build_object(
    'finished', false,
    'attempt_id', p_attempt_id,
    'section_id', v_next.id,
    'section_title', v_next.title,
    'section_position', v_next.position,
    'time_limit_minutes', v_next.time_limit_minutes,
    'section_expires_at', v_expiry
  );
end
$$;

create or replace function public.intensive_start_exam_sectioned(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_base jsonb;
  v_attempt_id uuid;
  v_attempt public.intensive_exam_attempts%rowtype;
  v_advance jsonb;
  v_sections jsonb;
  v_saved_answers jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.intensive_has_active_device() then
    raise exception 'DEVICE_NOT_AUTHORIZED';
  end if;

  -- If the student comes back after the total attempt deadline, finish that
  -- attempt first. Do not silently consume it and open the next attempt.
  select * into v_attempt
  from public.intensive_exam_attempts
  where exam_id = p_exam_id
    and student_id = auth.uid()
    and status = 'IN_PROGRESS'
  order by attempt_number desc
  limit 1
  for update;

  if found and now() > v_attempt.expires_at then
    update public.intensive_exam_attempts
    set
      status = 'EXPIRED',
      submitted_at = coalesce(submitted_at, expires_at),
      current_section_id = null,
      current_section_started_at = null,
      current_section_expires_at = null,
      updated_at = now()
    where id = v_attempt.id;

    perform public.intensive_submit_attempt(v_attempt.id);

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'questionId', sa.question_id,
          'answer', sa.answer,
          'flagged', sa.is_flagged,
          'savedAt', sa.saved_at
        )
        order by sa.saved_at
      ),
      '[]'::jsonb
    )
    into v_saved_answers
    from public.intensive_student_answers sa
    where sa.attempt_id = v_attempt.id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'title', s.title,
          'position', s.position,
          'timeLimitMinutes', s.time_limit_minutes
        )
        order by s.position
      ),
      '[]'::jsonb
    )
    into v_sections
    from public.intensive_exam_sections s
    where s.exam_id = p_exam_id and s.is_enabled;

    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'expires_at', v_attempt.expires_at,
      'questions', v_attempt.question_snapshot,
      'answers', v_saved_answers,
      'resumed', true,
      'sections', v_sections,
      'current_section_id', null,
      'current_section_expires_at', null,
      'section_finished', true,
      'expired_attempt_submitted', true
    );
  end if;

  v_base := public.intensive_start_exam(p_exam_id);
  v_attempt_id := (v_base->>'attempt_id')::uuid;

  select * into v_attempt
  from public.intensive_exam_attempts
  where id = v_attempt_id
  for update;

  if v_attempt.current_section_id is null then
    v_advance := public.intensive_advance_section(v_attempt_id);
  elsif v_attempt.current_section_expires_at is not null
    and v_attempt.current_section_expires_at <= now() then
    v_advance := public.intensive_advance_section(v_attempt_id);
  else
    v_advance := jsonb_build_object(
      'finished', false,
      'attempt_id', v_attempt_id,
      'section_id', v_attempt.current_section_id,
      'section_expires_at', v_attempt.current_section_expires_at
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'position', s.position,
        'timeLimitMinutes', s.time_limit_minutes
      )
      order by s.position
    ),
    '[]'::jsonb
  )
  into v_sections
  from public.intensive_exam_sections s
  where s.exam_id = p_exam_id and s.is_enabled;

  return v_base
    || jsonb_build_object(
      'sections', v_sections,
      'current_section_id', v_advance->>'section_id',
      'current_section_expires_at', v_advance->>'section_expires_at',
      'section_finished', coalesce((v_advance->>'finished')::boolean, false),
      'expired_attempt_submitted', false
    );
end
$$;

create or replace function public.intensive_save_answer_sectioned(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer jsonb,
  p_flagged boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.intensive_exam_attempts%rowtype;
  v_question_section uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select * into v_attempt
  from public.intensive_exam_attempts
  where id = p_attempt_id and student_id = auth.uid()
  for update;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status <> 'IN_PROGRESS' then raise exception 'ATTEMPT_NOT_ACTIVE'; end if;
  if v_attempt.current_section_id is null then raise exception 'SECTION_NOT_ACTIVE'; end if;
  if v_attempt.current_section_expires_at is null or now() > v_attempt.current_section_expires_at + interval '2 seconds' then
    raise exception 'SECTION_EXPIRED';
  end if;

  select nullif(item->>'sectionId', '')::uuid
  into v_question_section
  from jsonb_array_elements(v_attempt.question_snapshot) item
  where item->>'id' = p_question_id::text
  limit 1;

  if v_question_section is null then raise exception 'QUESTION_NOT_IN_ATTEMPT'; end if;
  if v_question_section <> v_attempt.current_section_id then raise exception 'QUESTION_SECTION_LOCKED'; end if;

  return public.intensive_save_answer(
    p_attempt_id,
    p_question_id,
    p_answer,
    p_flagged
  );
end
$$;

revoke all on function public.intensive_advance_section(uuid) from public, anon;
revoke all on function public.intensive_start_exam_sectioned(uuid) from public, anon;
revoke all on function public.intensive_save_answer_sectioned(uuid,uuid,jsonb,boolean) from public, anon;

grant execute on function public.intensive_advance_section(uuid) to authenticated, service_role;
grant execute on function public.intensive_start_exam_sectioned(uuid) to authenticated, service_role;
grant execute on function public.intensive_save_answer_sectioned(uuid,uuid,jsonb,boolean) to authenticated, service_role;


create or replace function public.intensive_admin_create_exam_timed(
  p_course_id uuid,
  p_title text,
  p_category text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_duration_minutes integer,
  p_skills jsonb,
  p_attempts_allowed integer default 1,
  p_result_release text default 'MANUAL',
  p_section_time_minutes integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
  v_exam_id uuid;
begin
  if p_section_time_minutes < 1 or p_section_time_minutes > 240 then
    raise exception 'INVALID_SECTION_TIME';
  end if;

  v_result := public.intensive_admin_create_exam(
    p_course_id,
    p_title,
    p_category,
    p_description,
    p_starts_at,
    p_ends_at,
    p_duration_minutes,
    p_skills,
    p_attempts_allowed,
    p_result_release
  );

  v_exam_id := (v_result->>'exam_id')::uuid;

  update public.intensive_exam_sections
  set
    time_limit_minutes = p_section_time_minutes,
    updated_at = now()
  where exam_id = v_exam_id;

  return v_result || jsonb_build_object(
    'section_time_minutes', p_section_time_minutes
  );
end
$$;

revoke all on function public.intensive_admin_create_exam_timed(uuid,text,text,text,timestamptz,timestamptz,integer,jsonb,integer,text,integer) from public, anon;
grant execute on function public.intensive_admin_create_exam_timed(uuid,text,text,text,timestamptz,timestamptz,integer,jsonb,integer,text,integer) to authenticated, service_role;

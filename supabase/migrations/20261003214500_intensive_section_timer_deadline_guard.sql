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
revoke all on function public.intensive_advance_section(uuid) from public, anon;
grant execute on function public.intensive_advance_section(uuid) to authenticated, service_role;

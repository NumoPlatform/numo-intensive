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

revoke all on function public.intensive_start_exam_sectioned(uuid) from public, anon;
grant execute on function public.intensive_start_exam_sectioned(uuid) to authenticated, service_role;

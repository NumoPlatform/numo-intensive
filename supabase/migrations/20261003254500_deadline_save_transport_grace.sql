create or replace function public.intensive_save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_answer jsonb,
  p_flagged boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_attempt public.intensive_exam_attempts%rowtype;
  v_key jsonb;
  v_score numeric;
  v_auto boolean := false;
  v_value text;
  v_expected text;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.intensive_has_active_device() then
    raise exception 'DEVICE_NOT_AUTHORIZED';
  end if;

  select * into v_attempt
  from public.intensive_exam_attempts
  where id = p_attempt_id
    and student_id = auth.uid()
  for update;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  if v_attempt.status <> 'IN_PROGRESS' then
    raise exception 'ATTEMPT_NOT_ACTIVE';
  end if;

  if now() > v_attempt.expires_at + interval '2 seconds' then
    update public.intensive_exam_attempts
    set status = 'EXPIRED',
        submitted_at = expires_at
    where id = p_attempt_id;
    raise exception 'ATTEMPT_EXPIRED';
  end if;

  select item into v_key
  from public.intensive_attempt_keys k
  cross join lateral jsonb_array_elements(k.key_data) item
  where k.attempt_id = p_attempt_id
    and item->>'questionId' = p_question_id::text;

  if v_key is null then
    raise exception 'QUESTION_NOT_IN_ATTEMPT';
  end if;

  v_value := coalesce(p_answer #>> '{}', '');

  if v_key->>'gradingMode' = 'AUTO' then
    v_auto := true;
    v_score := 0;

    if v_key->>'type' = 'MULTIPLE_CHOICE'
       and v_value = coalesce(v_key->>'correctOptionId','') then
      v_score := (v_key->>'marks')::numeric;

    elsif v_key->>'type' = 'TRUE_FALSE'
       and lower(v_value) = lower(coalesce(v_key->>'correctBoolean','')) then
      v_score := (v_key->>'marks')::numeric;

    elsif v_key->>'type' = 'SHORT_ANSWER' then
      if coalesce((v_key->>'trimWhitespace')::boolean, true) then
        v_value := btrim(v_value);
      end if;

      if coalesce((v_key->>'ignoreCase')::boolean, true) then
        v_value := lower(v_value);
      end if;

      for v_expected in
        select jsonb_array_elements_text(
          coalesce(v_key->'acceptableAnswers','[]'::jsonb)
        )
      loop
        if coalesce((v_key->>'trimWhitespace')::boolean, true) then
          v_expected := btrim(v_expected);
        end if;

        if coalesce((v_key->>'ignoreCase')::boolean, true) then
          v_expected := lower(v_expected);
        end if;

        if v_value = v_expected then
          v_score := (v_key->>'marks')::numeric;
          exit;
        end if;
      end loop;
    end if;
  end if;

  insert into public.intensive_student_answers(
    attempt_id,
    question_id,
    answer,
    is_flagged,
    score,
    auto_graded,
    saved_at
  )
  values(
    p_attempt_id,
    p_question_id,
    p_answer,
    p_flagged,
    v_score,
    v_auto,
    now()
  )
  on conflict(attempt_id, question_id)
  do update set
    answer = excluded.answer,
    is_flagged = excluded.is_flagged,
    score = excluded.score,
    auto_graded = excluded.auto_graded,
    saved_at = now();

  update public.intensive_exam_attempts
  set last_saved_at = now()
  where id = p_attempt_id;

  return jsonb_build_object(
    'saved', true,
    'saved_at', now()
  );
end
$function$;

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

revoke all on function public.intensive_save_answer(uuid,uuid,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.intensive_save_answer(uuid,uuid,jsonb,boolean) to service_role;

revoke all on function public.intensive_save_answer_sectioned(uuid,uuid,jsonb,boolean) from public, anon;
grant execute on function public.intensive_save_answer_sectioned(uuid,uuid,jsonb,boolean) to authenticated, service_role;

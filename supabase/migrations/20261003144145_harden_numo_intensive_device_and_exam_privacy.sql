create or replace function public.intensive_has_active_device()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.intensive_profiles p
      join public.intensive_trusted_devices d on d.student_id = p.id
      where p.id = auth.uid()
        and p.role = 'STUDENT'
        and p.status = 'ACTIVE'
        and (p.expiration_date is null or p.expiration_date >= current_date)
        and d.status = 'ACTIVE'
        and d.active_session_id = nullif(auth.jwt()->>'session_id','')::uuid
    );
$$;

revoke all on function public.intensive_has_active_device() from public, anon;
grant execute on function public.intensive_has_active_device() to authenticated, service_role;

drop policy if exists courses_select on public.intensive_courses;
create policy courses_select
on public.intensive_courses
for select
to authenticated
using (
  public.intensive_is_admin()
  or (
    public.intensive_has_active_device()
    and exists (
      select 1
      from public.intensive_enrollments e
      where e.course_id = intensive_courses.id
        and e.student_id = auth.uid()
        and e.is_active
        and (e.expiration_date is null or e.expiration_date >= current_date)
    )
  )
);

drop policy if exists enrollments_select on public.intensive_enrollments;
create policy enrollments_select
on public.intensive_enrollments
for select
to authenticated
using (
  public.intensive_is_admin()
  or (
    student_id = auth.uid()
    and public.intensive_has_active_device()
  )
);

drop policy if exists assignments_select on public.intensive_exam_assignments;
create policy assignments_select
on public.intensive_exam_assignments
for select
to authenticated
using (
  public.intensive_is_admin()
  or (
    public.intensive_has_active_device()
    and (
      student_id = auth.uid()
      or public.intensive_is_assigned(exam_id, auth.uid())
    )
  )
);

drop policy if exists exams_select on public.intensive_exams;
create policy exams_select
on public.intensive_exams
for select
to authenticated
using (
  public.intensive_is_admin()
  or (
    public.intensive_has_active_device()
    and public.intensive_is_assigned(id, auth.uid())
  )
);

drop policy if exists sections_select on public.intensive_exam_sections;
create policy sections_select
on public.intensive_exam_sections
for select
to authenticated
using (
  public.intensive_is_admin()
  or (
    public.intensive_has_active_device()
    and public.intensive_is_assigned(exam_id, auth.uid())
  )
);

drop policy if exists devices_select on public.intensive_trusted_devices;
create policy devices_select
on public.intensive_trusted_devices
for select
to authenticated
using (public.intensive_is_admin());

drop policy if exists attempts_select on public.intensive_exam_attempts;
create policy attempts_select
on public.intensive_exam_attempts
for select
to authenticated
using (public.intensive_is_admin());

drop policy if exists answers_select on public.intensive_student_answers;
create policy answers_select
on public.intensive_student_answers
for select
to authenticated
using (public.intensive_is_admin());

drop policy if exists results_select on public.intensive_results;
create policy results_select
on public.intensive_results
for select
to authenticated
using (
  public.intensive_is_admin()
  or (
    public.intensive_has_active_device()
    and student_id = auth.uid()
    and is_published
  )
);

create or replace function public.intensive_start_exam(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_exam public.intensive_exams%rowtype;
  v_attempt public.intensive_exam_attempts%rowtype;
  v_count integer;
  v_questions jsonb;
  v_keys jsonb;
  v_saved_answers jsonb;
  v_attempt_id uuid;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.intensive_has_active_device() then
    raise exception 'DEVICE_NOT_AUTHORIZED';
  end if;

  select * into v_exam
  from public.intensive_exams
  where id = p_exam_id
  for share;

  if not found then
    raise exception 'EXAM_NOT_FOUND';
  end if;

  if not public.intensive_is_assigned(p_exam_id, auth.uid()) then
    raise exception 'EXAM_NOT_ASSIGNED';
  end if;

  if now() < v_exam.starts_at then
    raise exception 'EXAM_NOT_OPEN';
  end if;

  if now() > v_exam.ends_at or v_exam.status not in ('SCHEDULED','LIVE','PUBLISHED') then
    raise exception 'EXAM_CLOSED';
  end if;

  select * into v_attempt
  from public.intensive_exam_attempts
  where exam_id = p_exam_id
    and student_id = auth.uid()
    and status = 'IN_PROGRESS'
  order by attempt_number desc
  limit 1;

  if found and now() <= v_attempt.expires_at then
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

    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'expires_at', v_attempt.expires_at,
      'questions', v_attempt.question_snapshot,
      'answers', v_saved_answers,
      'resumed', true
    );
  elsif found then
    update public.intensive_exam_attempts
    set status = 'EXPIRED',
        submitted_at = expires_at
    where id = v_attempt.id;
  end if;

  select count(*) into v_count
  from public.intensive_exam_attempts
  where exam_id = p_exam_id
    and student_id = auth.uid();

  if v_count >= v_exam.attempts_allowed then
    raise exception 'NO_ATTEMPTS_REMAINING';
  end if;

  with selected as (
    select q.*, es.id section_id, es.title section_title, eq.position, eq.marks exam_marks
    from public.intensive_exam_questions eq
    join public.intensive_questions q on q.id = eq.question_id and q.is_active
    join public.intensive_exam_sections es on es.id = eq.section_id and es.is_enabled
    where eq.exam_id = p_exam_id

    union all

    select q.*, es.id, es.title, 100000 + row_number() over (), pr.marks_each
    from public.intensive_exam_pool_rules pr
    join public.intensive_exam_sections es on es.id = pr.section_id and es.is_enabled
    cross join lateral (
      select q0.*
      from public.intensive_questions q0
      where q0.course_id = v_exam.course_id
        and q0.is_active
        and (pr.skill is null or q0.skill = pr.skill)
        and (pr.question_type is null or q0.type = pr.question_type)
        and (pr.difficulty is null or q0.difficulty = pr.difficulty)
        and (cardinality(pr.tags) = 0 or q0.tags && pr.tags)
      order by random()
      limit pr.question_count
    ) q
    where pr.exam_id = p_exam_id
  ),
  dedup as (
    select distinct on (id) *
    from selected
    order by id, position
  )
  select
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'sectionId', q.section_id,
        'sectionTitle', q.section_title,
        'skill', q.skill,
        'type', q.type,
        'prompt', q.prompt,
        'marks', q.exam_marks,
        'passage',
          case when q.passage_id is null then null else (
            select jsonb_build_object(
              'id', p.id,
              'title', p.title,
              'body', p.body,
              'imageUrl', p.image_url
            )
            from public.intensive_passages p
            where p.id = q.passage_id
          ) end,
        'options',
          case
            when q.type = 'MULTIPLE_CHOICE' then (
              select jsonb_agg(
                jsonb_build_object(
                  'id', o.id,
                  'label', o.label,
                  'value', o.value
                )
                order by case
                  when v_exam.shuffle_answers then random()
                  else o.position::double precision
                end
              )
              from public.intensive_question_options o
              where o.question_id = q.id
            )
            when q.type = 'TRUE_FALSE' then
              '[{"id":"true","label":"True","value":"true"},{"id":"false","label":"False","value":"false"}]'::jsonb
            else null
          end
      )
      order by case
        when v_exam.shuffle_questions then random()
        else q.position::double precision
      end
    ),
    jsonb_agg(
      jsonb_build_object(
        'questionId', q.id,
        'type', q.type,
        'gradingMode', q.grading_mode,
        'marks', q.exam_marks,
        'skill', q.skill,
        'correctOptionId',
          case when q.type = 'MULTIPLE_CHOICE' then (
            select o.id::text
            from public.intensive_question_options o
            where o.question_id = q.id
              and o.is_correct
            limit 1
          ) else null end,
        'correctBoolean', q.correct_boolean,
        'acceptableAnswers', to_jsonb(q.acceptable_answers),
        'ignoreCase', q.ignore_case,
        'trimWhitespace', q.trim_whitespace
      )
    )
  into v_questions, v_keys
  from dedup q;

  if v_questions is null or jsonb_array_length(v_questions) = 0 then
    raise exception 'EXAM_HAS_NO_QUESTIONS';
  end if;

  v_expires := least(
    now() + make_interval(mins => v_exam.duration_minutes),
    v_exam.ends_at
  );

  insert into public.intensive_exam_attempts(
    exam_id,
    student_id,
    attempt_number,
    expires_at,
    question_snapshot
  )
  values(
    p_exam_id,
    auth.uid(),
    v_count + 1,
    v_expires,
    v_questions
  )
  returning id into v_attempt_id;

  insert into public.intensive_attempt_keys(attempt_id, key_data)
  values(v_attempt_id, v_keys);

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'expires_at', v_expires,
    'questions', v_questions,
    'answers', '[]'::jsonb,
    'resumed', false
  );
end
$function$;

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

create or replace function public.intensive_submit_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_attempt public.intensive_exam_attempts%rowtype;
  v_exam public.intensive_exams%rowtype;
  v_objective numeric;
  v_manual numeric;
  v_pending boolean;
  v_final numeric;
  v_percent numeric;
  v_publish boolean;
  v_result uuid;
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

  if v_attempt.status not in ('IN_PROGRESS','EXPIRED') then
    return jsonb_build_object(
      'submitted', true,
      'attempt_id', p_attempt_id
    );
  end if;

  select * into v_exam
  from public.intensive_exams
  where id = v_attempt.exam_id;

  select
    coalesce(sum(score), 0),
    coalesce(bool_or(score is null), false)
  into v_objective, v_pending
  from public.intensive_student_answers
  where attempt_id = p_attempt_id;

  v_manual := 0;
  v_final := case when v_pending then null else v_objective end;

  v_percent := case
    when v_final is null or v_exam.total_marks = 0 then null
    else round(v_final / v_exam.total_marks * 100, 2)
  end;

  v_publish :=
    not v_pending
    and (
      v_exam.result_release = 'IMMEDIATE'
      or (
        v_exam.result_release = 'AFTER_END'
        and now() >= v_exam.ends_at
      )
    );

  update public.intensive_exam_attempts
  set
    status = case when v_pending then 'SUBMITTED' else 'GRADED' end,
    submitted_at = coalesce(submitted_at, least(now(), expires_at)),
    objective_score = v_objective,
    final_score = v_final
  where id = p_attempt_id;

  insert into public.intensive_results(
    attempt_id,
    exam_id,
    student_id,
    objective_score,
    manual_score,
    final_score,
    total_marks,
    percentage,
    status,
    grading_status,
    is_published,
    published_at
  )
  values(
    p_attempt_id,
    v_exam.id,
    auth.uid(),
    v_objective,
    v_manual,
    v_final,
    v_exam.total_marks,
    v_percent,
    case
      when v_final is null then 'PENDING'
      when v_exam.passing_score is null or v_final >= v_exam.passing_score then 'PASS'
      else 'FAIL'
    end,
    case when v_pending then 'PENDING' else 'COMPLETE' end,
    v_publish,
    case when v_publish then now() end
  )
  on conflict(attempt_id)
  do update set
    objective_score = excluded.objective_score,
    final_score = excluded.final_score,
    percentage = excluded.percentage,
    status = excluded.status,
    grading_status = excluded.grading_status,
    is_published = excluded.is_published,
    published_at = excluded.published_at
  returning id into v_result;

  return jsonb_build_object(
    'submitted', true,
    'result_id', v_result,
    'pending_grading', v_pending
  );
end
$function$;

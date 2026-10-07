-- Unlimited attempts support.
-- attempts_allowed = 0 means unlimited attempts during the exam availability window.

alter table public.intensive_exams
  drop constraint if exists intensive_exams_attempts_allowed_check;

alter table public.intensive_exams
  add constraint intensive_exams_attempts_allowed_check
  check (attempts_allowed >= 0 and attempts_allowed <= 20);

do $$
declare v text;
begin
  select pg_get_functiondef(p.oid) into v
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'intensive_start_exam'
    and p.prokind = 'f'
  limit 1;

  if v is not null then
    v := replace(
      v,
      'if v_count >= v_exam.attempts_allowed then',
      'if v_exam.attempts_allowed <> 0 and v_count >= v_exam.attempts_allowed then'
    );
    execute v;
  end if;
end $$;

do $$
declare v text;
begin
  select pg_get_functiondef(p.oid) into v
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'intensive_select_section'
    and p.prokind = 'f'
  limit 1;

  if v is not null then
    v := replace(
      v,
      'if v_completed_count >= v_exam.attempts_allowed then',
      'if v_exam.attempts_allowed <> 0 and v_completed_count >= v_exam.attempts_allowed then'
    );
    v := replace(
      v,
      'greatest(0, v_exam.attempts_allowed - coalesce(v_attempt_no,1))',
      'case when v_exam.attempts_allowed = 0 then -1 else greatest(0, v_exam.attempts_allowed - coalesce(v_attempt_no,1)) end'
    );
    v := replace(
      v,
      'greatest(0, v_exam.attempts_allowed - v_attempt_no)',
      'case when v_exam.attempts_allowed = 0 then -1 else greatest(0, v_exam.attempts_allowed - v_attempt_no) end'
    );
    execute v;
  end if;
end $$;

do $$
declare v text;
begin
  select pg_get_functiondef(p.oid) into v
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'intensive_complete_current_section'
    and p.prokind = 'f'
  limit 1;

  if v is not null then
    v := replace(
      v,
      'greatest(0, v_exam.attempts_allowed - v_section_attempt.attempt_number)',
      'case when v_exam.attempts_allowed = 0 then -1 else greatest(0, v_exam.attempts_allowed - v_section_attempt.attempt_number) end'
    );
    execute v;
  end if;
end $$;

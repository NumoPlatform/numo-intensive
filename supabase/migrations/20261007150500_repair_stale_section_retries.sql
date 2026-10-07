-- Repair stale expired section attempts before opening a new retry.
-- Prevents an expired IN_PROGRESS row from blocking the next attempt number.

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
      '  select count(*)::int
  into v_completed_count
  from public.intensive_section_attempts
  where exam_attempt_id = p_attempt_id
    and section_id = p_section_id
    and status in (''GRADED'',''EXPIRED'');',
      '  update public.intensive_section_attempts
  set status = ''EXPIRED'',
      completed_at = coalesce(completed_at, expires_at),
      updated_at = now()
  where exam_attempt_id = p_attempt_id
    and section_id = p_section_id
    and status = ''IN_PROGRESS''
    and expires_at <= now();

  select count(*)::int
  into v_completed_count
  from public.intensive_section_attempts
  where exam_attempt_id = p_attempt_id
    and section_id = p_section_id
    and status in (''GRADED'',''EXPIRED'');'
    );
    execute v;
  end if;
end $$;

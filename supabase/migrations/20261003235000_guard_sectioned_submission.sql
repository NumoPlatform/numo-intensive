create or replace function public.intensive_submit_attempt_sectioned(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.intensive_exam_attempts%rowtype;
  v_current_position integer;
  v_last_position integer;
  v_advance jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
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
    return public.intensive_submit_attempt(p_attempt_id);
  end if;

  if v_attempt.status = 'IN_PROGRESS'
     and now() < v_attempt.expires_at
     and v_attempt.current_section_id is not null then

    select position into v_current_position
    from public.intensive_exam_sections
    where id = v_attempt.current_section_id
      and exam_id = v_attempt.exam_id
      and is_enabled;

    select max(position) into v_last_position
    from public.intensive_exam_sections
    where exam_id = v_attempt.exam_id
      and is_enabled;

    if v_current_position is null or v_last_position is null then
      raise exception 'SECTION_STATE_INVALID';
    end if;

    if v_current_position < v_last_position then
      raise exception 'SECTIONS_REMAINING';
    end if;

    v_advance := public.intensive_advance_section(p_attempt_id);
    if coalesce((v_advance->>'finished')::boolean, false) is not true then
      raise exception 'SECTIONS_REMAINING';
    end if;
  end if;

  return public.intensive_submit_attempt(p_attempt_id);
end
$$;

revoke all on function public.intensive_submit_attempt_sectioned(uuid) from public, anon;
grant execute on function public.intensive_submit_attempt_sectioned(uuid) to authenticated, service_role;

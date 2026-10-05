create or replace function public.intensive_attempt_score_breakdown(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_attempt public.intensive_exam_attempts%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  select * into v_attempt
  from public.intensive_exam_attempts
  where id = p_attempt_id;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.student_id <> auth.uid() and not public.intensive_is_admin() then
    raise exception 'ACCESS_DENIED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sectionId', x.section_id,
        'title', x.section_title,
        'score', x.score,
        'totalMarks', x.total_marks,
        'percentage', case when x.total_marks = 0 then 0 else round(x.score / x.total_marks * 100, 2) end
      )
      order by x.first_position
    ),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      item->>'sectionId' as section_id,
      item->>'sectionTitle' as section_title,
      min(ord) as first_position,
      coalesce(sum(coalesce(a.score, 0)), 0)::numeric as score,
      coalesce(sum((item->>'marks')::numeric), 0)::numeric as total_marks
    from jsonb_array_elements(v_attempt.question_snapshot) with ordinality as q(item, ord)
    left join public.intensive_student_answers a
      on a.attempt_id = p_attempt_id
     and a.question_id = (item->>'id')::uuid
    group by item->>'sectionId', item->>'sectionTitle'
  ) x;

  return v_result;
end
$$;

revoke all on function public.intensive_attempt_score_breakdown(uuid) from public, anon;
grant execute on function public.intensive_attempt_score_breakdown(uuid) to authenticated, service_role;

create or replace function public.intensive_finalize_grading(
  p_attempt_id uuid,
  p_publish boolean default false
)
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
  v_total numeric;
  v_percent numeric;
  v_should_publish boolean;
begin
  if not public.intensive_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select * into v_attempt
  from public.intensive_exam_attempts
  where id=p_attempt_id
  for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  select * into v_exam
  from public.intensive_exams
  where id=v_attempt.exam_id;

  if exists(
    select 1 from public.intensive_student_answers
    where attempt_id=p_attempt_id and score is null
  ) then
    raise exception 'GRADING_INCOMPLETE';
  end if;

  select
    coalesce(sum(score) filter(where auto_graded),0),
    coalesce(sum(score) filter(where not auto_graded),0)
  into v_objective,v_manual
  from public.intensive_student_answers
  where attempt_id=p_attempt_id;

  v_total:=v_objective+v_manual;
  v_percent:=case
    when v_exam.total_marks=0 then 0
    else round(v_total/v_exam.total_marks*100,2)
  end;

  v_should_publish :=
    p_publish
    or v_exam.result_release='IMMEDIATE'
    or (v_exam.result_release='AFTER_END' and now()>=v_exam.ends_at);

  update public.intensive_exam_attempts
  set
    status='GRADED',
    objective_score=v_objective,
    manual_score=v_manual,
    final_score=v_total
  where id=p_attempt_id;

  update public.intensive_results
  set
    objective_score=v_objective,
    manual_score=v_manual,
    final_score=v_total,
    percentage=v_percent,
    status=case
      when v_exam.passing_score is null or v_total>=v_exam.passing_score then 'PASS'
      else 'FAIL'
    end,
    grading_status='COMPLETE',
    is_published=v_should_publish or is_published,
    published_at=case
      when v_should_publish and published_at is null then now()
      else published_at
    end
  where attempt_id=p_attempt_id;

  insert into public.intensive_audit_logs(
    admin_id,action,target_type,target_id,details
  )
  values(
    auth.uid(),
    'GRADE_CHANGED',
    'ATTEMPT',
    p_attempt_id::text,
    jsonb_build_object(
      'final_score',v_total,
      'published',v_should_publish
    )
  );

  return jsonb_build_object(
    'complete',true,
    'final_score',v_total,
    'percentage',v_percent,
    'published',v_should_publish
  );
end
$function$;

create or replace function public.intensive_release_due_results()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  update public.intensive_results r
  set
    is_published=true,
    published_at=coalesce(r.published_at,now()),
    updated_at=now()
  from public.intensive_exams e
  where
    r.exam_id=e.id
    and r.student_id=auth.uid()
    and r.grading_status='COMPLETE'
    and not r.is_published
    and (
      e.result_release='IMMEDIATE'
      or (e.result_release='AFTER_END' and now()>=e.ends_at)
    );

  get diagnostics v_count = row_count;
  return v_count;
end
$function$;

revoke all on function public.intensive_release_due_results() from public, anon;
grant execute on function public.intensive_release_due_results() to authenticated, service_role;

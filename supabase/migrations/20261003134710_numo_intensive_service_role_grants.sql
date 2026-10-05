do $$
declare
  t text;
  s text;
  fn regprocedure;
begin
  foreach t in array array[
    'intensive_profiles','intensive_courses','intensive_enrollments','intensive_trusted_devices','intensive_access_logs',
    'intensive_student_groups','intensive_group_members','intensive_exams','intensive_exam_sections','intensive_passages',
    'intensive_questions','intensive_question_options','intensive_exam_questions','intensive_exam_pool_rules','intensive_exam_assignments',
    'intensive_exam_attempts','intensive_attempt_keys','intensive_student_answers','intensive_results','intensive_audit_logs',
    'intensive_settings'
  ]
  loop
    execute format('grant all on table public.%I to service_role', t);
  end loop;

  for s in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and c.relname like 'intensive\_%' escape '\'
  loop
    execute format('grant usage, select on sequence public.%I to service_role', s);
  end loop;

  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'intensive\_%' escape '\'
  loop
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$$;

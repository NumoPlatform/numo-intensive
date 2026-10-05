create or replace function public.intensive_security_readiness()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_answer_key_rls boolean;
begin
  if auth.uid() is null or not public.intensive_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select coalesce(bool_and(c.relrowsecurity), false)
  into v_answer_key_rls
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in (
      'intensive_questions',
      'intensive_question_options',
      'intensive_attempt_keys',
      'intensive_student_answers'
    );

  return jsonb_build_object(
    'baseExamRpcsLocked',
      not has_function_privilege('authenticated','public.intensive_start_exam(uuid)','EXECUTE')
      and not has_function_privilege('authenticated','public.intensive_save_answer(uuid,uuid,jsonb,boolean)','EXECUTE')
      and not has_function_privilege('authenticated','public.intensive_submit_attempt(uuid)','EXECUTE'),
    'sectionedRpcsAvailable',
      has_function_privilege('authenticated','public.intensive_start_exam_sectioned(uuid)','EXECUTE')
      and has_function_privilege('authenticated','public.intensive_save_answer_sectioned(uuid,uuid,jsonb,boolean)','EXECUTE')
      and has_function_privilege('authenticated','public.intensive_advance_section(uuid)','EXECUTE')
      and has_function_privilege('authenticated','public.intensive_submit_attempt_sectioned(uuid)','EXECUTE'),
    'answerKeyTablesRls', v_answer_key_rls,
    'legacyBootstrapRemoved', to_regclass('public.intensive_bootstrap') is null,
    'riyadhAccessWindows',
      pg_get_functiondef('public.intensive_student_access_active(uuid)'::regprocedure)
        ilike '%Asia/Riyadh%'
      and pg_get_functiondef('public.intensive_is_assigned(uuid,uuid)'::regprocedure)
        ilike '%Asia/Riyadh%'
  );
end
$$;

revoke all on function public.intensive_security_readiness() from public, anon;
grant execute on function public.intensive_security_readiness() to authenticated, service_role;

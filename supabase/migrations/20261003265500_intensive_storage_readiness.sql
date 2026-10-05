create or replace function public.intensive_security_readiness()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_answer_key_rls boolean;
  v_public_fk_isolated boolean;
  v_function_isolated boolean;
  v_cover_storage_locked boolean;
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

  select not exists (
    select 1
    from pg_constraint con
    join pg_class src on src.oid=con.conrelid
    join pg_namespace src_ns on src_ns.oid=src.relnamespace
    join pg_class tgt on tgt.oid=con.confrelid
    join pg_namespace tgt_ns on tgt_ns.oid=tgt.relnamespace
    where con.contype='f'
      and src_ns.nspname='public'
      and src.relname like 'intensive\_%' escape '\'
      and tgt_ns.nspname='public'
      and tgt.relname not like 'intensive\_%' escape '\'
  )
  into v_public_fk_isolated;

  select not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    cross join lateral regexp_matches(
      pg_get_functiondef(p.oid),
      'public\.([a-zA-Z0-9_]+)',
      'g'
    ) m
    where n.nspname='public'
      and p.proname like 'intensive\_%' escape '\'
      and m[1] not like 'intensive\_%' escape '\'
  )
  into v_function_isolated;

  select exists (
    select 1
    from storage.buckets b
    where b.id='intensive-covers'
      and b.public
      and b.file_size_limit=5242880
      and b.allowed_mime_types <@ array['image/png','image/jpeg','image/webp']::text[]
      and array['image/png','image/jpeg','image/webp']::text[] <@ b.allowed_mime_types
  )
  into v_cover_storage_locked;

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
        ilike '%Asia/Riyadh%',
    'publicSchemaFkIsolated', v_public_fk_isolated,
    'functionNamespaceIsolated', v_function_isolated,
    'coverStorageLockedDown', v_cover_storage_locked,
    'examDuplicationAvailable',
      has_function_privilege(
        'authenticated',
        'public.intensive_duplicate_exam(uuid,text,timestamptz,timestamptz)',
        'EXECUTE'
      )
  );
end
$$;

revoke all on function public.intensive_security_readiness() from public, anon;
grant execute on function public.intensive_security_readiness() to authenticated, service_role;

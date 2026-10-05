-- NUMO INTENSIVE answer-key/privacy smoke test
-- Runs inside a transaction and rolls back all temporary changes.

begin;

create temp table privacy_qa(payload jsonb) on commit drop;

do $$
declare
  v_user uuid;
  v_options integer;
  v_questions integer;
  v_keys integer;
  v_base_start_allowed boolean;
begin
  select id into v_user
  from public.intensive_profiles
  where role='ADMIN'
  order by created_at
  limit 1;

  if v_user is null then raise exception 'QA_ADMIN_REQUIRED'; end if;

  update public.intensive_profiles
  set role='STUDENT',
      status='ACTIVE',
      expiration_date=current_date + 7
  where id=v_user;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',v_user,
      'role','authenticated',
      'session_id','ffffffff-6666-4666-8666-666666666666'::uuid
    )::text,
    true
  );

  set local role authenticated;

  select count(*) into v_options
  from public.intensive_question_options;

  select count(*) into v_questions
  from public.intensive_questions;

  select count(*) into v_keys
  from public.intensive_attempt_keys;

  select has_function_privilege(
    current_user,
    'public.intensive_start_exam(uuid)',
    'EXECUTE'
  )
  into v_base_start_allowed;

  reset role;

  insert into privacy_qa(payload)
  values(jsonb_build_object(
    'question_options_visible_to_student',v_options,
    'question_bank_visible_to_student',v_questions,
    'attempt_keys_visible_to_student',v_keys,
    'base_start_rpc_executable_by_student',v_base_start_allowed
  ));
end
$$;

select payload from privacy_qa;

rollback;

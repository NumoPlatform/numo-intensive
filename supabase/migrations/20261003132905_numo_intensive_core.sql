create extension if not exists citext;

create table if not exists public.intensive_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  username citext not null unique check (username ~ '^[A-Za-z0-9._-]{3,40}$'),
  role text not null check (role in ('ADMIN','STUDENT')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','EXPIRED')),
  start_date date,
  expiration_date date,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.intensive_courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  default_cover_url text,
  cover_path text,
  cover_position text not null default 'center',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.intensive_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.intensive_profiles(id) on delete cascade,
  course_id uuid not null references public.intensive_courses(id) on delete restrict,
  start_date date not null default current_date,
  expiration_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, course_id)
);

create table if not exists public.intensive_trusted_devices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.intensive_profiles(id) on delete cascade,
  token_hash text not null,
  fingerprint_hash text,
  user_agent text,
  active_session_id uuid,
  registered_at timestamptz not null default now(),
  last_access_at timestamptz not null default now(),
  last_ip inet,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','RESET','BLOCKED')),
  reset_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.intensive_access_logs (
  id bigint generated always as identity primary key,
  student_id uuid references public.intensive_profiles(id) on delete set null,
  outcome text not null check (outcome in ('LOGIN','DEVICE_REGISTERED','DEVICE_VERIFIED','DEVICE_DENIED','LOGOUT')),
  ip inet,
  user_agent text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.intensive_student_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.intensive_courses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.intensive_group_members (
  group_id uuid not null references public.intensive_student_groups(id) on delete cascade,
  student_id uuid not null references public.intensive_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(group_id, student_id)
);

create table if not exists public.intensive_exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.intensive_courses(id) on delete restrict,
  title text not null,
  category text not null check (category in ('QUIZ 1','QUIZ 2','MIDTERM','FINAL','MOCK EXAM','PRACTICE EXAM','CUSTOM')),
  description text,
  instructions text not null default 'Read each question carefully. Your answers are saved automatically.',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  attempts_allowed integer not null default 1 check (attempts_allowed between 1 and 20),
  total_marks numeric(8,2) not null default 0 check (total_marks >= 0),
  passing_score numeric(8,2),
  result_release text not null default 'MANUAL' check (result_release in ('IMMEDIATE','AFTER_END','MANUAL')),
  status text not null default 'DRAFT' check (status in ('DRAFT','SCHEDULED','LIVE','CLOSED','PUBLISHED','ARCHIVED')),
  allow_answer_review boolean not null default false,
  shuffle_questions boolean not null default false,
  shuffle_answers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check (ends_at > starts_at),
  check (passing_score is null or passing_score between 0 and total_marks)
);

create table if not exists public.intensive_exam_sections (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.intensive_exams(id) on delete cascade,
  title text not null,
  instructions text,
  position integer not null,
  marks numeric(8,2) not null default 0,
  question_count integer,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_id, position)
);

create table if not exists public.intensive_passages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.intensive_courses(id) on delete restrict,
  title text not null,
  body text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.intensive_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.intensive_courses(id) on delete restrict,
  exam_category text check (exam_category is null or exam_category in ('QUIZ 1','QUIZ 2','MIDTERM','FINAL','MOCK EXAM','PRACTICE EXAM','CUSTOM')),
  skill text not null,
  type text not null check (type in ('MULTIPLE_CHOICE','TRUE_FALSE','SHORT_ANSWER')),
  difficulty text not null default 'MEDIUM' check (difficulty in ('EASY','MEDIUM','HARD')),
  prompt text not null,
  passage_id uuid references public.intensive_passages(id) on delete set null,
  grading_mode text not null default 'AUTO' check (grading_mode in ('AUTO','MANUAL')),
  acceptable_answers text[] not null default '{}',
  ignore_case boolean not null default true,
  trim_whitespace boolean not null default true,
  correct_boolean boolean,
  marks numeric(8,2) not null default 1 check (marks > 0),
  explanation text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check ((type = 'TRUE_FALSE' and correct_boolean is not null) or type <> 'TRUE_FALSE'),
  check ((type = 'SHORT_ANSWER') or grading_mode = 'AUTO')
);

create table if not exists public.intensive_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.intensive_questions(id) on delete cascade,
  label text not null,
  value text not null,
  is_correct boolean not null default false,
  position integer not null,
  created_at timestamptz not null default now(),
  unique(question_id, position)
);

create table if not exists public.intensive_exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.intensive_exams(id) on delete cascade,
  section_id uuid not null references public.intensive_exam_sections(id) on delete cascade,
  question_id uuid not null references public.intensive_questions(id) on delete restrict,
  marks numeric(8,2) not null check (marks > 0),
  position integer not null,
  created_at timestamptz not null default now(),
  unique(exam_id, question_id),
  unique(section_id, position)
);

create table if not exists public.intensive_exam_pool_rules (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.intensive_exams(id) on delete cascade,
  section_id uuid not null references public.intensive_exam_sections(id) on delete cascade,
  skill text,
  question_type text check (question_type is null or question_type in ('MULTIPLE_CHOICE','TRUE_FALSE','SHORT_ANSWER')),
  difficulty text check (difficulty is null or difficulty in ('EASY','MEDIUM','HARD')),
  tags text[] not null default '{}',
  question_count integer not null check (question_count > 0),
  marks_each numeric(8,2) not null default 1 check (marks_each > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.intensive_exam_assignments (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.intensive_exams(id) on delete cascade,
  student_id uuid references public.intensive_profiles(id) on delete cascade,
  group_id uuid references public.intensive_student_groups(id) on delete cascade,
  all_course_students boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check (num_nonnulls(student_id, group_id) + all_course_students::int = 1)
);

create unique index if not exists intensive_assignment_student_unique on public.intensive_exam_assignments(exam_id, student_id) where student_id is not null;
create unique index if not exists intensive_assignment_group_unique on public.intensive_exam_assignments(exam_id, group_id) where group_id is not null;
create unique index if not exists intensive_assignment_course_unique on public.intensive_exam_assignments(exam_id) where all_course_students;

create table if not exists public.intensive_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.intensive_exams(id) on delete restrict,
  student_id uuid not null references public.intensive_profiles(id) on delete restrict,
  attempt_number integer not null,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','SUBMITTED','EXPIRED','GRADED')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  objective_score numeric(8,2) not null default 0,
  manual_score numeric(8,2) not null default 0,
  final_score numeric(8,2),
  question_snapshot jsonb not null,
  section_breakdown jsonb not null default '{}'::jsonb,
  last_saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_id, student_id, attempt_number)
);

create table if not exists public.intensive_attempt_keys (
  attempt_id uuid primary key references public.intensive_exam_attempts(id) on delete cascade,
  key_data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.intensive_student_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.intensive_exam_attempts(id) on delete cascade,
  question_id uuid not null,
  answer jsonb,
  is_flagged boolean not null default false,
  score numeric(8,2),
  auto_graded boolean not null default false,
  admin_feedback text,
  saved_at timestamptz not null default now(),
  graded_at timestamptz,
  graded_by uuid references auth.users(id),
  unique(attempt_id, question_id)
);

create table if not exists public.intensive_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.intensive_exam_attempts(id) on delete restrict,
  exam_id uuid not null references public.intensive_exams(id) on delete restrict,
  student_id uuid not null references public.intensive_profiles(id) on delete restrict,
  objective_score numeric(8,2) not null default 0,
  manual_score numeric(8,2) not null default 0,
  final_score numeric(8,2),
  total_marks numeric(8,2) not null,
  percentage numeric(6,2),
  status text check (status in ('PASS','FAIL','PENDING')),
  grading_status text not null default 'PENDING' check (grading_status in ('PENDING','COMPLETE')),
  skill_breakdown jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intensive_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid references public.intensive_profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.intensive_settings (
  id boolean primary key default true check (id),
  support_phone text,
  support_whatsapp text,
  support_website text,
  support_email text,
  timezone text not null default 'Asia/Riyadh' check (timezone = 'Asia/Riyadh'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists intensive_profiles_role_status_idx on public.intensive_profiles(role, status);
create index if not exists intensive_profiles_expiration_idx on public.intensive_profiles(expiration_date);
create index if not exists intensive_enrollments_student_idx on public.intensive_enrollments(student_id, is_active);
create index if not exists intensive_enrollments_course_idx on public.intensive_enrollments(course_id, is_active);
create index if not exists intensive_exams_course_schedule_idx on public.intensive_exams(course_id, starts_at, ends_at, status);
create index if not exists intensive_questions_filters_idx on public.intensive_questions(course_id, exam_category, skill, type, difficulty);
create index if not exists intensive_attempts_student_idx on public.intensive_exam_attempts(student_id, status, started_at desc);
create index if not exists intensive_attempts_exam_idx on public.intensive_exam_attempts(exam_id, status);
create index if not exists intensive_answers_attempt_idx on public.intensive_student_answers(attempt_id);
create index if not exists intensive_results_student_idx on public.intensive_results(student_id, is_published, created_at desc);
create index if not exists intensive_audit_created_idx on public.intensive_audit_logs(created_at desc);

create or replace function public.intensive_touch_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array[
    'intensive_profiles','intensive_courses','intensive_enrollments','intensive_trusted_devices','intensive_exams',
    'intensive_exam_sections','intensive_passages','intensive_questions','intensive_exam_attempts','intensive_results','intensive_settings'
  ] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.intensive_touch_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.intensive_is_admin()
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists(select 1 from public.intensive_profiles where id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE');
$$;

create or replace function public.intensive_is_assigned(p_exam_id uuid, p_student_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists(
    select 1 from public.intensive_exam_assignments a
    where a.exam_id = p_exam_id and (
      a.student_id = p_student_id
      or (a.group_id is not null and exists(select 1 from public.intensive_group_members gm where gm.group_id = a.group_id and gm.student_id = p_student_id))
      or (a.all_course_students and exists(
        select 1 from public.intensive_enrollments en join public.intensive_exams ex on ex.course_id = en.course_id
        where ex.id = p_exam_id and en.student_id = p_student_id and en.is_active
      ))
    )
  );
$$;

create or replace function public.intensive_register_or_verify_device(p_token_hash text, p_user_agent text default null, p_ip inet default null)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_profile public.intensive_profiles%rowtype; v_device public.intensive_trusted_devices%rowtype; v_session uuid;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into v_profile from public.intensive_profiles where id = auth.uid() and role = 'STUDENT';
  if not found then raise exception 'STUDENT_ACCOUNT_REQUIRED'; end if;
  if v_profile.status <> 'ACTIVE' then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  if v_profile.expiration_date is not null and v_profile.expiration_date < current_date then raise exception 'ACCOUNT_EXPIRED'; end if;
  v_session := nullif(auth.jwt()->>'session_id','')::uuid;
  select * into v_device from public.intensive_trusted_devices where student_id = auth.uid() for update;
  if not found or v_device.status = 'RESET' then
    insert into public.intensive_trusted_devices(student_id, token_hash, user_agent, active_session_id, last_ip, status, registered_at, last_access_at)
    values(auth.uid(), p_token_hash, left(p_user_agent,500), v_session, p_ip, 'ACTIVE', now(), now())
    on conflict(student_id) do update set token_hash = excluded.token_hash, user_agent = excluded.user_agent,
      active_session_id = excluded.active_session_id, last_ip = excluded.last_ip, status = 'ACTIVE', registered_at = now(), last_access_at = now();
    insert into public.intensive_access_logs(student_id,outcome,ip,user_agent) values(auth.uid(),'DEVICE_REGISTERED',p_ip,left(p_user_agent,500));
    return jsonb_build_object('authorized',true,'registered',true);
  end if;
  if v_device.status <> 'ACTIVE' or v_device.token_hash <> p_token_hash then
    insert into public.intensive_access_logs(student_id,outcome,ip,user_agent) values(auth.uid(),'DEVICE_DENIED',p_ip,left(p_user_agent,500));
    return jsonb_build_object('authorized',false,'reason','DEVICE_NOT_AUTHORIZED');
  end if;
  update public.intensive_trusted_devices set active_session_id = v_session, last_access_at = now(), last_ip = p_ip, user_agent = left(p_user_agent,500) where student_id = auth.uid();
  insert into public.intensive_access_logs(student_id,outcome,ip,user_agent) values(auth.uid(),'DEVICE_VERIFIED',p_ip,left(p_user_agent,500));
  return jsonb_build_object('authorized',true,'registered',false);
end $$;

create or replace function public.intensive_verify_device(p_token_hash text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_session uuid;
begin
  if auth.uid() is null then return false; end if;
  v_session := nullif(auth.jwt()->>'session_id','')::uuid;
  return exists(select 1 from public.intensive_trusted_devices where student_id = auth.uid() and token_hash = p_token_hash and status = 'ACTIVE' and active_session_id = v_session);
end $$;

create or replace function public.intensive_reset_device(p_student_id uuid)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.intensive_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  update public.intensive_trusted_devices set status='RESET', token_hash=encode(extensions.gen_random_bytes(32),'hex'), active_session_id=null, reset_at=now() where student_id=p_student_id;
  insert into public.intensive_audit_logs(admin_id,action,target_type,target_id) values(auth.uid(),'DEVICE_RESET','STUDENT',p_student_id::text);
  return true;
end $$;

create or replace function public.intensive_start_exam(p_exam_id uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_exam public.intensive_exams%rowtype; v_attempt public.intensive_exam_attempts%rowtype; v_count integer;
  v_questions jsonb; v_keys jsonb; v_attempt_id uuid; v_expires timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into v_exam from public.intensive_exams where id=p_exam_id for share;
  if not found then raise exception 'EXAM_NOT_FOUND'; end if;
  if not public.intensive_is_assigned(p_exam_id, auth.uid()) then raise exception 'EXAM_NOT_ASSIGNED'; end if;
  if now() < v_exam.starts_at then raise exception 'EXAM_NOT_OPEN'; end if;
  if now() > v_exam.ends_at or v_exam.status not in ('SCHEDULED','LIVE','PUBLISHED') then raise exception 'EXAM_CLOSED'; end if;
  select * into v_attempt from public.intensive_exam_attempts where exam_id=p_exam_id and student_id=auth.uid() and status='IN_PROGRESS' order by attempt_number desc limit 1;
  if found and now() <= v_attempt.expires_at then
    return jsonb_build_object('attempt_id',v_attempt.id,'expires_at',v_attempt.expires_at,'questions',v_attempt.question_snapshot,'resumed',true);
  elsif found then
    update public.intensive_exam_attempts set status='EXPIRED', submitted_at=v_attempt.expires_at where id=v_attempt.id;
  end if;
  select count(*) into v_count from public.intensive_exam_attempts where exam_id=p_exam_id and student_id=auth.uid();
  if v_count >= v_exam.attempts_allowed then raise exception 'NO_ATTEMPTS_REMAINING'; end if;

  with selected as (
    select q.*, es.id section_id, es.title section_title, eq.position, eq.marks exam_marks
    from public.intensive_exam_questions eq
    join public.intensive_questions q on q.id=eq.question_id and q.is_active
    join public.intensive_exam_sections es on es.id=eq.section_id and es.is_enabled
    where eq.exam_id=p_exam_id
    union all
    select q.*, es.id, es.title, 100000 + row_number() over (), pr.marks_each
    from public.intensive_exam_pool_rules pr
    join public.intensive_exam_sections es on es.id=pr.section_id and es.is_enabled
    cross join lateral (
      select q0.* from public.intensive_questions q0
      where q0.course_id=v_exam.course_id and q0.is_active
        and (pr.skill is null or q0.skill=pr.skill)
        and (pr.question_type is null or q0.type=pr.question_type)
        and (pr.difficulty is null or q0.difficulty=pr.difficulty)
        and (cardinality(pr.tags)=0 or q0.tags && pr.tags)
      order by random() limit pr.question_count
    ) q
    where pr.exam_id=p_exam_id
  ), dedup as (select distinct on(id) * from selected order by id, position)
  select jsonb_agg(jsonb_build_object(
    'id',q.id,'sectionId',q.section_id,'sectionTitle',q.section_title,'skill',q.skill,'type',q.type,
    'prompt',q.prompt,'marks',q.exam_marks,
    'passage',case when q.passage_id is null then null else (
      select jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'imageUrl',p.image_url) from public.intensive_passages p where p.id=q.passage_id
    ) end,
    'options',case when q.type='MULTIPLE_CHOICE' then (
      select jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'value',o.value) order by case when v_exam.shuffle_answers then random() else o.position::double precision end)
      from public.intensive_question_options o where o.question_id=q.id
    ) when q.type='TRUE_FALSE' then '[{"id":"true","label":"True","value":"true"},{"id":"false","label":"False","value":"false"}]'::jsonb else null end
  ) order by case when v_exam.shuffle_questions then random() else q.position::double precision end),
  jsonb_agg(jsonb_build_object(
    'questionId',q.id,'type',q.type,'gradingMode',q.grading_mode,'marks',q.exam_marks,'skill',q.skill,
    'correctOptionId',case when q.type='MULTIPLE_CHOICE' then (select o.id::text from public.intensive_question_options o where o.question_id=q.id and o.is_correct limit 1) else null end,
    'correctBoolean',q.correct_boolean,'acceptableAnswers',to_jsonb(q.acceptable_answers),'ignoreCase',q.ignore_case,'trimWhitespace',q.trim_whitespace
  )) into v_questions,v_keys from dedup q;

  if v_questions is null or jsonb_array_length(v_questions)=0 then raise exception 'EXAM_HAS_NO_QUESTIONS'; end if;
  v_expires := least(now() + make_interval(mins=>v_exam.duration_minutes), v_exam.ends_at);
  insert into public.intensive_exam_attempts(exam_id,student_id,attempt_number,expires_at,question_snapshot)
  values(p_exam_id,auth.uid(),v_count+1,v_expires,v_questions) returning id into v_attempt_id;
  insert into public.intensive_attempt_keys(attempt_id,key_data) values(v_attempt_id,v_keys);
  return jsonb_build_object('attempt_id',v_attempt_id,'expires_at',v_expires,'questions',v_questions,'resumed',false);
end $$;

create or replace function public.intensive_save_answer(p_attempt_id uuid,p_question_id uuid,p_answer jsonb,p_flagged boolean default false)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_attempt public.intensive_exam_attempts%rowtype; v_key jsonb; v_score numeric; v_auto boolean:=false; v_value text; v_expected text;
begin
  select * into v_attempt from public.intensive_exam_attempts where id=p_attempt_id and student_id=auth.uid() for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status <> 'IN_PROGRESS' then raise exception 'ATTEMPT_NOT_ACTIVE'; end if;
  if now() > v_attempt.expires_at then update public.intensive_exam_attempts set status='EXPIRED',submitted_at=expires_at where id=p_attempt_id; raise exception 'ATTEMPT_EXPIRED'; end if;
  select item into v_key from public.intensive_attempt_keys k cross join lateral jsonb_array_elements(k.key_data) item where k.attempt_id=p_attempt_id and item->>'questionId'=p_question_id::text;
  if v_key is null then raise exception 'QUESTION_NOT_IN_ATTEMPT'; end if;
  v_value := coalesce(p_answer#>>'{}','');
  if v_key->>'gradingMode'='AUTO' then
    v_auto:=true; v_score:=0;
    if v_key->>'type'='MULTIPLE_CHOICE' and v_value=coalesce(v_key->>'correctOptionId','') then v_score=(v_key->>'marks')::numeric;
    elsif v_key->>'type'='TRUE_FALSE' and lower(v_value)=lower(coalesce(v_key->>'correctBoolean','')) then v_score=(v_key->>'marks')::numeric;
    elsif v_key->>'type'='SHORT_ANSWER' then
      if coalesce((v_key->>'trimWhitespace')::boolean,true) then v_value:=btrim(v_value); end if;
      if coalesce((v_key->>'ignoreCase')::boolean,true) then v_value:=lower(v_value); end if;
      for v_expected in select jsonb_array_elements_text(coalesce(v_key->'acceptableAnswers','[]'::jsonb)) loop
        if coalesce((v_key->>'trimWhitespace')::boolean,true) then v_expected:=btrim(v_expected); end if;
        if coalesce((v_key->>'ignoreCase')::boolean,true) then v_expected:=lower(v_expected); end if;
        if v_value=v_expected then v_score=(v_key->>'marks')::numeric; exit; end if;
      end loop;
    end if;
  end if;
  insert into public.intensive_student_answers(attempt_id,question_id,answer,is_flagged,score,auto_graded,saved_at)
  values(p_attempt_id,p_question_id,p_answer,p_flagged,v_score,v_auto,now())
  on conflict(attempt_id,question_id) do update set answer=excluded.answer,is_flagged=excluded.is_flagged,score=excluded.score,auto_graded=excluded.auto_graded,saved_at=now();
  update public.intensive_exam_attempts set last_saved_at=now() where id=p_attempt_id;
  return jsonb_build_object('saved',true,'saved_at',now());
end $$;

create or replace function public.intensive_submit_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_attempt public.intensive_exam_attempts%rowtype; v_exam public.intensive_exams%rowtype; v_objective numeric; v_manual numeric; v_pending boolean; v_final numeric; v_percent numeric; v_publish boolean; v_result uuid;
begin
  select * into v_attempt from public.intensive_exam_attempts where id=p_attempt_id and student_id=auth.uid() for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status not in ('IN_PROGRESS','EXPIRED') then return jsonb_build_object('submitted',true,'attempt_id',p_attempt_id); end if;
  select * into v_exam from public.intensive_exams where id=v_attempt.exam_id;
  select coalesce(sum(score),0), coalesce(bool_or(score is null),false) into v_objective,v_pending from public.intensive_student_answers where attempt_id=p_attempt_id;
  v_manual:=0; v_final:=case when v_pending then null else v_objective end;
  v_percent:=case when v_final is null or v_exam.total_marks=0 then null else round(v_final/v_exam.total_marks*100,2) end;
  v_publish:=not v_pending and (v_exam.result_release='IMMEDIATE' or (v_exam.result_release='AFTER_END' and now()>=v_exam.ends_at));
  update public.intensive_exam_attempts set status=case when v_pending then 'SUBMITTED' else 'GRADED' end, submitted_at=coalesce(submitted_at,least(now(),expires_at)),objective_score=v_objective,final_score=v_final where id=p_attempt_id;
  insert into public.intensive_results(attempt_id,exam_id,student_id,objective_score,manual_score,final_score,total_marks,percentage,status,grading_status,is_published,published_at)
  values(p_attempt_id,v_exam.id,auth.uid(),v_objective,v_manual,v_final,v_exam.total_marks,v_percent,case when v_final is null then 'PENDING' when v_exam.passing_score is null or v_final>=v_exam.passing_score then 'PASS' else 'FAIL' end,case when v_pending then 'PENDING' else 'COMPLETE' end,v_publish,case when v_publish then now() end)
  on conflict(attempt_id) do update set objective_score=excluded.objective_score,final_score=excluded.final_score,percentage=excluded.percentage,status=excluded.status,grading_status=excluded.grading_status,is_published=excluded.is_published,published_at=excluded.published_at
  returning id into v_result;
  return jsonb_build_object('submitted',true,'result_id',v_result,'pending_grading',v_pending);
end $$;

create or replace function public.intensive_finalize_grading(p_attempt_id uuid,p_publish boolean default false)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_attempt public.intensive_exam_attempts%rowtype; v_exam public.intensive_exams%rowtype; v_objective numeric; v_manual numeric; v_total numeric; v_percent numeric;
begin
  if not public.intensive_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_attempt from public.intensive_exam_attempts where id=p_attempt_id for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  select * into v_exam from public.intensive_exams where id=v_attempt.exam_id;
  if exists(select 1 from public.intensive_student_answers where attempt_id=p_attempt_id and score is null) then raise exception 'GRADING_INCOMPLETE'; end if;
  select coalesce(sum(score) filter(where auto_graded),0),coalesce(sum(score) filter(where not auto_graded),0) into v_objective,v_manual from public.intensive_student_answers where attempt_id=p_attempt_id;
  v_total:=v_objective+v_manual; v_percent:=case when v_exam.total_marks=0 then 0 else round(v_total/v_exam.total_marks*100,2) end;
  update public.intensive_exam_attempts set status='GRADED',objective_score=v_objective,manual_score=v_manual,final_score=v_total where id=p_attempt_id;
  update public.intensive_results set objective_score=v_objective,manual_score=v_manual,final_score=v_total,percentage=v_percent,status=case when v_exam.passing_score is null or v_total>=v_exam.passing_score then 'PASS' else 'FAIL' end,grading_status='COMPLETE',is_published=p_publish or is_published,published_at=case when p_publish and published_at is null then now() else published_at end where attempt_id=p_attempt_id;
  insert into public.intensive_audit_logs(admin_id,action,target_type,target_id,details) values(auth.uid(),'GRADE_CHANGED','ATTEMPT',p_attempt_id::text,jsonb_build_object('final_score',v_total,'published',p_publish));
  return jsonb_build_object('complete',true,'final_score',v_total,'percentage',v_percent);
end $$;

create or replace function public.intensive_audit_changes()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_action text; v_id text;
begin
  if not public.intensive_is_admin() then return coalesce(new,old); end if;
  v_id:=coalesce(new.id,old.id)::text;
  if tg_op='INSERT' then v_action:=upper(replace(tg_table_name,'intensive_',''))||'_CREATED';
  elsif tg_op='DELETE' then v_action:=upper(replace(tg_table_name,'intensive_',''))||'_DELETED';
  else v_action:=upper(replace(tg_table_name,'intensive_',''))||'_UPDATED'; end if;
  insert into public.intensive_audit_logs(admin_id,action,target_type,target_id,details) values(auth.uid(),v_action,upper(replace(tg_table_name,'intensive_','')),v_id,jsonb_build_object('operation',tg_op));
  return coalesce(new,old);
end $$;

do $$ declare t text; begin
  foreach t in array array['intensive_profiles','intensive_courses','intensive_exams','intensive_questions'] loop
    execute format('drop trigger if exists %I_audit on public.%I',t,t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.intensive_audit_changes()',t,t);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array[
    'intensive_profiles','intensive_courses','intensive_enrollments','intensive_trusted_devices','intensive_access_logs',
    'intensive_student_groups','intensive_group_members','intensive_exams','intensive_exam_sections','intensive_passages',
    'intensive_questions','intensive_question_options','intensive_exam_questions','intensive_exam_pool_rules','intensive_exam_assignments',
    'intensive_exam_attempts','intensive_attempt_keys','intensive_student_answers','intensive_results','intensive_audit_logs','intensive_settings'
  ] loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;

create policy profiles_select on public.intensive_profiles for select to authenticated using (id=auth.uid() or public.intensive_is_admin());
create policy profiles_admin_write on public.intensive_profiles for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy courses_select on public.intensive_courses for select to authenticated using (public.intensive_is_admin() or exists(select 1 from public.intensive_enrollments e where e.course_id=id and e.student_id=auth.uid() and e.is_active));
create policy courses_admin_write on public.intensive_courses for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy enrollments_select on public.intensive_enrollments for select to authenticated using (student_id=auth.uid() or public.intensive_is_admin());
create policy enrollments_admin_write on public.intensive_enrollments for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy devices_select on public.intensive_trusted_devices for select to authenticated using (student_id=auth.uid() or public.intensive_is_admin());
create policy devices_admin_write on public.intensive_trusted_devices for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy access_logs_admin_select on public.intensive_access_logs for select to authenticated using (public.intensive_is_admin());
create policy groups_admin_all on public.intensive_student_groups for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy group_members_admin_all on public.intensive_group_members for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy exams_select on public.intensive_exams for select to authenticated using (public.intensive_is_admin() or public.intensive_is_assigned(id,auth.uid()));
create policy exams_admin_write on public.intensive_exams for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy sections_select on public.intensive_exam_sections for select to authenticated using (public.intensive_is_admin() or public.intensive_is_assigned(exam_id,auth.uid()));
create policy sections_admin_write on public.intensive_exam_sections for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy passages_admin_all on public.intensive_passages for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy questions_admin_all on public.intensive_questions for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy options_admin_all on public.intensive_question_options for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy exam_questions_admin_all on public.intensive_exam_questions for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy pool_rules_admin_all on public.intensive_exam_pool_rules for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy assignments_select on public.intensive_exam_assignments for select to authenticated using (public.intensive_is_admin() or student_id=auth.uid() or public.intensive_is_assigned(exam_id,auth.uid()));
create policy assignments_admin_write on public.intensive_exam_assignments for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy attempts_select on public.intensive_exam_attempts for select to authenticated using (student_id=auth.uid() or public.intensive_is_admin());
create policy attempts_admin_write on public.intensive_exam_attempts for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy keys_admin_select on public.intensive_attempt_keys for select to authenticated using (public.intensive_is_admin());
create policy answers_select on public.intensive_student_answers for select to authenticated using (public.intensive_is_admin() or exists(select 1 from public.intensive_exam_attempts a where a.id=attempt_id and a.student_id=auth.uid()));
create policy answers_admin_update on public.intensive_student_answers for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy results_select on public.intensive_results for select to authenticated using (public.intensive_is_admin() or (student_id=auth.uid() and is_published));
create policy results_admin_write on public.intensive_results for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy audit_admin_select on public.intensive_audit_logs for select to authenticated using (public.intensive_is_admin());
create policy settings_select on public.intensive_settings for select to authenticated using (true);
create policy settings_admin_write on public.intensive_settings for all to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());

do $$ declare t text; begin
  foreach t in array array[
    'intensive_profiles','intensive_courses','intensive_enrollments','intensive_trusted_devices','intensive_access_logs',
    'intensive_student_groups','intensive_group_members','intensive_exams','intensive_exam_sections','intensive_passages',
    'intensive_questions','intensive_question_options','intensive_exam_questions','intensive_exam_pool_rules','intensive_exam_assignments',
    'intensive_exam_attempts','intensive_attempt_keys','intensive_student_answers','intensive_results','intensive_audit_logs','intensive_settings'
  ] loop
    execute format('revoke all on table public.%I from anon, authenticated',t);
    execute format('grant select,insert,update,delete on table public.%I to authenticated',t);
  end loop;
end $$;
do $$
declare s text;
begin
  for s in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and c.relname like 'intensive\_%' escape '\'
  loop
    execute format('grant usage, select on sequence public.%I to authenticated', s);
  end loop;
end
$$;
revoke all on function public.intensive_is_admin() from public, anon;
revoke all on function public.intensive_is_assigned(uuid,uuid) from public, anon;
revoke all on function public.intensive_register_or_verify_device(text,text,inet) from public, anon;
revoke all on function public.intensive_verify_device(text) from public, anon;
revoke all on function public.intensive_reset_device(uuid) from public, anon;
revoke all on function public.intensive_start_exam(uuid) from public, anon;
revoke all on function public.intensive_save_answer(uuid,uuid,jsonb,boolean) from public, anon;
revoke all on function public.intensive_submit_attempt(uuid) from public, anon;
revoke all on function public.intensive_finalize_grading(uuid,boolean) from public, anon;
grant execute on function public.intensive_is_admin() to authenticated;
grant execute on function public.intensive_is_assigned(uuid,uuid) to authenticated;
grant execute on function public.intensive_register_or_verify_device(text,text,inet) to authenticated;
grant execute on function public.intensive_verify_device(text) to authenticated;
grant execute on function public.intensive_reset_device(uuid) to authenticated;
grant execute on function public.intensive_finalize_grading(uuid,boolean) to authenticated;

insert into public.intensive_courses(code,title,description,default_cover_url) values
('EL097_EL099E','English Intensive Program','A focused foundation program preparing students for academic English success.','/covers/el097-el099e.svg'),
('EL098','English Intensive Course','English for the 21st Century · Level 2','/covers/el098.svg'),
('EL099','English Intensive Course','English for the 21st Century · Level 3','/covers/el099.svg'),
('EL111','English Intensive Course','English for the 21st Century · Level 4','/covers/el111.svg'),
('EL112','English Intensive Course','English for the 21st Century · Level 5','/covers/el112.svg')
on conflict(code) do update set title=excluded.title,description=excluded.description,default_cover_url=excluded.default_cover_url;
insert into public.intensive_settings(id) values(true) on conflict(id) do nothing;

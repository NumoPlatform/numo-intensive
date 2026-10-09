-- NUMO Writing: keep genuinely ungraded saved essays pending rather than publishing 0/25.
-- Scope: Quiz 2 Writing of EL098 and EL097_EL099E only.
create table if not exists public.intensive_writing_pending (
  section_attempt_id uuid primary key references public.intensive_section_attempts(id) on delete cascade,
  exam_attempt_id uuid not null references public.intensive_exam_attempts(id) on delete cascade,
  section_id uuid not null references public.intensive_exam_sections(id) on delete cascade,
  question_id uuid not null references public.intensive_questions(id) on delete restrict,
  student_id uuid not null references public.intensive_profiles(id) on delete cascade,
  topic_index integer,
  original_text text not null,
  status text not null default 'PENDING' check (status in ('PENDING','GRADED')),
  score numeric,
  report jsonb,
  created_at timestamptz not null default now(),
  graded_at timestamptz
);
create index if not exists intensive_writing_pending_student_status
  on public.intensive_writing_pending(student_id,status,created_at desc);
alter table public.intensive_writing_pending enable row level security;
revoke all on public.intensive_writing_pending from public,anon,authenticated;
grant all on public.intensive_writing_pending to service_role;

create or replace function public.intensive_preserve_pending_writing()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare
  v_question uuid;
  v_answer jsonb;
  v_score numeric;
  v_course text;
begin
  if old.status <> 'IN_PROGRESS' or new.status not in ('GRADED','EXPIRED') then
    return new;
  end if;
  select c.code,eq.question_id into v_course,v_question
    from public.intensive_exams e
    join public.intensive_courses c on c.id=e.course_id
    join public.intensive_exam_questions eq on eq.exam_id=e.id and eq.section_id=new.section_id
    join public.intensive_questions q on q.id=eq.question_id
    where e.id=new.exam_id and e.category='QUIZ 2' and q.skill='Writing'
    limit 1;
  if v_course not in ('EL098','EL097_EL099E') or v_question is null then
    return new;
  end if;
  select sa.answer,sa.score into v_answer,v_score
    from public.intensive_student_answers sa
    where sa.attempt_id=new.exam_attempt_id and sa.question_id=v_question
    limit 1;
  if nullif(btrim(coalesce(v_answer->>'text','')),'') is not null and v_score is null then
    -- score remains a private DB placeholder because the legacy column is NOT NULL.
    -- A NULL percentage and pending queue ensure students are never shown a false zero.
    new.percentage := null;
    new.review_snapshot := '[]'::jsonb;
    new.correct_count := 0;
    new.wrong_count := 0;
  end if;
  return new;
end $$;

drop trigger if exists intensive_pending_writing_before on public.intensive_section_attempts;
create trigger intensive_pending_writing_before
before update of status on public.intensive_section_attempts
for each row execute function public.intensive_preserve_pending_writing();

create or replace function public.intensive_enqueue_pending_writing()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare
  v_question uuid;
  v_answer jsonb;
  v_course text;
begin
  if old.status <> 'IN_PROGRESS' or new.status not in ('GRADED','EXPIRED')
     or new.percentage is not null then return new; end if;
  select c.code,eq.question_id into v_course,v_question
    from public.intensive_exams e
    join public.intensive_courses c on c.id=e.course_id
    join public.intensive_exam_questions eq on eq.exam_id=e.id and eq.section_id=new.section_id
    join public.intensive_questions q on q.id=eq.question_id
    where e.id=new.exam_id and e.category='QUIZ 2' and q.skill='Writing'
    limit 1;
  if v_course not in ('EL098','EL097_EL099E') or v_question is null then return new; end if;
  select sa.answer into v_answer from public.intensive_student_answers sa
    where sa.attempt_id=new.exam_attempt_id and sa.question_id=v_question limit 1;
  if nullif(btrim(coalesce(v_answer->>'text','')),'') is null then return new; end if;
  insert into public.intensive_writing_pending(
    section_attempt_id,exam_attempt_id,section_id,question_id,student_id,topic_index,original_text
  ) values (
    new.id,new.exam_attempt_id,new.section_id,v_question,new.student_id,
    nullif(v_answer->>'topicIndex','')::integer,v_answer->>'text'
  ) on conflict(section_attempt_id) do nothing;
  return new;
end $$;

drop trigger if exists intensive_pending_writing_after on public.intensive_section_attempts;
create trigger intensive_pending_writing_after
after update of status on public.intensive_section_attempts
for each row execute function public.intensive_enqueue_pending_writing();

-- Save retries with unchanged Writing text must never erase a valid AI grade.
-- Changing the text legitimately clears the score for a fresh assessment.
create or replace function public.intensive_preserve_graded_writing_answer()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $
declare v_course text;
begin
  if old.score is null or new.score is not null
     or old.answer is distinct from new.answer then return new; end if;
  select c.code into v_course from public.intensive_questions q
    join public.intensive_courses c on c.id=q.course_id
    where q.id=new.question_id and q.skill='Writing' and q.exam_category='QUIZ 2';
  if v_course in ('EL098','EL097_EL099E') then
    new.score:=old.score;
    new.auto_graded:=old.auto_graded;
    new.admin_feedback:=old.admin_feedback;
    new.graded_at:=old.graded_at;
  end if;
  return new;
end $;
drop trigger if exists intensive_preserve_graded_writing on public.intensive_student_answers;
create trigger intensive_preserve_graded_writing
before update of answer,score on public.intensive_student_answers
for each row execute function public.intensive_preserve_graded_writing_answer();

-- Server-only atomic resolution. A student cannot supply a score by calling an RPC.
create or replace function public.intensive_resolve_pending_writing(
  p_section_attempt_id uuid, p_score numeric, p_report jsonb
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public
as $$
declare
  v_pending public.intensive_writing_pending%rowtype;
  v_section public.intensive_section_attempts%rowtype;
  v_best numeric;
  v_progress jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_score is null or p_score < 0 or p_score > 25 or p_report is null
    then raise exception 'INVALID_WRITING_GRADE'; end if;
  select * into v_pending from public.intensive_writing_pending
    where section_attempt_id=p_section_attempt_id for update;
  if not found then raise exception 'PENDING_WRITING_NOT_FOUND'; end if;
  if v_pending.status='GRADED' then return jsonb_build_object('status','GRADED','score',v_pending.score); end if;
  select * into v_section from public.intensive_section_attempts
    where id=p_section_attempt_id for update;
  update public.intensive_section_attempts
  set score=p_score,percentage=round(p_score/25*100,2),
    correct_count=case when p_score=25 then 1 else 0 end,
    wrong_count=case when p_score=25 then 0 else 1 end,
    updated_at=now()
  where id=p_section_attempt_id;
  update public.intensive_writing_pending
    set status='GRADED',score=p_score,report=p_report,graded_at=now()
    where section_attempt_id=p_section_attempt_id;
  -- Only write the student answer when it still belongs to the same (latest) section attempt.
  if not exists (
    select 1 from public.intensive_section_attempts s
    where s.exam_attempt_id=v_section.exam_attempt_id and s.section_id=v_section.section_id
      and s.attempt_number>v_section.attempt_number
  ) then
    update public.intensive_student_answers sa
    set score=p_score,auto_graded=true,admin_feedback=p_report::text,graded_at=now()
    where sa.attempt_id=v_pending.exam_attempt_id and sa.question_id=v_pending.question_id
      and sa.answer->>'text'=v_pending.original_text
      and (sa.answer->>'topicIndex')::integer=v_pending.topic_index;
  end if;
  select max(percentage) into v_best from public.intensive_section_attempts
    where exam_attempt_id=v_section.exam_attempt_id and section_id=v_section.section_id
      and percentage is not null;
  select section_progress into v_progress from public.intensive_exam_attempts
    where id=v_section.exam_attempt_id for update;
  if v_progress->v_section.section_id::text->>'last_attempt_id'=p_section_attempt_id::text then
    v_progress := jsonb_set(
      coalesce(v_progress,'{}'::jsonb),
      array[v_section.section_id::text],
      coalesce(v_progress->v_section.section_id::text,'{}'::jsonb)
      || jsonb_build_object('last_score',p_score,'last_percentage',round(p_score/25*100,2),
        'best_score',coalesce(v_best,0)*25/100,'best_percentage',coalesce(v_best,0)),
      true
    );
  else
    v_progress := jsonb_set(
      coalesce(v_progress,'{}'::jsonb),
      array[v_section.section_id::text,'best_percentage'],to_jsonb(coalesce(v_best,0)),true
    );
  end if;
  update public.intensive_exam_attempts set section_progress=v_progress,updated_at=now()
    where id=v_section.exam_attempt_id;
  return jsonb_build_object('status','GRADED','score',p_score);
end $$;
revoke all on function public.intensive_resolve_pending_writing(uuid,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.intensive_resolve_pending_writing(uuid,numeric,jsonb) to service_role;

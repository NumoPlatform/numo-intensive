-- Lock an EL098 Quiz 2 objective answer after its first non-null submission.
-- Writing drafts remain editable. No other course, exam or grading behavior is altered.
create or replace function public.intensive_lock_el098_quiz2_answer()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope boolean;
begin
  if old.answer is null or old.answer = 'null'::jsonb
     or old.answer is not distinct from new.answer then
    return new;
  end if;

  select true into v_scope
  from public.intensive_exam_attempts a
  join public.intensive_exams e on e.id = a.exam_id
  join public.intensive_courses c on c.id = e.course_id
  join public.intensive_questions q on q.id = old.question_id
  where a.id = old.attempt_id
    and c.code = 'EL098'
    and e.category = 'QUIZ 2'
    and upper(q.skill) <> 'WRITING'
  limit 1;

  if coalesce(v_scope, false) then
    raise exception 'EL098_OBJECTIVE_ANSWER_LOCKED' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists intensive_el098_quiz2_answer_lock
  on public.intensive_student_answers;
create trigger intensive_el098_quiz2_answer_lock
before update of answer on public.intensive_student_answers
for each row
execute function public.intensive_lock_el098_quiz2_answer();

revoke all on function public.intensive_lock_el098_quiz2_answer()
  from public, anon, authenticated;

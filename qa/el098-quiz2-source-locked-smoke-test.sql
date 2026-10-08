-- NUMO EL098 Quiz 2 isolated QA
-- Run in a transaction-capable SQL console as a privileged maintainer.
-- Creates temporary test records inside an exception subtransaction; NO test data persists.
-- The expected failure is exactly EL098_OBJECTIVE_ANSWER_LOCKED.
do $qa$
declare
  v_student uuid;
  v_exam uuid := '0a1e1ade-bdad-555c-a87a-82227fc9eda0';
  v_attempt uuid;
  v_obj uuid;
  v_write uuid;
  v_locked boolean := false;
  v_value jsonb;
begin
  begin
    select id into v_student from public.intensive_profiles where role='STUDENT' limit 1;
    select eq.question_id into v_obj
      from public.intensive_exam_questions eq
      join public.intensive_exam_sections s on s.id=eq.section_id
      where eq.exam_id=v_exam and s.position=1 and eq.position=1 limit 1;
    select eq.question_id into v_write
      from public.intensive_exam_questions eq
      join public.intensive_exam_sections s on s.id=eq.section_id
      where eq.exam_id=v_exam and s.position=3 and eq.position=1 limit 1;
    if v_student is null or v_obj is null or v_write is null then
      raise exception 'QA_INPUT_MISSING' using errcode='22000';
    end if;
    insert into public.intensive_exam_attempts
      (exam_id,student_id,attempt_number,expires_at,question_snapshot)
      values(v_exam,v_student,999999,now()+interval '1 day','[]'::jsonb)
      returning id into v_attempt;
    insert into public.intensive_student_answers(attempt_id,question_id,answer)
      values(v_attempt,v_obj,to_jsonb('a'::text));
    update public.intensive_student_answers set answer=to_jsonb('a'::text)
      where attempt_id=v_attempt and question_id=v_obj;
    begin
      update public.intensive_student_answers set answer=to_jsonb('b'::text)
        where attempt_id=v_attempt and question_id=v_obj;
    exception when check_violation then
      if SQLERRM='EL098_OBJECTIVE_ANSWER_LOCKED' then v_locked:=true; end if;
    end;
    if not v_locked then raise exception 'QA_OBJECTIVE_LOCK_FAILED' using errcode='22000'; end if;
    insert into public.intensive_student_answers(attempt_id,question_id,answer)
      values(v_attempt,v_write,jsonb_build_object('topicIndex',1,'text','first draft'));
    update public.intensive_student_answers
      set answer=jsonb_build_object('topicIndex',1,'text','revised draft')
      where attempt_id=v_attempt and question_id=v_write;
    select answer into v_value from public.intensive_student_answers
      where attempt_id=v_attempt and question_id=v_write;
    if v_value->>'text' <> 'revised draft' then
      raise exception 'QA_WRITING_SAVE_FAILED' using errcode='22000';
    end if;
    raise exception 'QA_ROLLBACK' using errcode='P0001';
  exception when sqlstate 'P0001' then
    raise notice 'QA_PASS: locked objective, idempotent repeat, editable Writing; synthetic data rolled back';
  end;
end $qa$;

select count(*) as synthetic_attempts_remaining
from public.intensive_exam_attempts
where attempt_number=999999;

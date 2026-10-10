-- Publisher request: do not exclude ANY EL099 Quiz2 question.
-- Safely release all source items as source-keyed PRACTICE, with UI notices
-- for the original PDF's 11 ambiguous/inaccurate entries. No scores changed.
DO $release$
DECLARE
 v_exam uuid:=md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid;
 v_total int;
 v_grammar int;
 v_reading int;
 v_writing int;
 v_keyed int;
 v_warn int;
BEGIN
 SELECT count(*) FILTER(WHERE s.position=1),
        count(*) FILTER(WHERE s.position=2),
        count(*) FILTER(WHERE s.position=3),
        count(*)
 INTO v_grammar,v_reading,v_writing,v_total
 FROM public.intensive_exam_questions eq
 JOIN public.intensive_exam_sections s ON s.id=eq.section_id
 JOIN public.intensive_questions q ON q.id=eq.question_id
 WHERE eq.exam_id=v_exam AND q.is_active;
 IF v_grammar<>166 OR v_reading<>44 OR v_writing<>1 OR v_total<>211 THEN
  RAISE EXCEPTION 'EL099_SOURCE_QUESTION_COUNT_MISMATCH: %, %, %, %',v_grammar,v_reading,v_writing,v_total;
 END IF;
 SELECT count(*) INTO v_keyed
 FROM public.intensive_exam_questions eq
 JOIN public.intensive_questions q ON q.id=eq.question_id
 WHERE eq.exam_id=v_exam AND q.type='MULTIPLE_CHOICE'
 AND (SELECT count(*) FROM public.intensive_question_options o WHERE o.question_id=q.id AND o.is_correct)=1;
 IF v_keyed<>210 THEN RAISE EXCEPTION 'EL099_SOURCE_KEYS_INCOMPLETE: %',v_keyed; END IF;
 SELECT count(*) INTO v_warn
 FROM public.intensive_exam_questions eq JOIN public.intensive_questions q ON q.id=eq.question_id
 WHERE eq.exam_id=v_exam AND q.reference_evidence LIKE 'EL099_SOURCE_NOTE:%';
 IF v_warn<>11 THEN RAISE EXCEPTION 'EL099_SOURCE_WARNINGS_INCOMPLETE: %',v_warn; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.intensive_exam_assignments WHERE exam_id=v_exam AND all_course_students)
 THEN RAISE EXCEPTION 'EL099_STUDENT_ASSIGNMENT_MISSING'; END IF;
 UPDATE public.intensive_exams SET status='LIVE',updated_at=now()
 WHERE id=v_exam AND status IN('DRAFT','LIVE');
 IF NOT FOUND THEN RAISE EXCEPTION 'EL099_EXAM_NOT_PUBLISHABLE'; END IF;
END;
$release$;
SELECT id,title,status,attempts_allowed,total_marks
FROM public.intensive_exams WHERE id=md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid;
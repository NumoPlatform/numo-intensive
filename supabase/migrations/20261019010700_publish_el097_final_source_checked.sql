-- Release the source-reviewed EL097/EL099E Final practice exam.
-- Three unkeyed original questions remain retained in the review bank;
-- zero arbitrary answers or student-grade updates.
DO $publish$
DECLARE v_exam uuid:='cf9c621b-1611-fcb7-3f63-58542eb59774';
 v_gv int;v_rd int;v_w int;v_mcq int;v_tf int;v_unkeyed int;v_assignment int;
BEGIN
 SELECT count(*) FILTER(WHERE s.position=1),
        count(*) FILTER(WHERE s.position=2),
        count(*) FILTER(WHERE s.position=3),
        count(*) FILTER(WHERE q.type='MULTIPLE_CHOICE'),
        count(*) FILTER(WHERE q.type='TRUE_FALSE')
 INTO v_gv,v_rd,v_w,v_mcq,v_tf
 FROM public.intensive_exam_questions eq
 JOIN public.intensive_exam_sections s ON s.id=eq.section_id
 JOIN public.intensive_questions q ON q.id=eq.question_id AND q.is_active
 WHERE eq.exam_id=v_exam AND s.is_enabled;
 IF v_gv<>173 OR v_rd<>50 OR v_w<>1 OR v_mcq<>218 OR v_tf<>5 THEN
  RAISE EXCEPTION 'EL097_FINAL_ACADEMIC_QA_MISMATCH (% % % % %)',
    v_gv,v_rd,v_w,v_mcq,v_tf;
 END IF;
 IF EXISTS(
  SELECT 1 FROM public.intensive_exam_questions eq
  JOIN public.intensive_questions q ON q.id=eq.question_id
  WHERE eq.exam_id=v_exam AND q.type='MULTIPLE_CHOICE'
    AND (SELECT count(*) FROM public.intensive_question_options o
      WHERE o.question_id=q.id AND o.is_correct)<>1
 ) THEN RAISE EXCEPTION 'EL097_FINAL_MULTIPLE_CHOICE_KEY_INCOMPLETE'; END IF;
 SELECT count(*) INTO v_unkeyed
 FROM public.intensive_questions q
 WHERE q.course_id=(SELECT id FROM public.intensive_courses WHERE code='EL097_EL099E')
 AND q.exam_category='FINAL' AND NOT q.is_active
 AND NOT EXISTS(SELECT 1 FROM public.intensive_exam_questions eq
 WHERE eq.question_id=q.id AND eq.exam_id=v_exam);
 IF v_unkeyed<>3 THEN RAISE EXCEPTION 'EL097_FINAL_UNRESOLVED_SOURCE_QUESTIONS_MISSING'; END IF;
 SELECT count(*) INTO v_assignment FROM public.intensive_exam_assignments
 WHERE exam_id=v_exam AND all_course_students;
 IF v_assignment<1 THEN RAISE EXCEPTION 'EL097_FINAL_ASSIGNMENT_MISSING'; END IF;
 IF (SELECT count(*) FROM public.intensive_passages p
 WHERE p.id IN(SELECT DISTINCT q.passage_id
 FROM public.intensive_exam_questions eq JOIN public.intensive_questions q ON q.id=eq.question_id
 WHERE eq.exam_id=v_exam AND q.passage_id IS NOT NULL))<>7
 THEN RAISE EXCEPTION 'EL097_FINAL_PASSAGE_BANK_INCOMPLETE'; END IF;
 UPDATE public.intensive_exams
 SET status='LIVE',updated_at=now()
 WHERE id=v_exam AND status='DRAFT' AND attempts_allowed=0 AND total_marks=248;
 IF NOT FOUND THEN RAISE EXCEPTION 'EL097_FINAL_NOT_READY_FOR_PUBLISH'; END IF;
END;
$publish$;
SELECT id,title,status,total_marks,attempts_allowed
FROM public.intensive_exams WHERE id='cf9c621b-1611-fcb7-3f63-58542eb59774';
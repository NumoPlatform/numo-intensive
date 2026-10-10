-- Four illustrated Reading items cannot be answered from their respective
-- full passage texts; withhold from LIVE practice pending source correction:
-- Dubai Q3 (restaurants), Q4 (unlocatable pronoun), Q6 (desert safari);
-- Discovering Joy Q5 (social connections not present in passage).
-- Keep source questions in bank (inactive) for audit; never invent passage facts.
WITH flagged AS (
 SELECT md5('NUMO:EL099:Q2:READING:'||n)::uuid AS id FROM (VALUES(11),(12),(14),(29)) AS v(n)
), removed AS (
 DELETE FROM public.intensive_exam_questions eq
 USING flagged f
 WHERE eq.exam_id=md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid AND eq.question_id=f.id
 RETURNING eq.id
), updated AS (
 UPDATE public.intensive_questions q SET is_active=false,updated_at=now()
 WHERE q.id IN (SELECT id FROM flagged)
 RETURNING q.id
), section AS (
 UPDATE public.intensive_exam_sections
 SET question_count=40,marks=40,updated_at=now(),
 instructions='Read each of the seven complete passages and answer 40 source-supported questions. Four source questions were withheld due to missing passage evidence.'
 WHERE id=md5('NUMO:EL099:QUIZ2:SECTION:2')::uuid
 RETURNING id
), exam AS(
 UPDATE public.intensive_exams
 SET total_marks=224,updated_at=now()
 WHERE id=md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid AND status='DRAFT'
 RETURNING id
)
SELECT (SELECT COUNT(*) FROM removed) detached_unanswerable_items,
 (SELECT COUNT(*) FROM updated) bank_items_flagged,
 (SELECT COUNT(*) FROM section) reading_section_updated,
 (SELECT COUNT(*) FROM exam) draft_exam_updated;
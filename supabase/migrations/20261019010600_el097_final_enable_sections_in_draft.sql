-- Activate the three actual EL097 Final exam sections.
-- This does not publish the exam: the parent remains DRAFT until QA approval.
DO $qa$
DECLARE v_count integer;
BEGIN
 SELECT count(*) INTO v_count
 FROM public.intensive_exam_sections
 WHERE exam_id='cf9c621b-1611-fcb7-3f63-58542eb59774'::uuid
   AND position IN(1,2,3);
 IF v_count<>3 THEN RAISE EXCEPTION 'EL097_FINAL_SECTION_STRUCTURE_CHANGED'; END IF;
 UPDATE public.intensive_exam_sections
 SET is_enabled=true,updated_at=now()
 WHERE exam_id='cf9c621b-1611-fcb7-3f63-58542eb59774'::uuid;
END $qa$;
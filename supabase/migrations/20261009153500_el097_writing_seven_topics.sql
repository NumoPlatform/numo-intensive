-- Allow seven official EL097 Quiz 2 Writing prompts while preserving EL098's two-prompt limit.
-- Does not change exam data, student answers, scores, or existing writing reports.
ALTER TABLE public.intensive_writing_assessments
DROP CONSTRAINT IF EXISTS intensive_writing_assessments_topic_index_check;
ALTER TABLE public.intensive_writing_assessments
ADD CONSTRAINT intensive_writing_assessments_topic_index_check
CHECK (topic_index BETWEEN 1 AND 7);

CREATE OR REPLACE FUNCTION public.intensive_validate_writing_topic_for_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $numo$
DECLARE v_code text;
BEGIN
  SELECT c.code INTO v_code
    FROM public.intensive_exams e
    JOIN public.intensive_courses c ON c.id=e.course_id
    WHERE e.id = NEW.exam_id;
  IF v_code = 'EL098' AND NEW.topic_index NOT BETWEEN 1 AND 2 THEN
    RAISE EXCEPTION 'EL098_WRITING_TOPIC_OUT_OF_RANGE'
      USING ERRCODE='23514';
  END IF;
  IF v_code = 'EL097_EL099E' AND NEW.topic_index NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'EL097_WRITING_TOPIC_OUT_OF_RANGE'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$numo$;
REVOKE ALL ON FUNCTION public.intensive_validate_writing_topic_for_course()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS intensive_validate_writing_topic_before
  ON public.intensive_writing_assessments;
CREATE TRIGGER intensive_validate_writing_topic_before
BEFORE INSERT OR UPDATE OF topic_index, exam_id
ON public.intensive_writing_assessments
FOR EACH ROW EXECUTE FUNCTION public.intensive_validate_writing_topic_for_course();

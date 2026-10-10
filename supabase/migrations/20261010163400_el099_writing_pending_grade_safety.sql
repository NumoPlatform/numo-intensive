-- Extend established deferred Writing safety to EL099 Quiz 2.
-- No changes to existing student grades, submissions, or devices.
DO $mig$
DECLARE n text; f text;
BEGIN
 FOREACH n IN ARRAY ARRAY[
 'intensive_enqueue_pending_writing',
 'intensive_preserve_pending_writing',
 'intensive_preserve_graded_writing_answer'
 ] LOOP
   SELECT pg_get_functiondef(to_regprocedure('public.' || n || '()')) INTO f;
   IF f IS NULL OR position('''EL098'',''EL097_EL099E''' IN f) = 0 THEN
     RAISE EXCEPTION 'WRITING_TRIGGER_SOURCE_CHANGED: %',n;
   END IF;
   f:=replace(f,'''EL098'',''EL097_EL099E''','''EL098'',''EL097_EL099E'',''EL099''');
   EXECUTE f;
 END LOOP;
END $mig$;

-- Validate the six sourced EL099 writing topics, rather than allowing a nonexistent 7th.
CREATE OR REPLACE FUNCTION public.intensive_validate_writing_topic_for_course()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $numo$
DECLARE v_code text;
BEGIN
  SELECT c.code INTO v_code
  FROM public.intensive_exams e JOIN public.intensive_courses c ON c.id=e.course_id
  WHERE e.id=NEW.exam_id;
  IF v_code='EL098' AND NEW.topic_index NOT BETWEEN 1 AND 2 THEN
     RAISE EXCEPTION 'EL098_WRITING_TOPIC_OUT_OF_RANGE' USING ERRCODE='23514';
  END IF;
  IF v_code='EL097_EL099E' AND NEW.topic_index NOT BETWEEN 1 AND 7 THEN
     RAISE EXCEPTION 'EL097_WRITING_TOPIC_OUT_OF_RANGE' USING ERRCODE='23514';
  END IF;
  IF v_code='EL099' AND NEW.topic_index NOT BETWEEN 1 AND 6 THEN
     RAISE EXCEPTION 'EL099_WRITING_TOPIC_OUT_OF_RANGE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$numo$;
REVOKE ALL ON FUNCTION public.intensive_validate_writing_topic_for_course()
  FROM PUBLIC,anon,authenticated;

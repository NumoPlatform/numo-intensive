-- Extend the existing Writing deferred-grade safety to EL097_EL099E FINAL ONLY.
-- Existing EL097, EL098 and EL099 Quiz 2 logic remains unchanged.
DO $mig$
DECLARE v_name text; v_def text;
BEGIN
 FOREACH v_name IN ARRAY ARRAY['intensive_enqueue_pending_writing','intensive_preserve_pending_writing'] LOOP
  SELECT pg_get_functiondef(to_regprocedure('public.'||v_name||'()')) INTO v_def;
  IF v_def IS NULL OR position('e.category=''QUIZ 2'' and q.skill=''Writing''' IN v_def)=0
    THEN RAISE EXCEPTION 'NUMO_WRITING_TRIGGER_HAS_CHANGED: %',v_name; END IF;
  v_def:=replace(v_def,
    'e.category=''QUIZ 2'' and q.skill=''Writing''',
    '(e.category=''QUIZ 2'' OR (e.category=''FINAL'' AND c.code=''EL097_EL099E'')) and q.skill=''Writing''');
  EXECUTE v_def;
 END LOOP;
 SELECT pg_get_functiondef(to_regprocedure('public.intensive_preserve_graded_writing_answer()')) INTO v_def;
 IF v_def IS NULL OR position('q.exam_category=''QUIZ 2''' IN v_def)=0
 THEN RAISE EXCEPTION 'NUMO_WRITING_PRESERVE_TRIGGER_HAS_CHANGED'; END IF;
 v_def:=replace(v_def,'q.exam_category=''QUIZ 2''',
  '(q.exam_category=''QUIZ 2'' OR (q.exam_category=''FINAL'' AND c.code=''EL097_EL099E''))');
 EXECUTE v_def;
END $mig$;

CREATE OR REPLACE FUNCTION public.intensive_validate_writing_topic_for_course()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $numo$
DECLARE v_code text; v_category text;
BEGIN
 SELECT c.code,e.category INTO v_code,v_category
 FROM public.intensive_exams e JOIN public.intensive_courses c ON c.id=e.course_id
 WHERE e.id=NEW.exam_id;
 IF v_code='EL098' AND NEW.topic_index NOT BETWEEN 1 AND 2 THEN
   RAISE EXCEPTION 'EL098_WRITING_TOPIC_OUT_OF_RANGE' USING ERRCODE='23514';
 END IF;
 IF v_code='EL097_EL099E' AND v_category='FINAL'
   AND NEW.topic_index NOT BETWEEN 1 AND 8 THEN
   RAISE EXCEPTION 'EL097_FINAL_WRITING_TOPIC_OUT_OF_RANGE' USING ERRCODE='23514';
 END IF;
 IF v_code='EL097_EL099E' AND v_category<>'FINAL'
   AND NEW.topic_index NOT BETWEEN 1 AND 7 THEN
   RAISE EXCEPTION 'EL097_QUIZ2_WRITING_TOPIC_OUT_OF_RANGE' USING ERRCODE='23514';
 END IF;
 IF v_code='EL099' AND NEW.topic_index NOT BETWEEN 1 AND 6 THEN
   RAISE EXCEPTION 'EL099_WRITING_TOPIC_OUT_OF_RANGE' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$numo$;
REVOKE ALL ON FUNCTION public.intensive_validate_writing_topic_for_course()
 FROM PUBLIC,anon,authenticated;
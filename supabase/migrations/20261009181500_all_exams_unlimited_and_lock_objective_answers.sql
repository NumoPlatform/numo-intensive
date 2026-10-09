-- NUMO Academic Simulator: all exam types permit unlimited independent attempts.
-- In this existing project attempts_allowed=0 means unlimited to both RPCs.
-- No test status, question, student answers, scores or history is changed.
ALTER TABLE public.intensive_exams
  ALTER COLUMN attempts_allowed SET DEFAULT 0;

WITH updated AS (
  UPDATE public.intensive_exams
  SET attempts_allowed=0, updated_at=now()
  WHERE attempts_allowed<>0
  RETURNING id,title,category,status
), audit AS (
  INSERT INTO public.intensive_audit_logs(admin_id,action,target_type,target_id,details)
  SELECT NULL,'UPDATE_EXAM_ATTEMPTS','intensive_exams',id::text,
    jsonb_build_object(
      'policy','unlimited_all_exams','new_attempts_allowed',0,
      'title',title,'category',category,'status_unchanged',status,
      'reason','NUMO simulator-wide unlimited training attempts requested by platform owner'
    )
  FROM updated
  RETURNING id
)
SELECT COUNT(*) AS updated_exams, (SELECT COUNT(*) FROM audit) AS audit_records
FROM updated;

-- When answers are explained instantly, the first saved objective selection
-- must remain immutable in the current attempt. Otherwise changing it after
-- revealing the key would corrupt grade integrity. A NEW section attempt
-- deletes its former answer and can pick any option again.
CREATE OR REPLACE FUNCTION public.intensive_lock_objective_selection()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $numo$
DECLARE v_type text;
BEGIN
  IF OLD.answer IS NOT NULL
     AND OLD.answer <> 'null'::jsonb
     AND NEW.answer IS DISTINCT FROM OLD.answer THEN
    SELECT q.type INTO v_type
    FROM public.intensive_questions q WHERE q.id=NEW.question_id;
    IF v_type IN ('MULTIPLE_CHOICE','TRUE_FALSE') THEN
      RAISE EXCEPTION 'NUMO_OBJECTIVE_ANSWER_ALREADY_CONFIRMED'
        USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$numo$;
REVOKE ALL ON FUNCTION public.intensive_lock_objective_selection()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS intensive_lock_objective_selection_before
  ON public.intensive_student_answers;
CREATE TRIGGER intensive_lock_objective_selection_before
BEFORE UPDATE OF answer ON public.intensive_student_answers
FOR EACH ROW EXECUTE FUNCTION public.intensive_lock_objective_selection();

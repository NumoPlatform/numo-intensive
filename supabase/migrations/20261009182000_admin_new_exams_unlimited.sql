-- Let administrators create unlimited-attempt training exams without
-- changing their creation workflows. Keep every other validation unchanged.
DO $migration$
DECLARE
  v_fn text;
  v_signature regprocedure := 'public.intensive_admin_create_exam(uuid,text,text,text,timestamp with time zone,timestamp with time zone,integer,jsonb,integer,text)'::regprocedure;
  v_original text := 'if p_attempts_allowed < 1 or p_attempts_allowed > 20 then';
BEGIN
  SELECT pg_get_functiondef(v_signature) INTO v_fn;
  IF v_fn IS NULL OR position(v_original IN v_fn)=0 THEN
    RAISE EXCEPTION 'NUMO_ADMIN_CREATE_EXAM_SIGNATURE_CHANGED';
  END IF;
  v_fn := replace(v_fn,v_original,'if p_attempts_allowed <> 0 then');
  v_fn := replace(v_fn,'p_attempts_allowed integer DEFAULT 1','p_attempts_allowed integer DEFAULT 0');
  EXECUTE v_fn;
END;
$migration$;

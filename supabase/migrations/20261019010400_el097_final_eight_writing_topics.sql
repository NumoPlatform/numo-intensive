-- Eight exactly transcribed writing topics from EL097 Final Answered Bank.
-- One Writing question (25 marks), student chooses any ONE original topic.
WITH question AS (
 INSERT INTO public.intensive_questions
 (id,course_id,exam_category,skill,type,difficulty,prompt,grading_mode,marks,
 reference_source,reference_unit,reference_page,tags)
 SELECT md5('NUMO:EL097:FINAL:WRITING:1')::uuid,id,
 'FINAL','Writing','SHORT_ANSWER','MEDIUM',
 'Choose ONE of the eight EL097 / EL099E final topics and write at least 100 English words.',
 'MANUAL',25,'NUMO EL097 Final Answered Question Bank',
 'Writing · Eight Original Topics','32',
 ARRAY['EL097-FINAL-WRITING','MIN_WORDS=100','RUBRIC=EL097-FINAL-NUMO-v1','TOPIC1=University life','TOPIC2=University campus','TOPIC3=City you have visited recently','TOPIC4=Your hometown','TOPIC5=Your best friend','TOPIC6=Your daily routine','TOPIC7=Write about your country','TOPIC8=Write an email to your friends talk about country']
 FROM public.intensive_courses WHERE code='EL097_EL099E'
 ON CONFLICT(id) DO NOTHING RETURNING id
), link AS (
 INSERT INTO public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
 SELECT 'cf9c621b-1611-fcb7-3f63-58542eb59774'::uuid,
 'b2077336-3f6c-9356-a960-7ced15fa036a'::uuid,id,25,1
 FROM question ON CONFLICT DO NOTHING RETURNING id
), assignment AS (
 INSERT INTO public.intensive_exam_assignments(exam_id,student_id,group_id,all_course_students)
 SELECT 'cf9c621b-1611-fcb7-3f63-58542eb59774'::uuid,NULL,NULL,true
 WHERE NOT EXISTS (
   SELECT 1 FROM public.intensive_exam_assignments a
   WHERE a.exam_id='cf9c621b-1611-fcb7-3f63-58542eb59774'::uuid AND a.all_course_students
 )
 RETURNING id
)
SELECT (SELECT COUNT(*) FROM question) AS writing_added,
 (SELECT COUNT(*) FROM link) AS writing_linked,
 (SELECT COUNT(*) FROM assignment) AS student_assignment;
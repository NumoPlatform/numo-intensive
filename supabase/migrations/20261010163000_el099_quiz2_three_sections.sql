-- EL099 Quiz 2 academic simulator: 3 independent source-based sections.
-- Remains DRAFT until all questions, reading passages, Writing, and QA pass.
-- Uses pre-existing EL099 course; never changes existing student data.
WITH course AS (
 SELECT id FROM public.intensive_courses WHERE code='EL099'
), new_exam AS (
 INSERT INTO public.intensive_exams
 (id,course_id,title,category,description,instructions,starts_at,ends_at,
 duration_minutes,attempts_allowed,total_marks,passing_score,result_release,
 status,allow_answer_review,shuffle_questions,shuffle_answers)
 SELECT md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid,id,
 'EL099 — QUIZ 2 | الكويز الثاني','QUIZ 2',
 'English for the 21st Century, Level 3. Academic practice from EL099 Quiz 2 question bank and seven reading passages.',
 'Complete each of the three sections independently. Unlimited practice attempts. Immediate correction for objective questions; Writing requires AI assessment and 150 words.',
 now()-interval '1 day',now()+interval '365 days',
 225,0,228,NULL,'IMMEDIATE','DRAFT',true,false,false
 FROM course ON CONFLICT(id) DO NOTHING RETURNING id
), exam AS (SELECT md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid AS id)
INSERT INTO public.intensive_exam_sections
(id,exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
SELECT md5('NUMO:EL099:QUIZ2:SECTION:'||v.position)::uuid,exam.id,
v.title,v.instructions,v.position,v.marks,v.question_count,true,v.minutes
FROM exam
CROSS JOIN (VALUES
 (1,'Grammar and Vocabulary','166 source questions reviewed; flagged ambiguous or incomplete items withheld. Answer selections receive direct source-key correction.',159::numeric,159,120),
 (2,'Reading (Passages)','Read each of the seven complete passages and answer 44 comprehension questions using the supplied answer keys.',44::numeric,44,60),
 (3,'Writing','Write approximately 150 words on ONE selected prompt. AI evaluation is out of 25 marks when service is available.',25::numeric,1,45)
) AS v(position,title,instructions,marks,question_count,minutes)
ON CONFLICT(id) DO NOTHING;
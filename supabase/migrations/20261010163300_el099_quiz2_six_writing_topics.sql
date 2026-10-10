-- Section 3 from EL099 Quiz2 Compilations PDF, page 32. Six essay choices
-- (three A/B sets), each approximately 150 words; writing grade /25.
-- Preserve the options and academic source without inventing new subjects.
WITH question AS (
 INSERT INTO public.intensive_questions
  (id,course_id,exam_category,skill,type,difficulty,prompt,grading_mode,marks,
   reference_source,reference_unit,reference_page,tags)
 SELECT md5('NUMO:EL099:Q2:WRITING:1')::uuid,id,
 'QUIZ 2','Writing','SHORT_ANSWER','MEDIUM',
 'Write an essay of at least 150 words on ONE of the following six topics:',
 'MANUAL',25,
 'EL099 Quiz2 Compilations PDF',
 'Section 3: Essay Writing','32',
 ARRAY['EL099-Q2-WRITING','WRITING','MIN_WORDS=150','RUBRIC=EL099-NUMO-v1','TOPIC1=Compare two cities you have visited, reflecting on their similarities and differences in geography, weather, food, language, and other relevant aspects.','TOPIC2=A memorable vacation experience that shows how taking time off can make you feel refreshed and see things differently.','TOPIC3=An invention that has changed your life.','TOPIC4=Compare between virtual and real learning.','TOPIC5=Think about a place you have traveled to. What small thing(s) left an impression on you from that place?','TOPIC6=Traveling alone to another country can be an exciting experience. Write an essay of not less than 150 words expressing your agreement or disagreement with this statement.']
 FROM public.intensive_courses WHERE code='EL099'
 ON CONFLICT(id) DO NOTHING RETURNING id
), link AS (
 INSERT INTO public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
 SELECT md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid,
 md5('NUMO:EL099:QUIZ2:SECTION:3')::uuid,id,25,1 FROM question
 ON CONFLICT DO NOTHING RETURNING id
)
SELECT (SELECT COUNT(*) FROM question) writing_questions_added,
(SELECT COUNT(*) FROM link) writing_links_added;
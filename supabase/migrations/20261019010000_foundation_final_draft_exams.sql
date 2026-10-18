-- NUMO ACADEMIC SIMULATOR — foundational intensive Final exam preparation.
-- Scope: EL097_EL099E, EL098, EL099 only. EL111 and EL112 deliberately untouched.
-- Drafts only: no questions, no student assignments, no grades, no publication.
-- The 90-minute and date fields below are required technical PLACEHOLDERS,
-- not approved exam settings; confirm source content, dates and timing before LIVE.
WITH target_courses AS (
 SELECT id AS course_id, code
 FROM public.intensive_courses
 WHERE code IN ('EL097_EL099E', 'EL098', 'EL099')
),
inserted_exam AS (
 INSERT INTO public.intensive_exams (
   id,course_id,title,category,description,instructions,
   starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
   passing_score,result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
 )
 SELECT
   md5('NUMO:FOUNDATION:'||code||':FINAL:DRAFT:2026')::uuid,
   course_id,
   code||' — FINAL | الاختبار النهائي',
   'FINAL',
   'المحاكي الأكاديمي للاختبار النهائي. مسودة تنظيمية فقط؛ تُضاف الأسئلة والإجابات المعتمدة من ملفات الفاينل قبل النشر.',
   'المحتوى قيد الإعداد. يُحدد وقت الاختبار ودرجته ومواعيده اعتمادًا على الملف النهائي قبل تفعيله للطلاب؛ البيانات الزمنية في هذه المسودة مؤقتة.',
   now(),now()+interval '365 days',
   90,0,0,NULL,'IMMEDIATE','DRAFT',true,false,false
 FROM target_courses c
 WHERE NOT EXISTS (
   SELECT 1 FROM public.intensive_exams e
   WHERE e.course_id=c.course_id AND e.category='FINAL'
 )
 ON CONFLICT (id) DO NOTHING
 RETURNING id,course_id
), templates AS (
 SELECT position,title
 FROM (VALUES
   (1,'Grammar and Vocabulary'),
   (2,'Reading (Passages)'),
   (3,'Writing')
 ) v(position,title)
)
INSERT INTO public.intensive_exam_sections (
 id,exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes
)
SELECT md5('NUMO:FOUNDATION:FINAL:SECTION:'||e.id::text||':'||t.position)::uuid,
 e.id,t.title,
 'قالب فارغ قيد إعداد ملف الفاينل. لا يُفعّل حتى إضافة أسئلته والتحقق من الإجابات وتحديد الوقت المعتمد.',
 t.position,0,0,false,30
FROM inserted_exam e CROSS JOIN templates t
ON CONFLICT (id) DO NOTHING;

-- Audit: created drafts only; exclude EL111/EL112 by design.
SELECT c.code,e.id,e.title,e.category,e.status,e.attempts_allowed,e.total_marks,
       count(s.id) AS sections,
       coalesce(sum(s.question_count),0) AS questions,
       bool_and(NOT s.is_enabled) AS sections_disabled
FROM public.intensive_exams e
JOIN public.intensive_courses c ON c.id=e.course_id
LEFT JOIN public.intensive_exam_sections s ON s.exam_id=e.id
WHERE c.code IN ('EL097_EL099E','EL098','EL099') AND e.category='FINAL'
GROUP BY c.code,e.id
ORDER BY c.code;
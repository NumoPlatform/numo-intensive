-- Restore ALL EL099 Quiz 2 source questions as requested.
-- Seven Grammar/Vocabulary items copied VERBATIM from PDF (including empty/duplicate
-- choices and incorrect source keys). Explain disagreements visibly; no fabricated keys.
-- Four Reading items reattached verbatim despite unsupported source evidence.
-- Do not modify any pre-existing attempts. Exam remains DRAFT until UI QA.
WITH source_rows AS (
 SELECT value AS row FROM jsonb_array_elements($el099_all$[{"n":9,"p":3,"q":"That pizza is twice .......... the one we had last weak.","options":[{"label":"a","text":"as larg as"},{"label":"b","text":"as larger as"},{"label":"c","text":"largest"},{"label":"d","text":"larger"}],"c":"a","note":"المفتاح الأصلي يختار as larg as، وفي النص خطأ إملائي؛ الصياغة الإنجليزية الصحيحة هي as large as. أُبقي الخيار كما في المصدر."},{"n":11,"p":4,"q":"He ....... travel to Europe next summer. He will stay in Italy.","options":[{"label":"a","text":"will"},{"label":"b","text":"not"},{"label":"c","text":"won't"},{"label":"d","text":"'ll"}],"c":"c","note":"المفتاح الأصلي يحدد won't لكن Italy تقع في Europe؛ يوجد تعارض بين الجملتين، ونقلنا السؤال كما ورد."},{"n":14,"p":4,"q":"She will go to the concert tomorrow. Will in the previous sentences expresses ...........","options":[{"label":"a","text":"predection"},{"label":"b","text":"advice"},{"label":"c","text":""},{"label":"d","text":""}],"c":"a","note":"الخياران c و d فارغان في المصدر نفسه، والخيار a مكتوب predection بدل prediction. لم نؤلف خيارات بديلة."},{"n":20,"p":5,"q":"She.......the project on time. She needs more time.","options":[{"label":"a","text":"will finish"},{"label":"b","text":"want finish"},{"label":"c","text":"won't finish"},{"label":"d","text":"will finish"}],"c":"c","note":"الخياران a و d متطابقان في المصدر كما هو؛ الإجابة المعلمة c هي won't finish."},{"n":84,"p":15,"q":"Russia is……….country in the world.","options":[{"label":"a","text":"bigger"},{"label":"b","text":"the biggest"},{"label":"c","text":"the biggest"},{"label":"d","text":"the bigger"}],"c":"c","note":"الخياران b و c يحتويان النص نفسه the biggest، لكن ملف الأسئلة يميز c فقط كمفتاح. يجب الانتباه إلى هذا التكرار في المصدر."},{"n":110,"p":19,"q":"James has been working in the same office ………… five years.","options":[{"label":"a","text":"in"},{"label":"b","text":"during"},{"label":"c","text":"until"},{"label":"d","text":"since"}],"c":"d","note":"المفتاح الأصلي يختار since، ولكن قاعدة المدة الزمنية five years تقتضي for five years؛ خيار for غير موجود في المصدر، لذلك هذا السؤال غير دقيق."},{"n":127,"p":22,"q":"Travel is important in our modern world and ………. many options available for it.","options":[{"label":"a","text":"there is"},{"label":"b","text":"there are"},{"label":"c","text":"they are"},{"label":"d","text":"there is"}],"c":"b","note":"الخياران a و d متطابقان (there is) في المصدر، والمفتاح b (there are) محفوظ دون تعديل."}]$el099_all$::jsonb)
), inserted AS (
 INSERT INTO public.intensive_questions
 (id,course_id,exam_category,skill,type,difficulty,prompt,grading_mode,marks,
 reference_source,reference_unit,reference_page,reference_evidence,tags,is_active)
 SELECT md5('NUMO:EL099:Q2:GRAM:'||(row->>'n'))::uuid,
 (SELECT id FROM public.intensive_courses WHERE code='EL099'),
 'QUIZ 2','Grammar','MULTIPLE_CHOICE','MEDIUM',row->>'q',
 'AUTO',1,'EL099 Quiz2 Compilations · Grammar and Vocabulary PDF',
 'Grammar and Vocabulary',row->>'p',
 'EL099_SOURCE_NOTE: '||(row->>'note'),
 ARRAY['EL099-Q2-GV','SOURCE_Q='||(row->>'n'),
 'SOURCE_PDF_PAGE='||(row->>'p'),'SOURCE_KEY_UNREVIEWED'],true
 FROM source_rows
 ON CONFLICT(id) DO NOTHING RETURNING id
), options_added AS(
 INSERT INTO public.intensive_question_options
 (id,question_id,label,value,is_correct,position)
 SELECT md5('NUMO:EL099:Q2:GRAM:'||(r.row->>'n')||':OPTION:'||(o.value->>'label'))::uuid,
 q.id,o.value->>'label',o.value->>'text',
 (o.value->>'label')=(r.row->>'c'),ascii(o.value->>'label')-96
 FROM source_rows r JOIN inserted q ON q.id=md5('NUMO:EL099:Q2:GRAM:'||(r.row->>'n'))::uuid
 CROSS JOIN LATERAL jsonb_array_elements(r.row->'options') AS o(value)
 ON CONFLICT(id) DO NOTHING RETURNING id
), grammar_links AS(
 INSERT INTO public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
 SELECT md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid,
 md5('NUMO:EL099:QUIZ2:SECTION:1')::uuid,q.id,1,(r.row->>'n')::int
 FROM source_rows r JOIN inserted q ON q.id=md5('NUMO:EL099:Q2:GRAM:'||(r.row->>'n'))::uuid
 ON CONFLICT DO NOTHING RETURNING id
), reading_restored AS(
 UPDATE public.intensive_questions q SET
 is_active=true, updated_at=now(),
 reference_evidence='EL099_SOURCE_NOTE: السؤال وارد في ملف EL099 Quiz2 Passages ولكن القطعة النصية لا تتضمن دليلًا كافيًا للإجابة المحددة في المفتاح. عُرض السؤال والمفتاح كما في الملف، دون اختراع معلومات.'
 WHERE q.id IN(SELECT md5('NUMO:EL099:Q2:READING:'||n)::uuid FROM (VALUES(11),(12),(14),(29)) AS v(n))
 RETURNING id
), reading_links AS(
 INSERT INTO public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
 SELECT md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid,
 md5('NUMO:EL099:QUIZ2:SECTION:2')::uuid,
 id,1,
 CASE id
 WHEN md5('NUMO:EL099:Q2:READING:11')::uuid THEN 11
 WHEN md5('NUMO:EL099:Q2:READING:12')::uuid THEN 12
 WHEN md5('NUMO:EL099:Q2:READING:14')::uuid THEN 14
 WHEN md5('NUMO:EL099:Q2:READING:29')::uuid THEN 29 END
 FROM reading_restored ON CONFLICT DO NOTHING RETURNING id
), section_grammar AS(
 UPDATE public.intensive_exam_sections SET question_count=166,marks=166,
 instructions='All 166 original Grammar and Vocabulary questions; source key and wording are preserved, including source inconsistencies.',updated_at=now()
 WHERE id=md5('NUMO:EL099:QUIZ2:SECTION:1')::uuid
 RETURNING id
), section_reading AS(
 UPDATE public.intensive_exam_sections SET question_count=44,marks=44,
 instructions='All 7 complete passages and all 44 Reading questions from the PDF, with original source answer keys.',updated_at=now()
 WHERE id=md5('NUMO:EL099:QUIZ2:SECTION:2')::uuid
 RETURNING id
), exam_updated AS(
 UPDATE public.intensive_exams SET total_marks=235,updated_at=now()
 WHERE id=md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid
 RETURNING id
)
SELECT (SELECT count(*) FROM inserted) AS restored_grammar,
(SELECT count(*) FROM options_added) AS restored_grammar_choices,
(SELECT count(*) FROM grammar_links) AS grammar_links,
(SELECT count(*) FROM reading_restored) AS restored_reading,
(SELECT count(*) FROM reading_links) AS reading_links,
(SELECT count(*) FROM exam_updated) AS revised_exam;
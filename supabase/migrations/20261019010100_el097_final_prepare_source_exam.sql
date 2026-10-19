-- Existing EL097_EL099E FINAL draft: prepare original section structure.
-- Source: EL097 Final Answers FIXED (NUMO, 2026-10-18).
-- The original 3 questions without a defensible key remain review-only in
-- the question bank; exam must stay DRAFT until source-key review is complete.
UPDATE public.intensive_exams
SET title='EL097_EL099E — FINAL | تجميعات الاختبار النهائي',
    description='Final academic simulator sourced from NUMO answered EL097 / EL099E question bank: 90 Grammar, 85 Vocabulary, 7 Reading passages / 51 questions, and 8 Writing topics. Three original questions lack unique supported answers and require academic approval before publication.',
    instructions='ثلاثة أقسام مستقلة: Grammar and Vocabulary، ثم Reading (Passages)، ثم Writing. تظهر الإجابات الموضوعية حسب مفاتيح البنك المراجع، وتوجد ملاحظات للأسئلة الملتبسة. المحاولات مفتوحة.',
    duration_minutes=225, attempts_allowed=0,
    total_marks=248, result_release='IMMEDIATE',
    allow_answer_review=true,shuffle_questions=false,shuffle_answers=false,
    status='DRAFT',updated_at=now()
WHERE id='cf9c621b-1611-fcb7-3f63-58542eb59774'::uuid
  AND status='DRAFT';
UPDATE public.intensive_exam_sections
SET title='Grammar and Vocabulary',position=1,marks=173,question_count=173,
    time_limit_minutes=120,
    instructions='90 Grammar + 85 Vocabulary questions in the NUMO final bank; 173 uniquely keyed questions are scored. Original questions 018 and 048 are held separately for academic key verification.',
    updated_at=now()
WHERE id='1c1b2f62-58a6-3441-24c3-1757c802f415'::uuid;
UPDATE public.intensive_exam_sections
SET title='Reading (Passages)',position=2,marks=50,question_count=50,
    time_limit_minutes=60,
    instructions='Seven full passages and 51 source questions. Fifty questions have an approved key; original question 2.6 has no evidence-based correct option and remains under review.',
    updated_at=now()
WHERE id='a8da6beb-988f-a789-8905-0490f8d2dc0e'::uuid;
UPDATE public.intensive_exam_sections
SET title='Writing',position=3,marks=25,question_count=1,
    time_limit_minutes=45,
    instructions='Choose one of 8 original final exam topics and write at least 100 English words for NUMO intelligent evaluation.',
    updated_at=now()
WHERE id='b2077336-3f6c-9356-a960-7ced15fa036a'::uuid;
-- Instructor-authored academic explanation for EL097 Quiz 2, Grammar Foundations Q2.
-- Do not alter original wording/options, frozen answer keys or existing attempts.
WITH target AS (
  SELECT q.id FROM public.intensive_questions q
  JOIN public.intensive_courses c ON c.id=q.course_id
  WHERE c.code='EL097_EL099E'
    AND q.prompt='These are _______ flowers.'
    AND q.type='MULTIPLE_CHOICE'
    AND EXISTS (
      SELECT 1 FROM public.intensive_question_options o
      WHERE o.question_id=q.id AND o.value='my sister''s' AND o.is_correct
    )
), changed AS (
  UPDATE public.intensive_questions q
  SET explanation='قاعدة الملكية (Possessive Nouns): إذا كان الشيء يخص شخصًا واحدًا نضيف apostrophe + s إلى الاسم المفرد: sister → sister''s. لذلك: These are my sister''s flowers = هذه زهور أختي. أما my sister فتعني أختي فقط ولا تدل على ملكية flowers. الخيار my sisters يعني أخواتي جمعًا دون علامة ملكية؛ ولو كانت الزهور للأخوات لكتبنا my sisters'' flowers. وكلمة mine ضمير ملكية مستقل ولا يصح أن تأتي قبل sister.',
      reference_evidence='شرح نحوي تعليمي مُعَدّ من قاعدة Possessive Nouns؛ مفتاح الإجابة الأصلي وخيارات السؤال مأخوذان من الكويز الثاني محدث.pdf، صفحة 3، وليس هذا الشرح اقتباسًا من الملف.'
  FROM target
  WHERE q.id=target.id
  RETURNING q.id
)
SELECT COUNT(*) AS updated_questions FROM changed;
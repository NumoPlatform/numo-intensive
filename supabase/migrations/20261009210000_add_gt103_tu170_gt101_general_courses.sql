-- Two new general-study courses; TU170 and GT101 are one cross-campus alias.
-- No fabricated tests, dates, grades, enrollments or student accounts.
INSERT INTO public.intensive_courses
  (code,title,description,default_cover_url,is_active)
VALUES
  ('GT103','Artificial Intelligence',
   'مقرر من المواد العامة — الذكاء الاصطناعي (Artificial Intelligence) · Level 1.',
   'https://d2ol7oe51mr4n9.cloudfront.net/user_387CgECRaZUrXUVQQOH52f4rZ37/75fb988f-ddd0-4adc-b019-7ac683ffd04a.png',true),
  ('TU170_GT101','Computing Essentials',
   'مقرر من المواد العامة — أساسيات الحوسبة والمهارات الرقمية. يُعرف برمز TU170 في بعض فروع الجامعة العربية المفتوحة وبرمز GT101 في فروع أخرى؛ مقرر واحد وليس نسختين.',
   'https://d2ol7oe51mr4n9.cloudfront.net/user_387CgECRaZUrXUVQQOH52f4rZ37/14ffbef1-9b5c-4af3-b8dc-2c091d2fce6e.png',true)
ON CONFLICT (code) DO NOTHING;
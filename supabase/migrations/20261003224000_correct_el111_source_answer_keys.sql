update public.intensive_question_options o
set is_correct = (o.label = 'Is going to arrive')
from public.intensive_questions q
where q.id = o.question_id
  and q.course_id = (select id from public.intensive_courses where code='EL111' limit 1)
  and q.prompt = 'Our plane……. at 8:00 p.m.'
  and q.tags @> array['MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[];

update public.intensive_question_options o
set is_correct = (o.label = 'fitness and weight')
from public.intensive_questions q
where q.id = o.question_id
  and q.course_id = (select id from public.intensive_courses where code='EL111' limit 1)
  and q.prompt = 'What does the word ''they'' mean in paragraph 2'
  and q.tags @> array['MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[];

update public.intensive_question_options o
set is_correct = (o.label = 'Sports require a lot of time and energy.')
from public.intensive_questions q
where q.id = o.question_id
  and q.course_id = (select id from public.intensive_courses where code='EL111' limit 1)
  and q.prompt = 'What is the main idea of this article?'
  and q.tags @> array['MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[];

update public.intensive_question_options o
set is_correct = (o.label = 'True')
from public.intensive_questions q
join public.intensive_courses c on c.id=q.course_id
where q.id=o.question_id
  and c.code='EL111'
  and q.prompt='By screening the blind spots, one can avoid accidents with a vehicle in the same lane.'
  and q.tags @> array['MIDTERM_MODEL_7','SOURCE_PDF_20261003']::text[];

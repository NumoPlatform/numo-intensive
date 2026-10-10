-- Quiz 2 is visible to every enrolled EL099 student; do not create
-- enrollments or modify any existing student's access, scores, or attempts.
INSERT INTO public.intensive_exam_assignments(exam_id,student_id,group_id,all_course_students)
SELECT e.id,NULL,NULL,true
FROM public.intensive_exams e
JOIN public.intensive_courses c ON c.id=e.course_id
WHERE c.code='EL099'
  AND e.id=md5('NUMO:EL099:QUIZ2:THREE_SECTIONS')::uuid
  AND NOT EXISTS(
    SELECT 1 FROM public.intensive_exam_assignments a
    WHERE a.exam_id=e.id AND a.all_course_students=true
  )
RETURNING id,exam_id,all_course_students;
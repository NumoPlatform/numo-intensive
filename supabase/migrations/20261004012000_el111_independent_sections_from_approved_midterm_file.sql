-- Restructure the approved EL111 midterm material into three independent student assessments.
-- Source document: 4_5911437663017116162_261003_232949.pdf
-- Student-facing sections: Grammar, Vocabulary, Reading.
-- Each section is 30 minutes, allows 4 attempts, releases the score immediately,
-- and permits post-submission answer review.

do $$
declare
  v_course uuid;
  v_grammar_exam uuid;
  v_vocabulary_exam uuid;
  v_reading_exam uuid;
  v_grammar_section uuid;
  v_vocabulary_section uuid;
  v_reading_section uuid;
  v_source_exam uuid;
begin
  select id into v_course
  from public.intensive_courses
  where code = 'EL111'
  limit 1;

  if v_course is null then
    raise exception 'EL111_COURSE_NOT_FOUND';
  end if;

  update public.intensive_questions
  set skill = 'Reading',
      updated_at = now()
  where course_id = v_course
    and passage_id is not null
    and skill <> 'Reading';

  select id into v_grammar_exam
  from public.intensive_exams
  where course_id = v_course and title = 'EL111 Midterm — Grammar'
  limit 1;

  if v_grammar_exam is null then
    insert into public.intensive_exams(
      course_id,title,category,description,instructions,
      starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
      passing_score,result_release,status,allow_answer_review,
      shuffle_questions,shuffle_answers
    )
    values(
      v_course,'EL111 Midterm — Grammar','MIDTERM',
      'Grammar section from the approved EL111 midterm file.',
      'أجب عن جميع أسئلة Grammar. لديك 30 دقيقة و4 محاولات مستقلة لهذا القسم.',
      now() - interval '1 minute', timestamptz '2099-12-31 20:59:59+00',
      30,4,0,null,'IMMEDIATE','LIVE',true,false,false
    )
    returning id into v_grammar_exam;
  else
    update public.intensive_exams
    set category='MIDTERM',
        description='Grammar section from the approved EL111 midterm file.',
        instructions='أجب عن جميع أسئلة Grammar. لديك 30 دقيقة و4 محاولات مستقلة لهذا القسم.',
        duration_minutes=30,
        attempts_allowed=4,
        result_release='IMMEDIATE',
        status='LIVE',
        allow_answer_review=true,
        shuffle_questions=false,
        shuffle_answers=false,
        ends_at=timestamptz '2099-12-31 20:59:59+00',
        updated_at=now()
    where id=v_grammar_exam;
  end if;

  select id into v_vocabulary_exam
  from public.intensive_exams
  where course_id = v_course and title = 'EL111 Midterm — Vocabulary'
  limit 1;

  if v_vocabulary_exam is null then
    insert into public.intensive_exams(
      course_id,title,category,description,instructions,
      starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
      passing_score,result_release,status,allow_answer_review,
      shuffle_questions,shuffle_answers
    )
    values(
      v_course,'EL111 Midterm — Vocabulary','MIDTERM',
      'Vocabulary section from the approved EL111 midterm file.',
      'أجب عن جميع أسئلة Vocabulary. لديك 30 دقيقة و4 محاولات مستقلة لهذا القسم.',
      now() - interval '1 minute', timestamptz '2099-12-31 20:59:59+00',
      30,4,0,null,'IMMEDIATE','LIVE',true,false,false
    )
    returning id into v_vocabulary_exam;
  else
    update public.intensive_exams
    set category='MIDTERM',
        description='Vocabulary section from the approved EL111 midterm file.',
        instructions='أجب عن جميع أسئلة Vocabulary. لديك 30 دقيقة و4 محاولات مستقلة لهذا القسم.',
        duration_minutes=30,
        attempts_allowed=4,
        result_release='IMMEDIATE',
        status='LIVE',
        allow_answer_review=true,
        shuffle_questions=false,
        shuffle_answers=false,
        ends_at=timestamptz '2099-12-31 20:59:59+00',
        updated_at=now()
    where id=v_vocabulary_exam;
  end if;

  select id into v_reading_exam
  from public.intensive_exams
  where course_id = v_course and title = 'EL111 Midterm — Reading'
  limit 1;

  if v_reading_exam is null then
    insert into public.intensive_exams(
      course_id,title,category,description,instructions,
      starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
      passing_score,result_release,status,allow_answer_review,
      shuffle_questions,shuffle_answers
    )
    values(
      v_course,'EL111 Midterm — Reading','MIDTERM',
      'Reading section containing all passages and questions from the approved EL111 midterm file.',
      'أجب عن جميع أسئلة Reading حسب القطع الواردة في الملف. لديك 30 دقيقة و4 محاولات مستقلة لهذا القسم.',
      now() - interval '1 minute', timestamptz '2099-12-31 20:59:59+00',
      30,4,0,null,'IMMEDIATE','LIVE',true,false,false
    )
    returning id into v_reading_exam;
  else
    update public.intensive_exams
    set category='MIDTERM',
        description='Reading section containing all passages and questions from the approved EL111 midterm file.',
        instructions='أجب عن جميع أسئلة Reading حسب القطع الواردة في الملف. لديك 30 دقيقة و4 محاولات مستقلة لهذا القسم.',
        duration_minutes=30,
        attempts_allowed=4,
        result_release='IMMEDIATE',
        status='LIVE',
        allow_answer_review=true,
        shuffle_questions=false,
        shuffle_answers=false,
        ends_at=timestamptz '2099-12-31 20:59:59+00',
        updated_at=now()
    where id=v_reading_exam;
  end if;

  select id into v_grammar_section
  from public.intensive_exam_sections
  where exam_id=v_grammar_exam and title='Grammar'
  limit 1;
  if v_grammar_section is null then
    insert into public.intensive_exam_sections(
      exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes
    )
    values(v_grammar_exam,'Grammar','Complete all Grammar questions.',1,0,0,true,30)
    returning id into v_grammar_section;
  end if;

  select id into v_vocabulary_section
  from public.intensive_exam_sections
  where exam_id=v_vocabulary_exam and title='Vocabulary'
  limit 1;
  if v_vocabulary_section is null then
    insert into public.intensive_exam_sections(
      exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes
    )
    values(v_vocabulary_exam,'Vocabulary','Complete all Vocabulary questions.',1,0,0,true,30)
    returning id into v_vocabulary_section;
  end if;

  select id into v_reading_section
  from public.intensive_exam_sections
  where exam_id=v_reading_exam and title='Reading'
  limit 1;
  if v_reading_section is null then
    insert into public.intensive_exam_sections(
      exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes
    )
    values(v_reading_exam,'Reading','Complete all Reading passages and questions.',1,0,0,true,30)
    returning id into v_reading_section;
  end if;

  update public.intensive_exam_sections
  set time_limit_minutes=30,is_enabled=true,position=1
  where id in (v_grammar_section,v_vocabulary_section,v_reading_section);

  delete from public.intensive_exam_questions
  where exam_id in (v_grammar_exam,v_vocabulary_exam,v_reading_exam);

  select e.id into v_source_exam
  from public.intensive_exams e
  where e.course_id=v_course and e.title='EL111 Midterm — Model 1'
  limit 1;

  if v_source_exam is null then
    raise exception 'EL111_MODEL1_SOURCE_NOT_FOUND';
  end if;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_grammar_exam,v_grammar_section,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_source_exam and s.title='Grammar'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_vocabulary_exam,v_vocabulary_section,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_source_exam and s.title='Vocabulary'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select
    v_reading_exam,
    v_reading_section,
    src.question_id,
    src.marks,
    row_number() over(order by src.model_no,src.position)::integer
  from (
    select
      eq.question_id,
      eq.marks,
      eq.position,
      substring(e.title from 'Model ([0-9]+)')::integer as model_no
    from public.intensive_exam_questions eq
    join public.intensive_exams e on e.id=eq.exam_id
    join public.intensive_exam_sections s on s.id=eq.section_id
    where e.course_id=v_course
      and e.title like 'EL111 Midterm — Model %'
      and s.title='Composition'
  ) src
  order by src.model_no,src.position;

  update public.intensive_exam_sections s
  set question_count=x.question_count,
      marks=x.marks,
      updated_at=now()
  from (
    select section_id,count(*)::integer question_count,coalesce(sum(marks),0) marks
    from public.intensive_exam_questions
    where exam_id in (v_grammar_exam,v_vocabulary_exam,v_reading_exam)
    group by section_id
  ) x
  where s.id=x.section_id;

  update public.intensive_exams e
  set total_marks=x.marks,
      updated_at=now()
  from (
    select exam_id,coalesce(sum(marks),0) marks
    from public.intensive_exam_questions
    where exam_id in (v_grammar_exam,v_vocabulary_exam,v_reading_exam)
    group by exam_id
  ) x
  where e.id=x.exam_id;

  insert into public.intensive_exam_assignments(
    exam_id,student_id,group_id,all_course_students,created_by
  )
  select x.exam_id,null,null,true,null
  from (values(v_grammar_exam),(v_vocabulary_exam),(v_reading_exam)) x(exam_id)
  where not exists (
    select 1 from public.intensive_exam_assignments a
    where a.exam_id=x.exam_id and a.all_course_students=true
  );

  update public.intensive_exams
  set status='ARCHIVED',updated_at=now()
  where course_id=v_course
    and title like 'EL111 Midterm — Model %';

  insert into public.intensive_audit_logs(
    admin_id,action,target_type,target_id,details
  )
  values(
    null,
    'RESTRUCTURE_EL111_TO_INDEPENDENT_SECTIONS',
    'COURSE',
    v_course,
    jsonb_build_object(
      'source','approved EL111 midterm PDF',
      'sections',jsonb_build_array('Grammar','Vocabulary','Reading'),
      'attempts_per_section',4,
      'minutes_per_section',30,
      'answer_review','wrong questions after submission'
    )
  );
end
$$;

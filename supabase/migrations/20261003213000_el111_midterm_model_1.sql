do $$
declare
  v_course uuid;
  v_exam uuid;
  v_grammar uuid;
  v_vocab uuid;
  v_composition uuid;
  v_passage uuid;
  v_q uuid;
begin
  select id into v_course
  from public.intensive_courses
  where code = 'EL111'
  limit 1;

  if v_course is null then
    raise exception 'EL111_COURSE_NOT_FOUND';
  end if;

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,
    starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
    result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
  ) values (
    v_course,
    'EL111 Midterm — Model 1',
    'MIDTERM',
    'NUMO model exam built from the supplied EL111 midterm collection.',
    'Complete each section before moving on. Each section has a separate 30-minute timer. You have up to 4 attempts. Your score is released immediately after submission.',
    now() - interval '1 day',
    timestamptz '2099-12-31 23:59:59+03',
    90,
    4,
    0,
    'IMMEDIATE',
    'LIVE',
    false,
    false,
    false
  )
  returning id into v_exam;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Grammar','Choose the correct answer.',1,0,0,true,30)
  returning id into v_grammar;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Vocabulary','Choose the correct answer.',2,0,0,true,30)
  returning id into v_vocab;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Composition','Read the passage and choose the correct answer.',3,0,0,true,30)
  returning id into v_composition;

  insert into public.intensive_passages(course_id,title,body)
  values(v_course, 'Can Physical exercise be a sport?', '1. Physical exercise and team sports are good for mind, body and spirit. Furthermore, team sports are good for learning accountability, dedication, and leadership, among many other traits. Putting it all together by playing a sport is a winning combination. Playing a sport or becoming an athlete requires a lot of time and energy.

2. Sports require memorization, repetition and learning skill sets that are directly relevant to class work. Also, the determination and goal-setting skills sports require can be transferred to the classroom. Fighting for a common goal with other players, coaches, managers and community members teaches you how to build collective team spirit and effectively communicate the best way to solve problems towards success. Clearly, sports will improve your fitness and weight. In addition, they also encourage healthy decisions such as not smoking or drinking alcohol and offer hidden health benefits such as (a lower chance of getting bone weakness or breast cancer later in life.)

3. Watching your hard work pay off and achieving your dreams brings about tons of self-confidence. If you can achieve something in a sport or with a fitness goal, then you know you can achieve any other goal you set. This is a very rewarding and exciting process. Exercising is a natural way to loosen up and let go of stress. Also, you will most likely make many new friends on the team who can be there for you as a support system. When you find you are having a lot of stress, you can call up teammates and head to the gym to discuss it and play it out.')
  returning id into v_passage;

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'The accident…………by pilot error.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Is causing.', 'Is causing.', false, 1),
    (v_q, 'Caused.', 'Caused.', false, 2),
    (v_q, 'Was caused.', 'Was caused.', true, 3),
    (v_q, 'Is caused.', 'Is caused.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 1);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'What question is grammatically correct?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'What did you ate?', 'What did you ate?', false, 1),
    (v_q, 'When does you eat?', 'When does you eat?', false, 2),
    (v_q, 'Where did you eat?', 'Where did you eat?', true, 3),
    (v_q, 'Why did you ate?', 'Why did you ate?', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 2);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Yesterday, the detectives a full investigation on how the murder occurred?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Have promised.', 'Have promised.', false, 1),
    (v_q, 'Are going to promise.', 'Are going to promise.', false, 2),
    (v_q, 'Promised.', 'Promised.', true, 3),
    (v_q, 'Will promise.', 'Will promise.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 3);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'As soon as the police arrived, the attacker the scene?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Will flee.', 'Will flee.', false, 1),
    (v_q, 'Was fleeing.', 'Was fleeing.', false, 2),
    (v_q, 'Fled.', 'Fled.', true, 3),
    (v_q, 'Flees.', 'Flees.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 4);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Bader is a banker, he has met a lot of clients while…………..',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Work.', 'Work.', false, 1),
    (v_q, 'Works.', 'Works.', false, 2),
    (v_q, 'Going to work.', 'Going to work.', false, 3),
    (v_q, 'Working.', 'Working.', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 5);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Does she play tennis?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Yes, she did', 'Yes, she did', false, 1),
    (v_q, 'No, she hasn’t', 'No, she hasn’t', false, 2),
    (v_q, 'No, she didn’t', 'No, she didn’t', false, 3),
    (v_q, 'Yes, she does', 'Yes, she does', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 6);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Is Yossef your brother? Choose the incorrect answer for this question?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Yes, he is.', 'Yes, he is.', false, 1),
    (v_q, 'Yes, he isn’t.', 'Yes, he isn’t.', true, 2),
    (v_q, 'No, Ali is.', 'No, Ali is.', false, 3),
    (v_q, 'No, he is.', 'No, he is.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 7);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'The bride in China, opposite to our traditions a black dress on her wedding.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Wore.', 'Wore.', false, 1),
    (v_q, 'Is going to wear.', 'Is going to wear.', false, 2),
    (v_q, 'Wears.', 'Wears.', true, 3),
    (v_q, 'Is wearing.', 'Is wearing.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 8);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Shhhh, the baby ………………he for ten hours every night.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Is sleeping/slept.', 'Is sleeping/slept.', false, 1),
    (v_q, 'Sleeps/has been sleeping.', 'Sleeps/has been sleeping.', false, 2),
    (v_q, 'Sleeps/is sleeping.', 'Sleeps/is sleeping.', false, 3),
    (v_q, 'Is sleeping / sleeps.', 'Is sleeping / sleeps.', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 9);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'I am tired. We for over an hour. Let’s stop and have a rest.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Had walked.', 'Had walked.', false, 1),
    (v_q, 'Walk.', 'Walk.', false, 2),
    (v_q, 'Have walked.', 'Have walked.', true, 3),
    (v_q, 'Were walking.', 'Were walking.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 10);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Choose the best question for the statement. “Ahmed played football yesterday”',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Why did Ahmed play football?', 'Why did Ahmed play football?', false, 1),
    (v_q, 'When did Ahmed play football?', 'When did Ahmed play football?', true, 2),
    (v_q, 'Who didn’t play football?', 'Who didn’t play football?', false, 3),
    (v_q, 'How did Ahmed play football?', 'How did Ahmed play football?', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 11);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'We the contract when I come back from my travel.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Are signing', 'Are signing', false, 1),
    (v_q, 'Have signed', 'Have signed', false, 2),
    (v_q, 'Will sign', 'Will sign', true, 3),
    (v_q, 'Sign', 'Sign', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 12);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Mr. Abdullah is one of our distinguished pilots. He With Qatar Airways for over 25 years.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Has been working', 'Has been working', true, 1),
    (v_q, 'Working', 'Working', false, 2),
    (v_q, 'Works', 'Works', false, 3),
    (v_q, 'Is working', 'Is working', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 13);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'In our next meeting, I……the basic elements of a short story, be prepared?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Am going to discuss.', 'Am going to discuss.', true, 1),
    (v_q, 'Will be discuss.', 'Will be discuss.', false, 2),
    (v_q, 'Would discuss.', 'Would discuss.', false, 3),
    (v_q, 'Will have discussed', 'Will have discussed', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 14);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'This book by a famous writer in 1990.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Wrote', 'Wrote', false, 1),
    (v_q, 'Writes', 'Writes', false, 2),
    (v_q, 'Was written', 'Was written', true, 3),
    (v_q, 'Is written', 'Is written', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 15);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'The noun form of the word ‘protect’ is:',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Protective', 'Protective', false, 1),
    (v_q, 'Protecting', 'Protecting', false, 2),
    (v_q, 'Protection', 'Protection', true, 3),
    (v_q, 'Protected', 'Protected', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 16);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Quite often, most stories happily.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Will end', 'Will end', false, 1),
    (v_q, 'Have ended', 'Have ended', false, 2),
    (v_q, 'Are ending', 'Are ending', false, 3),
    (v_q, 'End', 'End', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 17);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Is TV watched in Mondays? The mistake in this question is in:',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Spelling', 'Spelling', false, 1),
    (v_q, 'Preposition', 'Preposition', true, 2),
    (v_q, 'Question word', 'Question word', false, 3),
    (v_q, 'Tense', 'Tense', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 18);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'My birthday is the month of October.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'On', 'On', false, 1),
    (v_q, 'During', 'During', true, 2),
    (v_q, 'At', 'At', false, 3),
    (v_q, 'Till', 'Till', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 19);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Muslims around the world…… Eid Al-Fitr and Al-Adha every year',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Celebrates', 'Celebrates', false, 1),
    (v_q, 'Are going to celebrate', 'Are going to celebrate', false, 2),
    (v_q, 'Celebrate', 'Celebrate', true, 3),
    (v_q, 'Are celebrating', 'Are celebrating', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 20);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'It…….(that) the project will last four years',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Estimate', 'Estimate', false, 1),
    (v_q, 'Is estimated', 'Is estimated', true, 2),
    (v_q, 'Was estimated', 'Was estimated', false, 3),
    (v_q, 'Estimate', 'Estimate', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 21);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Our plane……. at 8:00 p.m.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Arrives', 'Arrives', false, 1),
    (v_q, 'Is arriving', 'Is arriving', false, 2),
    (v_q, 'Is going to arrive', 'Is going to arrive', true, 3),
    (v_q, 'Will arrive', 'Will arrive', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 22);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'The concert ended……..midnight',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'On', 'On', false, 1),
    (v_q, 'Within', 'Within', false, 2),
    (v_q, 'At', 'At', true, 3),
    (v_q, 'In', 'In', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 23);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Research…….that people infected with COVID-19 have experienced mild to moderate illness and can be cured.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Show', 'Show', false, 1),
    (v_q, 'Have shown', 'Have shown', false, 2),
    (v_q, 'Is showing', 'Is showing', false, 3),
    (v_q, 'Has shown', 'Has shown', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 24);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'The book’s powerful climax…….the murder of Fatima and her husband in a car accident',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Will be', 'Will be', false, 1),
    (v_q, 'Is', 'Is', true, 2),
    (v_q, 'Has', 'Has', false, 3),
    (v_q, 'Were', 'Were', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 25);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'Maged is……….Mazen?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Taller than', 'Taller than', true, 1),
    (v_q, 'Taller', 'Taller', false, 2),
    (v_q, 'More taller than', 'More taller than', false, 3),
    (v_q, 'Tall than', 'Tall than', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 26);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Grammar', 'MULTIPLE_CHOICE', 'MEDIUM', 'I heard the explosion last night while I…….TV.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Was watching', 'Was watching', true, 1),
    (v_q, 'Have been watching', 'Have been watching', false, 2),
    (v_q, 'Were watching', 'Were watching', false, 3),
    (v_q, 'Watched', 'Watched', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_grammar, v_q, 1, 27);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'Suddenly, the boy screamed ‘save me, I’m…………”',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Organizing', 'Organizing', false, 1),
    (v_q, 'Flying', 'Flying', false, 2),
    (v_q, 'Drowning', 'Drowning', true, 3),
    (v_q, 'Playing', 'Playing', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 1);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'I’ve come to the………that Ali is not the right person for the job.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Conclusion', 'Conclusion', true, 1),
    (v_q, 'Evidence', 'Evidence', false, 2),
    (v_q, 'Observation', 'Observation', false, 3),
    (v_q, 'Playing', 'Playing', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 2);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'The city’s……..ballooned to over 10 million in just a decade.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Population', 'Population', true, 1),
    (v_q, 'Migration', 'Migration', false, 2),
    (v_q, 'Innovation', 'Innovation', false, 3),
    (v_q, 'Exploration', 'Exploration', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 3);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'Normally, in any narrative the main……..dies at the end scene since he/she is our hero?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Narrative', 'Narrative', false, 1),
    (v_q, 'Observation', 'Observation', false, 2),
    (v_q, 'Scene', 'Scene', false, 3),
    (v_q, 'Character', 'Character', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 4);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'The most exciting part of a play, piece of music or a narrative is known as ……..',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Climax', 'Climax', true, 1),
    (v_q, 'Conclusion', 'Conclusion', false, 2),
    (v_q, 'Scene', 'Scene', false, 3),
    (v_q, 'Narrative', 'Narrative', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 5);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'During class discussion, the teacher was trying to……the difference between hypothesis and a theory.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Theorize', 'Theorize', false, 1),
    (v_q, 'Explain', 'Explain', true, 2),
    (v_q, 'Experiment', 'Experiment', false, 3),
    (v_q, 'Measure', 'Measure', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 6);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'The deal is…….to be worth around 1.5$ million',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Estimated', 'Estimated', true, 1),
    (v_q, 'Investigated', 'Investigated', false, 2),
    (v_q, 'Measured', 'Measured', false, 3),
    (v_q, 'Researched', 'Researched', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 7);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'Small fish are…….to predators',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Impressive', 'Impressive', false, 1),
    (v_q, 'Dangerous', 'Dangerous', false, 2),
    (v_q, 'Innovative', 'Innovative', false, 3),
    (v_q, 'Vulnerable', 'Vulnerable', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 8);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'A…….is a flat case used for carrying papers and documents',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Briefcase', 'Briefcase', true, 1),
    (v_q, 'Backpack', 'Backpack', false, 2),
    (v_q, 'Wallet', 'Wallet', false, 3),
    (v_q, 'Luggage', 'Luggage', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 9);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'The area in a plane, boat or racing car where the pilot or driver sits is known as the……',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Cabin', 'Cabin', false, 1),
    (v_q, 'Hijack', 'Hijack', false, 2),
    (v_q, 'Engine', 'Engine', false, 3),
    (v_q, 'Cockpit', 'Cockpit', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 10);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', '‘Leaving a newborn baby unattended is very DANGEROUS’, the antonym of the capitalized word is:',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Hazardous', 'Hazardous', false, 1),
    (v_q, 'Savage', 'Savage', false, 2),
    (v_q, 'Risky', 'Risky', false, 3),
    (v_q, 'Safe', 'Safe', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 11);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'Which word describes the movement of a large group of people to a new location?',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Plains of Tanzania', 'Plains of Tanzania', false, 1),
    (v_q, 'Sets off', 'Sets off', false, 2),
    (v_q, 'Head west', 'Head west', false, 3),
    (v_q, 'Migrate', 'Migrate', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 12);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'Most information was collected by direct………of the animals behavior.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Research', 'Research', false, 1),
    (v_q, 'Investigation', 'Investigation', false, 2),
    (v_q, 'Observation', 'Observation', true, 3),
    (v_q, 'Measurement', 'Measurement', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 13);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'Sara is a great writer. In her latest book, she has woven a strong personal……filled with lively anecdotes.',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Scene', 'Scene', false, 1),
    (v_q, 'Conclusion', 'Conclusion', false, 2),
    (v_q, 'Climax', 'Climax', false, 3),
    (v_q, 'Narrative', 'Narrative', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 14);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'The……of the Titanic shipwreck is still the most climatic moment in the movie',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Character', 'Character', false, 1),
    (v_q, 'Scene', 'Scene', true, 2),
    (v_q, 'Conclusion', 'Conclusion', false, 3),
    (v_q, 'Narrative', 'Narrative', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 15);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'According to the…….of Relativity, nothing can travel fatser than light',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Research', 'Research', false, 1),
    (v_q, 'Instrument', 'Instrument', false, 2),
    (v_q, 'Experiment', 'Experiment', false, 3),
    (v_q, 'Theory', 'Theory', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 16);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'He got into the business of REPRODUCING cattle. The synonym of the capitalized word is:',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Overcoming', 'Overcoming', false, 1),
    (v_q, 'Breeding', 'Breeding', true, 2),
    (v_q, 'Surviving', 'Surviving', false, 3),
    (v_q, 'Demolishing', 'Demolishing', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 17);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'A……..is a person who unlawfully occupies an uninhabited building',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Squatter', 'Squatter', true, 1),
    (v_q, 'Builder', 'Builder', false, 2),
    (v_q, 'Parent', 'Parent', false, 3),
    (v_q, 'Architect', 'Architect', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 18);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Vocabulary', 'MULTIPLE_CHOICE', 'MEDIUM', 'Researchers have found clear scientific……of a link between exposure to sun and skin cancer',
    null, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Evidence', 'Evidence', true, 1),
    (v_q, 'Investigation', 'Investigation', false, 2),
    (v_q, 'Experiment', 'Experiment', false, 3),
    (v_q, 'Experience', 'Experience', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_vocab, v_q, 1, 19);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'Team sports helps develop players.',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'accountability, dedication and dreams', 'accountability, dedication and dreams', false, 1),
    (v_q, 'leadership, dedication, dreams', 'leadership, dedication, dreams', false, 2),
    (v_q, 'accountability, dedication leadership', 'accountability, dedication leadership', true, 3),
    (v_q, 'new friends, dreams, leadership', 'new friends, dreams, leadership', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 1);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'Student-athletes can benefit from sports activities while in classroom because:',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'memorization and repetition skill sets from sports can be applicable in classrooms.', 'memorization and repetition skill sets from sports can be applicable in classrooms.', false, 1),
    (v_q, 'determination and goal-setting skills of sportsmen are relevant to class work.', 'determination and goal-setting skills of sportsmen are relevant to class work.', false, 2),
    (v_q, 'memorization, repetition, determination and goal-setting skills can be applicable in classrooms.', 'memorization, repetition, determination and goal-setting skills can be applicable in classrooms.', true, 3),
    (v_q, 'It can help them be fit and lose weight.', 'It can help them be fit and lose weight.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 2);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'Which is true according to paragraph 2?',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Sports teach managers about common goals.', 'Sports teach managers about common goals.', false, 1),
    (v_q, 'Sports teach teamwork and help achieve goals.', 'Sports teach teamwork and help achieve goals.', true, 2),
    (v_q, 'Sports help build communication skills.', 'Sports help build communication skills.', false, 3),
    (v_q, 'Sports help in getting bone cancer', 'Sports help in getting bone cancer', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 3);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'What does the word ''they'' mean in paragraph 2',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'sports', 'sports', false, 1),
    (v_q, 'decisions', 'decisions', false, 2),
    (v_q, 'sportsmen', 'sportsmen', false, 3),
    (v_q, 'fitness and weight', 'fitness and weight', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 4);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'What is the meaning of the words in brackets? (a lower chance of getting bone weakness or breast cancer) in paragraph 2?',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Sports can support bone weakness and breast cancer.', 'Sports can support bone weakness and breast cancer.', false, 1),
    (v_q, 'Sports can cause bone weakness and breast cancer.', 'Sports can cause bone weakness and breast cancer.', false, 2),
    (v_q, 'Sports can prevent bone weakness and breast cancer.', 'Sports can prevent bone weakness and breast cancer.', true, 3),
    (v_q, 'Sports can build bone weakness and breast cancer.', 'Sports can build bone weakness and breast cancer.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 5);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'What part of speech is the word rewarding in paragraph 3?',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'noun', 'noun', false, 1),
    (v_q, 'verb', 'verb', false, 2),
    (v_q, 'adjective', 'adjective', true, 3);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 6);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'What is the opposite of the word ''natural'' in paragraph 3?',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'artificial', 'artificial', true, 1),
    (v_q, 'fresh', 'fresh', false, 2),
    (v_q, 'frozen', 'frozen', false, 3),
    (v_q, 'helpful', 'helpful', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 7);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'What is the main idea of this article?',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'People get paid when they do sports.', 'People get paid when they do sports.', false, 1),
    (v_q, 'Sports require a lot of time and energy.', 'Sports require a lot of time and energy.', true, 2),
    (v_q, 'It is always a great decision to get involved in sports.', 'It is always a great decision to get involved in sports.', false, 3),
    (v_q, 'Sports are of many types.', 'Sports are of many types.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 8);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'As a sports person, to get released from stress you should.',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'go to the gym.', 'go to the gym.', false, 1),
    (v_q, 'discuss it with friends.', 'discuss it with friends.', false, 2),
    (v_q, 'discuss it and play it out.', 'discuss it and play it out.', true, 3),
    (v_q, 'sit quietly', 'sit quietly', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 9);

  insert into public.intensive_questions(
    course_id, exam_category, skill, type, difficulty, prompt, passage_id,
    grading_mode, marks, tags, is_active
  ) values (
    v_course, 'MIDTERM', 'Composition', 'MULTIPLE_CHOICE', 'MEDIUM', 'What does the word ''it'' in paragraph 3 mean?',
    v_passage, 'AUTO', 1,
    array['EL111','MIDTERM_MODEL_1','SOURCE_PDF_20261003']::text[], true
  )
  returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'play', 'play', false, 1),
    (v_q, 'teammates', 'teammates', false, 2),
    (v_q, 'stress', 'stress', true, 3);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam, v_composition, v_q, 1, 10);

  update public.intensive_exam_sections s
  set
    marks = x.total_marks,
    question_count = x.question_count,
    updated_at = now()
  from (
    select
      section_id,
      coalesce(sum(marks),0) as total_marks,
      count(*)::integer as question_count
    from public.intensive_exam_questions
    where exam_id = v_exam
    group by section_id
  ) x
  where s.id = x.section_id;

  update public.intensive_exams
  set
    total_marks = (
      select coalesce(sum(marks),0)
      from public.intensive_exam_questions
      where exam_id = v_exam
    ),
    updated_at = now()
  where id = v_exam;

  insert into public.intensive_exam_assignments(
    exam_id,all_course_students
  )
  values(v_exam,true);

  insert into public.intensive_audit_logs(
    action,target_type,target_id,details
  )
  values(
    'SEED_MODEL_EXAM',
    'EXAM',
    v_exam::text,
    jsonb_build_object(
      'course','EL111',
      'title','EL111 Midterm — Model 1',
      'sections',3,
      'minutes_per_section',30,
      'attempts_allowed',4,
      'result_release','IMMEDIATE',
      'questions',56
    )
  );
end
$$;

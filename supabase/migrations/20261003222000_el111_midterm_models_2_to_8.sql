do $$
declare
  v_course uuid;
  v_model1 uuid;
  v_exam uuid;
  v_grammar uuid;
  v_vocab uuid;
  v_composition uuid;
  v_passage uuid;
  v_passage2 uuid;
  v_q uuid;
begin
  select id into v_course from public.intensive_courses where code='EL111' limit 1;
  select id into v_model1 from public.intensive_exams where title='EL111 Midterm — Model 1' limit 1;

  if v_course is null then raise exception 'EL111_COURSE_NOT_FOUND'; end if;
  if v_model1 is null then raise exception 'EL111_MODEL_1_NOT_FOUND'; end if;

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,
    starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
    result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
  ) values(
    v_course,
    'EL111 Midterm — Model 2',
    'MIDTERM',
    'NUMO EL111 practice model based on the supplied midterm collection. Composition passage: Flying Backwards and Forwards.',
    'Complete each section before moving on. Each section has a separate 30-minute timer. You have up to 4 attempts. Your score is released immediately after submission.',
    now() - interval '1 day',
    timestamptz '2099-12-31 23:59:59+03',
    90,4,0,'IMMEDIATE','LIVE',false,false,false
  ) returning id into v_exam;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Grammar','Choose the correct answer.',1,0,0,true,30) returning id into v_grammar;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Vocabulary','Choose the correct answer.',2,0,0,true,30) returning id into v_vocab;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Composition','Read the passage and choose the correct answer.',3,0,0,true,30) returning id into v_composition;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_grammar,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Grammar'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_vocab,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Vocabulary'
  order by eq.position;

  insert into public.intensive_passages(course_id,title,body)
  values(v_course,'Flying Backwards and Forwards','1. Air travel is such an everyday experience these days that we are not surprised when we read about a politician having talks with the Japanese Prime Minister one day, attending a conference in Australia the following morning and having to be off at midday to sign a trade agreement in Bangkok. But frequent long-distance flying can be so tiring that the traveler begins to feel his brain is in one country, his digestion in another and his power of concentration nowhere; in short, he hardly knows where (he) is.

2. The fatigue (tiredness) we normally experience after a long journey is noticeable when we fly from east to west or vice versa because we cross time-zones. Air travel is so quick nowadays that we can leave London after breakfast and be in New York in eight hours, yet what really disturbs us most is that when we arrive it is only lunch time, but we have already had lunch on the plane and are expecting dinner.

3. Doctors say that since air travelers are in no condition to work after crossing a number of time zones, they should go straight to bed on arrival. Airline pilots, in fact, whose experience is so obviously relevant that it ought to serve as a guide, often live by their own watches, ignoring local time, and have breakfast at midnight if necessary. They have far less reasons to worry about (their) health than executives because they are used to flying and are physically fit.

4. Businessmen who go on long-distance flights, however, are usually out for promotion. They are flattered to have been chosen because it adds to their status and prestige in the firm. They are lucky if the company insists on them taking the doctor’s advice and resting for a day before working. Sometimes the managing director is such an energetic character that he expects everyone to be as fit as he is. As he has never felt any ill effects after flying himself, the schedule he lays down is so exacting that the employee is too exhausted to carry it out satisfactorily. He must either go straight to an important meeting as soon as his plane touches down or else return as soon as the meeting is over to report to his boss. Dynamic wealthy businessmen of this type often do not realize how disastrous this policy may be for the man’s health and the company’s reputation.') returning id into v_passage;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','After long distance flights, pilots:',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'always go straight to bed', 'always go straight to bed', false, 1),
    (v_q, 'find it wisest to take no notice of local time', 'find it wisest to take no notice of local time', true, 2),
    (v_q, 'have breakfast', 'have breakfast', false, 3),
    (v_q, 'expect to have dinner', 'expect to have dinner', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,1);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Businessmen often take no notice of doctors'' advice because they are:',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'physically fit', 'physically fit', false, 1),
    (v_q, 'keen to impress people', 'keen to impress people', true, 2),
    (v_q, 'exhausted', 'exhausted', false, 3),
    (v_q, 'experienced', 'experienced', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,2);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','If a managing director is energetic, he frequently:',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'allows his employees to lie down', 'allows his employees to lie down', false, 1),
    (v_q, 'makes his employees attend classes to keep fit', 'makes his employees attend classes to keep fit', false, 2),
    (v_q, 'expects them to be ill', 'expects them to be ill', false, 3),
    (v_q, 'lays schedules that are exhausting to follow', 'lays schedules that are exhausting to follow', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,3);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','In the first paragraph, the pronoun (he) refers to...',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'A politician', 'A politician', false, 1),
    (v_q, 'The Japanese Prime Minister', 'The Japanese Prime Minister', false, 2),
    (v_q, 'A traveler', 'A traveler', true, 3),
    (v_q, 'Long distance flying', 'Long distance flying', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,4);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','In the third paragraph, the pronoun (their) refers to...',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Doctors', 'Doctors', false, 1),
    (v_q, 'Airline pilots', 'Airline pilots', true, 2),
    (v_q, 'Travelers', 'Travelers', false, 3),
    (v_q, 'Businessmen', 'Businessmen', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,5);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','We experience fatigue on flights only when we cross time zones.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,6);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Not only are airline pilots used to flying, but also they are physically fit.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,7);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','We experience fatigue on a long flight only when we fly towards the west end.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,8);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Doctors advise airline travelers not to worry about their health.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,9);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The policy of setting exacting schedules for employees who go on long distance flights is always profitable for a company.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_2','SOURCE_PDF_20261003','Flying Backwards and Forwards']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,10);

  update public.intensive_exam_sections s
  set marks=x.total_marks,question_count=x.question_count,updated_at=now()
  from (
    select section_id,coalesce(sum(marks),0) total_marks,count(*)::integer question_count
    from public.intensive_exam_questions
    where exam_id=v_exam
    group by section_id
  ) x
  where s.id=x.section_id;

  update public.intensive_exams
  set total_marks=(select coalesce(sum(marks),0) from public.intensive_exam_questions where exam_id=v_exam),
      updated_at=now()
  where id=v_exam;

  insert into public.intensive_exam_assignments(exam_id,all_course_students)
  values(v_exam,true);

  insert into public.intensive_audit_logs(action,target_type,target_id,details)
  values(
    'SEED_MODEL_EXAM','EXAM',v_exam::text,
    jsonb_build_object(
      'course','EL111',
      'model',2,
      'minutes_per_section',30,
      'attempts_allowed',4,
      'result_release','IMMEDIATE',
      'composition_source','Flying Backwards and Forwards'
    )
  );

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,
    starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
    result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
  ) values(
    v_course,
    'EL111 Midterm — Model 3',
    'MIDTERM',
    'NUMO EL111 practice model based on the supplied midterm collection. Composition passage: The Killer Whale.',
    'Complete each section before moving on. Each section has a separate 30-minute timer. You have up to 4 attempts. Your score is released immediately after submission.',
    now() - interval '1 day',
    timestamptz '2099-12-31 23:59:59+03',
    90,4,0,'IMMEDIATE','LIVE',false,false,false
  ) returning id into v_exam;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Grammar','Choose the correct answer.',1,0,0,true,30) returning id into v_grammar;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Vocabulary','Choose the correct answer.',2,0,0,true,30) returning id into v_vocab;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Composition','Read the passage and choose the correct answer.',3,0,0,true,30) returning id into v_composition;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_grammar,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Grammar'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_vocab,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Vocabulary'
  order by eq.position;

  insert into public.intensive_passages(course_id,title,body)
  values(v_course,'The Killer Whale','1. The sounds made by a killer whale in one part of the ocean may be very different from the sounds of a killer whale from another area in the sea. Much as people from the southern United States sound different from those from the North.

2. David Bain studies the underwater utterings of two killer whales at Marine World, in Vallejo, California. Despite their different dialects, he says, the mammals learned to communicate with one another by eventually learning to make each other''s sounds. Inflection also colors meaning, just as it does with people.

3. Researcher Bain says, "There''s a lot of information in the tone of voice, how they say it; you can get a sense of whether they''re being sarcastic or not. Yes, they do have a tone of voice." Researchers hesitate to call the sounds language, but the sounds clearly do help whales communicate with other whales and other mammals may even be picking up on it.

4. The ability of whales and dolphins to imitate sounds helps develop something of a cross-species language. When the dolphin Bayou was separated from the whale Orca, Bayou began uttering Orca like sounds, presumably to get the whale''s attention. Researchers say dolphins are such good imitators; one even learned to squawk like a bird.

5. Brenda McCowan tries to correlate dolphin behavior with their whistle like sounds. By recording and analyzing the sound patterns, she''s also come up with what looks like an extensive vocabulary. She says, "We found, using a statistical technique, that dolphins produced about 102 whistle types." Although she is still not sure what any of (it) means, "We just don''t know yet. We''re slowly trying to pull apart the pieces, use of imitation, and the importance of how whistles are organized, to find out how complex it is."

6. Researchers may be years away from learning what every fish in the ocean already knows. But when the killer whale speaks, you''d better jump.') returning id into v_passage;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','How do you know whales are smart?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'whales learn to swim.', 'whales learn to swim.', false, 1),
    (v_q, 'whales must be smart to learn to talk.', 'whales must be smart to learn to talk.', false, 2),
    (v_q, 'whales must be smart because they can imitate sounds and prick on others.', 'whales must be smart because they can imitate sounds and prick on others.', true, 3),
    (v_q, 'whales are not smart.', 'whales are not smart.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,1);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','How do whales from different parts of the ocean communicate with each other?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'They use sign language.', 'They use sign language.', false, 1),
    (v_q, 'All whale talk is about the same.', 'All whale talk is about the same.', false, 2),
    (v_q, 'Whales in different parts of the ocean learn to make each other''s sounds.', 'Whales in different parts of the ocean learn to make each other''s sounds.', true, 3),
    (v_q, 'Whales from different parts of the ocean have a rivalry with each other.', 'Whales from different parts of the ocean have a rivalry with each other.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,2);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What is the meaning of squawk?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Fly', 'Fly', false, 1),
    (v_q, 'Make sound', 'Make sound', true, 2),
    (v_q, 'Talk', 'Talk', false, 3),
    (v_q, 'Hop', 'Hop', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,3);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','In paragraph 5, what does (it) mean?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Squawk', 'Squawk', false, 1),
    (v_q, 'Tones', 'Tones', false, 2),
    (v_q, 'Statistics', 'Statistics', false, 3),
    (v_q, 'Vocabulary', 'Vocabulary', true, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,4);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The sounds made by a killer whale in one part of the ocean may be very different from the sounds of a killer whale from another area in the sea.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,5);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Killer whales have 30 tons of voice.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,6);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Dolphins are very good at imitating sound and can learn to imitate the sounds of the killer whale.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,7);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Whales can joke and have a sense of humor.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,8);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Dolphins use a wide range of vocabulary to communicate with each other.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,9);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Now, scientists can understand dolphin talk.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_3','SOURCE_PDF_20261003','The Killer Whale']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,10);

  update public.intensive_exam_sections s
  set marks=x.total_marks,question_count=x.question_count,updated_at=now()
  from (
    select section_id,coalesce(sum(marks),0) total_marks,count(*)::integer question_count
    from public.intensive_exam_questions
    where exam_id=v_exam
    group by section_id
  ) x
  where s.id=x.section_id;

  update public.intensive_exams
  set total_marks=(select coalesce(sum(marks),0) from public.intensive_exam_questions where exam_id=v_exam),
      updated_at=now()
  where id=v_exam;

  insert into public.intensive_exam_assignments(exam_id,all_course_students)
  values(v_exam,true);

  insert into public.intensive_audit_logs(action,target_type,target_id,details)
  values(
    'SEED_MODEL_EXAM','EXAM',v_exam::text,
    jsonb_build_object(
      'course','EL111',
      'model',3,
      'minutes_per_section',30,
      'attempts_allowed',4,
      'result_release','IMMEDIATE',
      'composition_source','The Killer Whale'
    )
  );

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,
    starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
    result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
  ) values(
    v_course,
    'EL111 Midterm — Model 4',
    'MIDTERM',
    'NUMO EL111 practice model based on the supplied midterm collection. Composition passage: The Mysterious Blue Light.',
    'Complete each section before moving on. Each section has a separate 30-minute timer. You have up to 4 attempts. Your score is released immediately after submission.',
    now() - interval '1 day',
    timestamptz '2099-12-31 23:59:59+03',
    90,4,0,'IMMEDIATE','LIVE',false,false,false
  ) returning id into v_exam;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Grammar','Choose the correct answer.',1,0,0,true,30) returning id into v_grammar;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Vocabulary','Choose the correct answer.',2,0,0,true,30) returning id into v_vocab;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Composition','Read the passage and choose the correct answer.',3,0,0,true,30) returning id into v_composition;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_grammar,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Grammar'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_vocab,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Vocabulary'
  order by eq.position;

  insert into public.intensive_passages(course_id,title,body)
  values(v_course,'The Mysterious Blue Light','1. Bill Destinn worked on the night shift in an old coal mine called Park Deep. Two shifts of miners, each of 90 people, worked day and night, more than 6,000 feet underground. They all took their share of night work, but Bill always worked at night. He said he preferred it.

2. One day he came home as usual at half past seven in the morning. He had his "supper" as he called it and went to bed. An unusual dream troubled his sleep. Afterwards, the only thing he remembered about it was - a pulsing blue light.

3. Bill got up in the afternoon as usual. It was a strange getting up because he could still see the blue light in front of his eyes. As the evening grew darker, the light grew stronger. Bill got ready for the night shift. But by eight o''clock, the blue light was so bright that he could hardly see anything else. He and his wife were very puzzled. Was that a sort of unfamiliar sickness? They both recalled that Bill had never been sick before.

4. Both were very worried. "Don''t go to work, dear," his wife said. "If it isn''t better by tomorrow, I''ll have to send for the doctor." Bill''s intention to oppose his wife was not strong enough to prevent him from going to work. Besides, he needed his eyesight to perform his obligations. He surrendered to fate and sat in an armchair, awake but with closed eyes. Even then, the blueness was like a living thing. It surrounded him silently. As the family went to bed, he remained seated with that blue light pulsing all night.

5. At midnight exactly, a terrible explosion shook the ground. Bill opened his eyes and jumped to his feet. The blue light was gone! He rushed unconsciously outside. Someone shouted, "Gas! Gas in park deep! Oh, pity the night shift! All gone!"

6. The gas explosion destroyed the mine altogether. The bodies of the night shift workers remain to this day in their deep graves, and Bill Destin has never stopped wondering about it ever since. How could such a thing ever happen? That mysterious blue light: why did it make him the only man unfit for work that night?') returning id into v_passage;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The workers worked 10,000 feet underground in the coal mines.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,1);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Bill could hardly see anything because the blue light was not bright.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,2);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Bill needed his hearing to perform his obligations.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,3);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Bill surrendered to fate and sat in an armchair that night.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,4);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The bodies of the dead workers were all found.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,5);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Bill woke up feeling troubled because he',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'had a fight with his wife the night before', 'had a fight with his wife the night before', false, 1),
    (v_q, 'had an unusual dream', 'had an unusual dream', true, 2),
    (v_q, 'was worried about his friends', 'was worried about his friends', false, 3);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,6);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Bill always preferred to work mines.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'at night', 'at night', true, 1),
    (v_q, 'early in the morning', 'early in the morning', false, 2),
    (v_q, 'in the afternoon', 'in the afternoon', false, 3),
    (v_q, 'in the coal', 'in the coal', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,7);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The only thing Bill remembered about his dream was',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'a crime', 'a crime', false, 1),
    (v_q, 'a pulsing blue light', 'a pulsing blue light', true, 2),
    (v_q, 'his wife', 'his wife', false, 3);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,8);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Bill did not go to work that night because',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'of the bright pulsing light', 'of the bright pulsing light', true, 1),
    (v_q, 'his wife did not want him to go', 'his wife did not want him to go', false, 2),
    (v_q, 'he was feeling terribly sick', 'he was feeling terribly sick', false, 3);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,9);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The mysterious blue light',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_4','SOURCE_PDF_20261003','The Mysterious Blue Light']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'caused the explosion in the mines', 'caused the explosion in the mines', false, 1),
    (v_q, 'killed many people in the mines', 'killed many people in the mines', false, 2),
    (v_q, 'saved Bill''s life', 'saved Bill''s life', true, 3);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,10);

  update public.intensive_exam_sections s
  set marks=x.total_marks,question_count=x.question_count,updated_at=now()
  from (
    select section_id,coalesce(sum(marks),0) total_marks,count(*)::integer question_count
    from public.intensive_exam_questions
    where exam_id=v_exam
    group by section_id
  ) x
  where s.id=x.section_id;

  update public.intensive_exams
  set total_marks=(select coalesce(sum(marks),0) from public.intensive_exam_questions where exam_id=v_exam),
      updated_at=now()
  where id=v_exam;

  insert into public.intensive_exam_assignments(exam_id,all_course_students)
  values(v_exam,true);

  insert into public.intensive_audit_logs(action,target_type,target_id,details)
  values(
    'SEED_MODEL_EXAM','EXAM',v_exam::text,
    jsonb_build_object(
      'course','EL111',
      'model',4,
      'minutes_per_section',30,
      'attempts_allowed',4,
      'result_release','IMMEDIATE',
      'composition_source','The Mysterious Blue Light'
    )
  );

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,
    starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
    result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
  ) values(
    v_course,
    'EL111 Midterm — Model 5',
    'MIDTERM',
    'NUMO EL111 practice model based on the supplied midterm collection. Composition passage: Thanks, Kemmons Wilson.',
    'Complete each section before moving on. Each section has a separate 30-minute timer. You have up to 4 attempts. Your score is released immediately after submission.',
    now() - interval '1 day',
    timestamptz '2099-12-31 23:59:59+03',
    90,4,0,'IMMEDIATE','LIVE',false,false,false
  ) returning id into v_exam;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Grammar','Choose the correct answer.',1,0,0,true,30) returning id into v_grammar;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Vocabulary','Choose the correct answer.',2,0,0,true,30) returning id into v_vocab;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Composition','Read the passage and choose the correct answer.',3,0,0,true,30) returning id into v_composition;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_grammar,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Grammar'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_vocab,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Vocabulary'
  order by eq.position;

  insert into public.intensive_passages(course_id,title,body)
  values(v_course,'Thanks, Kemmons Wilson','On a car trip with his family, Kemmons Wilson was horrified by the roadside hotels that they encountered. So he decided to start his own hotel business. Today, those hotels are the internationally famous Holiday Inns. Wilson''s early life was difficult. Shortly after he was born, his father died. His hard-working mother lost her job during the Great Depression of the 1930s. So, Wilson dropped out of school to help support the family. He bought a popcorn machine and sold popcorn at a movie theater. By the time he was twenty, Wilson had earned enough money to buy a house for his mother. The family crisis had brought out his talent for commerce. Wilson purchased the local jukebox franchise and brought music into restaurants. Then he began to build homes.

By the 1950s, Wilson was married, and he and his wife had five children. On a vacation with his family, he became disgusted with the conditions of the cabins and motels that they stayed in. The rooms were often small and dirty. Many places charged two dollars extra per child. With five, Wilson paid ten extra dollars each night. Because he believed that all patrons should be welcomed equally, Wilson created a new type of hotel. He called it the Holiday Inn. Unlike other hotels, it provided air conditioning, a swimming pool, ice machines, free parking, and a restaurant.

Rooms also featured telephones and televisions. Most important, each room could be rented for a fixed price of six dollars per night; children stayed for no extra charge. Wilson''s hotels became so popular that he was able to develop a vast chain of them across the United States and worldwide. He sold franchises only to people who agreed to maintain high-quality services. Today, that chain has an inventory of several hundred thousand rooms. Since the 1950s, room prices have increased with inflation. However, their relatively low cost still appeals to families traveling with children. These hotels are so popular that if you call for a reservation, you may have to wait while operators handle a backlog of calls.

Holiday Inns can be found throughout the world. Vacationers to Aruba can stay in one when they visit the Island. There, they can bask in the sun, swim, or shop at the stalls of the local vendors. They will observe local people bartering their goods.

Of course, Wilson did not have a monopoly on the hotel business. Competitors copied his ideas, and today''s travelers have many choices of places to stay. Through a merger of companies, Wilson''s chain was eventually taken over by another company. Yet, Holiday Inns still offer service, quality, and low cost to traveling families. Today, people around the world can thank Kemmons Wilson for the inexpensive, good-quality hotels that (they) enjoy.') returning id into v_passage;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Room prices have increased with ......',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'overtime', 'overtime', false, 1),
    (v_q, 'rising prices', 'rising prices', true, 2),
    (v_q, 'trade', 'trade', false, 3),
    (v_q, 'merchandise', 'merchandise', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,1);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Wilson purchased the local jukebox............... and brought music into restaurants.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'factory outlets', 'factory outlets', false, 1),
    (v_q, 'rights to sell', 'rights to sell', true, 2),
    (v_q, 'unfilled orders', 'unfilled orders', false, 3),
    (v_q, 'modern machine', 'modern machine', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,2);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','When local people barter their goods, they...... with other people.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'sell', 'sell', false, 1),
    (v_q, 'buy', 'buy', false, 2),
    (v_q, 'exchange', 'exchange', true, 3),
    (v_q, 'donate', 'donate', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,3);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Wilson is persistent and hardworking because ....',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'He sold popcorn at a movie theater.', 'He sold popcorn at a movie theater.', true, 1),
    (v_q, 'He goes on vacations with his family.', 'He goes on vacations with his family.', false, 2),
    (v_q, 'His company was taken over.', 'His company was taken over.', false, 3),
    (v_q, 'He had five children.', 'He had five children.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,4);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The following statements are all facts except one. Which one is an opinion?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Holiday Inns has an inventory of several hundred thousand rooms.', 'Holiday Inns has an inventory of several hundred thousand rooms.', false, 1),
    (v_q, 'Competitors copied Wilson''s ideas and opened competitive hotels.', 'Competitors copied Wilson''s ideas and opened competitive hotels.', false, 2),
    (v_q, 'Wilson''s mother was hard-working.', 'Wilson''s mother was hard-working.', true, 3),
    (v_q, 'Wilson dropped out of school in the 1930s.', 'Wilson dropped out of school in the 1930s.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,5);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','In the last paragraph, the pronoun (they) refers to ...',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'companies', 'companies', false, 1),
    (v_q, 'families', 'families', false, 2),
    (v_q, 'people', 'people', true, 3),
    (v_q, 'hotels', 'hotels', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,6);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The main idea of the above reading passage is.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Kemmons Wilson decided to open a chain of hotels to save money', 'Kemmons Wilson decided to open a chain of hotels to save money', false, 1),
    (v_q, 'Kemmons Wilson is the founder of Holiday Inns.', 'Kemmons Wilson is the founder of Holiday Inns.', true, 2),
    (v_q, 'The Holiday Inns hotel in Aruba is the most comfortable hotel in the world', 'The Holiday Inns hotel in Aruba is the most comfortable hotel in the world', false, 3),
    (v_q, 'Wilson''s childhood was not easy', 'Wilson''s childhood was not easy', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,7);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Wilson had a talent for creating successful businesses.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,8);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Wilson misunderstood what customers wanted a hotel to be.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,9);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Today, Wilson''s five children own 80% percent of the hotels'' chain.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_5','SOURCE_PDF_20261003','Thanks, Kemmons Wilson']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,10);

  update public.intensive_exam_sections s
  set marks=x.total_marks,question_count=x.question_count,updated_at=now()
  from (
    select section_id,coalesce(sum(marks),0) total_marks,count(*)::integer question_count
    from public.intensive_exam_questions
    where exam_id=v_exam
    group by section_id
  ) x
  where s.id=x.section_id;

  update public.intensive_exams
  set total_marks=(select coalesce(sum(marks),0) from public.intensive_exam_questions where exam_id=v_exam),
      updated_at=now()
  where id=v_exam;

  insert into public.intensive_exam_assignments(exam_id,all_course_students)
  values(v_exam,true);

  insert into public.intensive_audit_logs(action,target_type,target_id,details)
  values(
    'SEED_MODEL_EXAM','EXAM',v_exam::text,
    jsonb_build_object(
      'course','EL111',
      'model',5,
      'minutes_per_section',30,
      'attempts_allowed',4,
      'result_release','IMMEDIATE',
      'composition_source','Thanks, Kemmons Wilson'
    )
  );

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,
    starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
    result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
  ) values(
    v_course,
    'EL111 Midterm — Model 6',
    'MIDTERM',
    'NUMO EL111 practice model based on the supplied midterm collection. Composition passage: Levi Roots.',
    'Complete each section before moving on. Each section has a separate 30-minute timer. You have up to 4 attempts. Your score is released immediately after submission.',
    now() - interval '1 day',
    timestamptz '2099-12-31 23:59:59+03',
    90,4,0,'IMMEDIATE','LIVE',false,false,false
  ) returning id into v_exam;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Grammar','Choose the correct answer.',1,0,0,true,30) returning id into v_grammar;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Vocabulary','Choose the correct answer.',2,0,0,true,30) returning id into v_vocab;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Composition','Read the passage and choose the correct answer.',3,0,0,true,30) returning id into v_composition;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_grammar,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Grammar'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_vocab,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Vocabulary'
  order by eq.position;

  insert into public.intensive_passages(course_id,title,body)
  values(v_course,'Levi Roots','Levi Roots, a reggae singer from Jamaica, has a big smile on his face these days. In case you missed it, Levi recently appeared on the famous reality show for people with business ideas, Dragon''s Den. The participants have to persuade the team of business experts that their ideas are excellent and hope that two or more of the team will decide to invest money in their business idea. Levi did just that!

The singer, who has been a successful music artist for several years, also sells something he calls "Reggae, reggae sauce". It is made using special secret ingredients from his grandmother and is a hot Jamaican sauce that is eaten with meat. Until now, it has only been possible to buy the sauce from Levi''s website or once a year at the famous Notting Hill carnival. But now, thanks to the TV programmer, that is all going to change!

Levi presented his business idea to the team and started with a catchy reggae song about the sauce to make them sit up and listen. He certainly got their attention! He then described his plans for the sauce. This part of his presentation did not go so well. He made mistakes with his (figures), saying that he already had an order for the sauce of two and half million when in fact he meant two and half thousand! But the team was still interested and amazingly, two of the team offered to give 50,000 pound to the plan in exchange for 40% of the company. Mr. Roots was (ecstatic)!

Levi is even happier today. It seems that two of the biggest supermarket chains in the UK are interested in having the sauce on their shelves. In addition to this, Levi is recording the "Reggae, reggae sauce song, and people will soon be able to buy or download it. "It is all about putting music into food," says Levi with a big, big smile on his face! And music and food will probably make him a very rich man indeed.') returning id into v_passage;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','At the moment, Levi is worried about how to proceed with his business plan.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,1);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','His song is already a big success.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', false, 1),
    (v_q, 'FALSE', 'FALSE', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,2);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','He sang his song on TV.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'TRUE', 'TRUE', true, 1),
    (v_q, 'FALSE', 'FALSE', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,3);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Dragon''s Den is a show about',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'cooking', 'cooking', false, 1),
    (v_q, 'new business ideas', 'new business ideas', true, 2),
    (v_q, 'famous people', 'famous people', false, 3),
    (v_q, 'singing', 'singing', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,4);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','To get the sauce before now,',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'you had to go to Notting Hill', 'you had to go to Notting Hill', true, 1),
    (v_q, 'you had to ask a member of Levi''s family', 'you had to ask a member of Levi''s family', false, 2),
    (v_q, 'you needed a recipe book', 'you needed a recipe book', false, 3),
    (v_q, 'you could order from the website of Dragon''s Den', 'you could order from the website of Dragon''s Den', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,5);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','When Levi presented his idea',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'he finished with a song', 'he finished with a song', false, 1),
    (v_q, 'two and half million people were watching', 'two and half million people were watching', false, 2),
    (v_q, 'he talked about the wrong numbers', 'he talked about the wrong numbers', true, 3),
    (v_q, 'he prepared the sauce on air', 'he prepared the sauce on air', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,6);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Some people on the team',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'own supermarkets.', 'own supermarkets.', false, 1),
    (v_q, 'didn''t like the taste.', 'didn''t like the taste.', false, 2),
    (v_q, 'bought part of Levi''s company.', 'bought part of Levi''s company.', true, 3),
    (v_q, 'own recording companies.', 'own recording companies.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,7);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Today, Levi',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'is a millionaire.', 'is a millionaire.', false, 1),
    (v_q, 'has two things he can profit from.', 'has two things he can profit from.', true, 2),
    (v_q, 'prefers music to food.', 'prefers music to food.', false, 3),
    (v_q, 'Is preparing for a carnival.', 'Is preparing for a carnival.', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,8);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The word (ecstatic) in paragraph 3 means',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'worried', 'worried', false, 1),
    (v_q, 'elated', 'elated', true, 2),
    (v_q, 'persuasive', 'persuasive', false, 3),
    (v_q, 'successful', 'successful', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,9);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The word (figures) in paragraph 3 means',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_6','SOURCE_PDF_20261003','Levi Roots']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'charts', 'charts', false, 1),
    (v_q, 'shapes', 'shapes', false, 2),
    (v_q, 'numbers', 'numbers', true, 3),
    (v_q, 'models', 'models', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,10);

  update public.intensive_exam_sections s
  set marks=x.total_marks,question_count=x.question_count,updated_at=now()
  from (
    select section_id,coalesce(sum(marks),0) total_marks,count(*)::integer question_count
    from public.intensive_exam_questions
    where exam_id=v_exam
    group by section_id
  ) x
  where s.id=x.section_id;

  update public.intensive_exams
  set total_marks=(select coalesce(sum(marks),0) from public.intensive_exam_questions where exam_id=v_exam),
      updated_at=now()
  where id=v_exam;

  insert into public.intensive_exam_assignments(exam_id,all_course_students)
  values(v_exam,true);

  insert into public.intensive_audit_logs(action,target_type,target_id,details)
  values(
    'SEED_MODEL_EXAM','EXAM',v_exam::text,
    jsonb_build_object(
      'course','EL111',
      'model',6,
      'minutes_per_section',30,
      'attempts_allowed',4,
      'result_release','IMMEDIATE',
      'composition_source','Levi Roots'
    )
  );

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,
    starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
    result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
  ) values(
    v_course,
    'EL111 Midterm — Model 7',
    'MIDTERM',
    'NUMO EL111 practice model based on the supplied midterm collection. Composition passage: Reducing Car Accidents.',
    'Complete each section before moving on. Each section has a separate 30-minute timer. You have up to 4 attempts. Your score is released immediately after submission.',
    now() - interval '1 day',
    timestamptz '2099-12-31 23:59:59+03',
    90,4,0,'IMMEDIATE','LIVE',false,false,false
  ) returning id into v_exam;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Grammar','Choose the correct answer.',1,0,0,true,30) returning id into v_grammar;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Vocabulary','Choose the correct answer.',2,0,0,true,30) returning id into v_vocab;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Composition','Read the passage and choose the correct answer.',3,0,0,true,30) returning id into v_composition;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_grammar,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Grammar'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_vocab,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Vocabulary'
  order by eq.position;

  insert into public.intensive_passages(course_id,title,body)
  values(v_course,'Reducing Car Accidents','1. One method for reducing car accidents is by allowing vehicles to communicate with each other. This technology has been researched since 1997, and its current form was initiated by the National Transportation Safety Board. Wireless car-to-car communication would allow quick accurate sensing of distance between vehicles. In June 2013, a large-scale test of this technology was completed in Washington D.C. under the direction of United States Secretary of Transportation Ray LaHood.

2. Electronic Stability Control (ESC) helps to avoid a crash by reducing the risk of your car sliding during a sudden emergency action such as avoiding an obstacle in front of you. ESC identifies this risk early and stabilizes the car by automatic braking.

3. Warning and Emergency Braking Systems detect the danger of an accident with the vehicle in front of you. In the case of a crash, they warn you about the danger, and when there is no reaction to the warning, the technologies activate the brakes electronically. Blind Spot Monitoring helps you avoid a crash with a vehicle in the lane next to you by continuously screening the blind spots to the side of your vehicle.

4. Lane Support Systems can assist and warn you when you unintentionally leave the road or when you change lanes without indication. A moment of inattention is enough to make your vehicle go off its lane. The systems monitor the position of the vehicle in the road lane. While Lane Departure Warning System warns you if the car unintentionally moves from its path, Lane Keeping Support helps you correct the course of your car. Lane Departure Warning System has been recommended in all next-generation cars by the United States government. When certain critical factors are detected, including sudden turning and over speeding around corners, the vehicle automatically reduces speed to prevent rollover.') returning id into v_passage;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','According to the text, what can be one among the methods of reducing accidents?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Cars should communicate with each other', 'Cars should communicate with each other', true, 1),
    (v_q, 'Cars should have researched technology', 'Cars should have researched technology', false, 2),
    (v_q, 'A large-scale test', 'A large-scale test', false, 3),
    (v_q, 'Emergency brakes', 'Emergency brakes', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,1);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What is the function of the car-to-car communication system',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'To make a larger scale test', 'To make a larger scale test', false, 1),
    (v_q, 'To initiate current technology', 'To initiate current technology', false, 2),
    (v_q, 'To sense the distance between cars', 'To sense the distance between cars', true, 3),
    (v_q, 'To conduct research', 'To conduct research', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,2);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','How can the Electronic Stability Control (ESC) help to avoid a crash?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'It reduces sliding during a sudden emergency action', 'It reduces sliding during a sudden emergency action', true, 1),
    (v_q, 'It identifies the risk late and stabilizes the car', 'It identifies the risk late and stabilizes the car', false, 2),
    (v_q, 'It uses manual braking and stops the car', 'It uses manual braking and stops the car', false, 3),
    (v_q, 'It helps stop the car', 'It helps stop the car', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,3);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What does the word ''they'' mean in paragraph 3?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Danger and accidents', 'Danger and accidents', false, 1),
    (v_q, 'Emergency Braking Systems', 'Emergency Braking Systems', true, 2),
    (v_q, 'electronic breaks', 'electronic breaks', false, 3),
    (v_q, 'Warning and Danger', 'Warning and Danger', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,4);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What is the meaning of ''continuously screening'' in paragraph 3?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'constant avoiding', 'constant avoiding', false, 1),
    (v_q, 'ongoing crashing', 'ongoing crashing', false, 2),
    (v_q, 'unending viewing', 'unending viewing', true, 3),
    (v_q, 'ongoing driving', 'ongoing driving', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,5);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What are the Warning and Emergency Braking Systems for?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'For detecting the danger of an accident', 'For detecting the danger of an accident', false, 1),
    (v_q, 'For detecting the car in front of you', 'For detecting the car in front of you', false, 2),
    (v_q, 'For detecting an accident and the car in front of you', 'For detecting an accident and the car in front of you', true, 3),
    (v_q, 'For detecting the brakes in your car', 'For detecting the brakes in your car', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,6);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','How does the Lane Support Systems help the drivers?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'It warns if the car moves too fast', 'It warns if the car moves too fast', false, 1),
    (v_q, 'It corrects the course of the car', 'It corrects the course of the car', true, 2),
    (v_q, 'It makes cars go off track', 'It makes cars go off track', false, 3),
    (v_q, 'It makes the lanes change', 'It makes the lanes change', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,7);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','"Lane Departure Warning System has been recommended in all next-generation cars". This sentence is in the:',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'present tense', 'present tense', false, 1),
    (v_q, 'present perfect form', 'present perfect form', true, 2),
    (v_q, 'past tense', 'past tense', false, 3),
    (v_q, 'past perfect tense', 'past perfect tense', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,8);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','By screening the blind spots, one can avoid accidents with a vehicle in the same lane.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'True', 'True', true, 1),
    (v_q, 'False', 'False', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,9);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The technology of wireless car to car communication was first researched in the year 2013.',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_7','SOURCE_PDF_20261003','Reducing Car Accidents']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'True', 'True', false, 1),
    (v_q, 'False', 'False', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,10);

  update public.intensive_exam_sections s
  set marks=x.total_marks,question_count=x.question_count,updated_at=now()
  from (
    select section_id,coalesce(sum(marks),0) total_marks,count(*)::integer question_count
    from public.intensive_exam_questions
    where exam_id=v_exam
    group by section_id
  ) x
  where s.id=x.section_id;

  update public.intensive_exams
  set total_marks=(select coalesce(sum(marks),0) from public.intensive_exam_questions where exam_id=v_exam),
      updated_at=now()
  where id=v_exam;

  insert into public.intensive_exam_assignments(exam_id,all_course_students)
  values(v_exam,true);

  insert into public.intensive_audit_logs(action,target_type,target_id,details)
  values(
    'SEED_MODEL_EXAM','EXAM',v_exam::text,
    jsonb_build_object(
      'course','EL111',
      'model',7,
      'minutes_per_section',30,
      'attempts_allowed',4,
      'result_release','IMMEDIATE',
      'composition_source','Reducing Car Accidents'
    )
  );

  insert into public.intensive_exams(
    course_id,title,category,description,instructions,
    starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,
    result_release,status,allow_answer_review,shuffle_questions,shuffle_answers
  ) values(
    v_course,
    'EL111 Midterm — Model 8',
    'MIDTERM',
    'NUMO EL111 practice model based on the supplied midterm collection. Composition passage: Ancient Architectural structures + Mount Vesuvius.',
    'Complete each section before moving on. Each section has a separate 30-minute timer. You have up to 4 attempts. Your score is released immediately after submission.',
    now() - interval '1 day',
    timestamptz '2099-12-31 23:59:59+03',
    90,4,0,'IMMEDIATE','LIVE',false,false,false
  ) returning id into v_exam;

  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Grammar','Choose the correct answer.',1,0,0,true,30) returning id into v_grammar;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Vocabulary','Choose the correct answer.',2,0,0,true,30) returning id into v_vocab;
  insert into public.intensive_exam_sections(exam_id,title,instructions,position,marks,question_count,is_enabled,time_limit_minutes)
  values(v_exam,'Composition','Read the passage and choose the correct answer.',3,0,0,true,30) returning id into v_composition;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_grammar,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Grammar'
  order by eq.position;

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  select v_exam,v_vocab,eq.question_id,eq.marks,eq.position
  from public.intensive_exam_questions eq
  join public.intensive_exam_sections s on s.id=eq.section_id
  where eq.exam_id=v_model1 and s.title='Vocabulary'
  order by eq.position;

  insert into public.intensive_passages(course_id,title,body)
  values(v_course,'Ancient Architectural structures','1. European historical architecture is among the most well-known in the world. One example of a famous architectural structure is called "Stonehenge," in England. Stonehenge has many, very large stones set up in circles. No one knows why the stones were set up that way, because it was at a time before history was recorded. Many people think Stonehenge is holy.

2. In addition to Stonehenge, the "Acropolis" in Athens, Greece is also very famous for its architectural structures. The Acropolis of Athens and its monuments are universal symbols of the classical spirit and civilization. The Acropolis is a flat-topped hill, which lies about 150 meters above sea level. It is situated above the city of Athens and contains the remains of several ancient buildings of great architectural and historic significance, the most famous being the Parthenon the Acropolis is a huge tourist site. About 14 million people visit this location each year.

3. Modern European buildings are also tourist sites. The Eiffel Tower is the fifth tallest building in France. When it was built in 1889, it was the world''s tallest building. More than 200,000,000 people have visited the Eiffel Tower since it was built. You can go up the Eiffel Tower using the lifts but you can also choose the stairs if you really want to explore the tower from every angle and enjoy a walk which really is quite unlike anything else. It was named after Gustave Eiffel, who designed it. The Eiffel Tower is a wrought iron lattice tower on the Champ de Mars in Paris, France. It is now a symbol of France.

4. The year 2009 marks the 150th birthday of another famous tourist site in Europe: Big Ben. Big Ben is located atop the Westminster Palace in London, England. Big Ben is the largest four-faced chiming clock in the world. Chiming clocks are clocks that use bells to make their sound. Big Ben is a universal symbol of the United Kingdom. Big Ben is the nickname for the Great Bell of the clock at the north end of the Palace of Westminster in London and is usually extended to refer to both the clock and the clock tower as well.') returning id into v_passage;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','This passage gives information about:',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Ancient Architectural structures']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'European soccer players', 'European soccer players', false, 1),
    (v_q, 'famous architectural sites in Europe', 'famous architectural sites in Europe', true, 2),
    (v_q, 'ocean life', 'ocean life', false, 3),
    (v_q, 'hills and mountains', 'hills and mountains', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,1);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What is the meaning of the word ''historical'' in paragraph 1?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Ancient Architectural structures']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'modern', 'modern', false, 1),
    (v_q, 'foreign', 'foreign', false, 2),
    (v_q, 'old', 'old', true, 3),
    (v_q, 'traditional', 'traditional', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,2);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What do many people think about Stonehenge?',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Ancient Architectural structures']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'it is holy', 'it is holy', true, 1),
    (v_q, 'it is cursed', 'it is cursed', false, 2),
    (v_q, 'it is ugly', 'it is ugly', false, 3),
    (v_q, 'it is a circle', 'it is a circle', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,3);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The Acropolis is a/an:',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Ancient Architectural structures']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'ocean', 'ocean', false, 1),
    (v_q, 'hill', 'hill', true, 2),
    (v_q, 'island', 'island', false, 3),
    (v_q, 'stone', 'stone', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,4);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The sentence: ''More than 200,000,000 people have visited the Eiffel Tower since it was built'' (paragraph 3) is the same as:',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Ancient Architectural structures']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Many people visited the Eiffel Tower before it was built', 'Many people visited the Eiffel Tower before it was built', false, 1),
    (v_q, 'Many people visited the Eiffel Tower from the time it was built', 'Many people visited the Eiffel Tower from the time it was built', true, 2),
    (v_q, 'Many people visited the Eiffel Tower but no longer visit anymore', 'Many people visited the Eiffel Tower but no longer visit anymore', false, 3),
    (v_q, 'Many people visited the Eiffel Tower while it was built', 'Many people visited the Eiffel Tower while it was built', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,5);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Gustave Eiffel was a:',
    v_passage,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Ancient Architectural structures']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Builder', 'Builder', false, 1),
    (v_q, 'Designer', 'Designer', true, 2),
    (v_q, 'Historian', 'Historian', false, 3),
    (v_q, 'Painter', 'Painter', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,6);

  insert into public.intensive_passages(course_id,title,body)
  values(v_course,'Mount Vesuvius','Mount Vesuvius, a volcano located between the ancient Italian cities of Pompeii and Herculaneum, has received much attention because of its frequent and destructive eruptions. The most famous of these eruptions occurred in A.D. 79. The volcano had been inactive for centuries. There was little warning of the coming eruption, although one account unearthed by archaeologists says that a hard rain and a strong wind had disturbed the celestial calm during the preceding night. Early the next morning, the volcano poured a huge river of molten rock down upon Herculaneum, completely burying the city and filling the harbor with coagulated lava.

Meanwhile, on the other side of the mountain, cinders, stone and ash rained down on Pompeii. Sparks from the burning ash ignited the combustible rooftops quickly. Large portions of the city were destroyed in the conflagration. Fire, however, was not the only cause of destruction. Poisonous sulfuric gases saturated the air. These heavy gases were not buoyant in the atmosphere and therefore sank toward the earth and suffocated people.

Over the years, excavations of Pompeii and Herculaneum have revealed a great deal about the behavior of the volcano. By analyzing data, much as a zoologist dissects an animal specimen, scientists have concluded that the eruption changed large portions of the area''s geography. For instance, it turned the Sarno River from its course and raised the level of the beach along the Bay of Naples. Meteorologists studying these events have also concluded that Vesuvius caused a huge tidal wave that affected the world''s climate.

In addition to making these investigations, archaeologists have been able to study the skeletons of victims by using distilled water to wash away the volcanic ash. By strengthening the brittle bones with acrylic paint, scientists have been able to examine the skeletons and draw conclusions about the diet and habits of the residents. Finally, the excavations at both Pompeii and Herculaneum have yielded many examples of classical art, such as jewelry made of bronze, which is an alloy of copper and tin. The eruption of Mount Vesuvius and its tragic consequences have provided everyone with a wealth of data about the effects that volcanoes can have on the surrounding area. Today, volcanologists can locate and predict eruptions, saving lives and preventing the destruction of other cities and cultures.') returning id into v_passage2;

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The mountain has received much attention because of',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'the Italian cities', 'the Italian cities', false, 1),
    (v_q, 'eruptions', 'eruptions', false, 2),
    (v_q, 'its frequent and destructive eruptions', 'its frequent and destructive eruptions', true, 3),
    (v_q, 'its inactive nature', 'its inactive nature', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,7);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','How long has the mountain been inactive?',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'for hundreds of years', 'for hundreds of years', true, 1),
    (v_q, 'from A.D.79', 'from A.D.79', false, 2),
    (v_q, 'for a few years', 'for a few years', false, 3),
    (v_q, 'not given', 'not given', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,8);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The sulphuric gases caused a big problem. What was the problem?',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'The gases destroyed the city.', 'The gases destroyed the city.', false, 1),
    (v_q, 'The gases sank towards the earth.', 'The gases sank towards the earth.', false, 2),
    (v_q, 'People suffocated from these gases.', 'People suffocated from these gases.', true, 3),
    (v_q, 'The gases caused rain', 'The gases caused rain', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,9);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','According to scientists and Meteorologists the eruptions:',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'caused a geographical change of land and climate.', 'caused a geographical change of land and climate.', true, 1),
    (v_q, 'Turned Sarno River into a beach.', 'Turned Sarno River into a beach.', false, 2),
    (v_q, 'did not change geographical land features.', 'did not change geographical land features.', false, 3),
    (v_q, 'caused many tidal waves', 'caused many tidal waves', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,10);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What does the word ''it'' in paragraph 3 mean?',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'Volcano', 'Volcano', false, 1),
    (v_q, 'Eruption', 'Eruption', true, 2),
    (v_q, 'Sarno River', 'Sarno River', false, 3),
    (v_q, 'course', 'course', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,11);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','What does the word destroyed in paragraph 2 mean?',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'ruined', 'ruined', true, 1),
    (v_q, 'in place', 'in place', false, 2),
    (v_q, 'unbroken', 'unbroken', false, 3),
    (v_q, 'created', 'created', false, 4);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,12);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Mount Vesuvius is situated in Italy.',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'True', 'True', true, 1),
    (v_q, 'False', 'False', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,13);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','The volcano didn''t pour any molten rock.',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'True', 'True', false, 1),
    (v_q, 'False', 'False', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,14);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Archaeologists have also been studying volcanoes.',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'True', 'True', false, 1),
    (v_q, 'False', 'False', true, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,15);

  insert into public.intensive_questions(
    course_id,exam_category,skill,type,difficulty,prompt,passage_id,
    grading_mode,marks,tags,is_active
  ) values(
    v_course,'MIDTERM','Composition','MULTIPLE_CHOICE','MEDIUM','Today volcanologists can understand coming eruptions.',
    v_passage2,'AUTO',1,array['EL111','MIDTERM_MODEL_8','SOURCE_PDF_20261003','Mount Vesuvius']::text[],true
  ) returning id into v_q;

  insert into public.intensive_question_options(question_id,label,value,is_correct,position)
  values
    (v_q, 'True', 'True', true, 1),
    (v_q, 'False', 'False', false, 2);

  insert into public.intensive_exam_questions(exam_id,section_id,question_id,marks,position)
  values(v_exam,v_composition,v_q,1,16);

  update public.intensive_exam_sections s
  set marks=x.total_marks,question_count=x.question_count,updated_at=now()
  from (
    select section_id,coalesce(sum(marks),0) total_marks,count(*)::integer question_count
    from public.intensive_exam_questions
    where exam_id=v_exam
    group by section_id
  ) x
  where s.id=x.section_id;

  update public.intensive_exams
  set total_marks=(select coalesce(sum(marks),0) from public.intensive_exam_questions where exam_id=v_exam),
      updated_at=now()
  where id=v_exam;

  insert into public.intensive_exam_assignments(exam_id,all_course_students)
  values(v_exam,true);

  insert into public.intensive_audit_logs(action,target_type,target_id,details)
  values(
    'SEED_MODEL_EXAM','EXAM',v_exam::text,
    jsonb_build_object(
      'course','EL111',
      'model',8,
      'minutes_per_section',30,
      'attempts_allowed',4,
      'result_release','IMMEDIATE',
      'composition_source','Ancient Architectural structures + Mount Vesuvius'
    )
  );

end
$$;

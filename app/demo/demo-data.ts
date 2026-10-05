export type DemoSectionName = "Grammar" | "Vocabulary" | "Reading";

export type DemoQuestion = {
  id: string;
  section: DemoSectionName;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correct: string;
  passageTitle?: string;
  passage?: string;
};

export const demoSections = [
  { id: "grammar", title: "Grammar" as DemoSectionName, questionCount: 27, minutes: 30, attemptsAllowed: 4 },
  { id: "vocabulary", title: "Vocabulary" as DemoSectionName, questionCount: 19, minutes: 30, attemptsAllowed: 4 },
  { id: "reading", title: "Reading" as DemoSectionName, questionCount: 86, minutes: 30, attemptsAllowed: 4 },
];

export const demoQuestions: DemoQuestion[] = [
  {
    id: "g1", section: "Grammar", prompt: "The accident…………by pilot error.",
    options: [
      { id: "a", label: "Is causing." }, { id: "b", label: "Caused." },
      { id: "c", label: "Was caused." }, { id: "d", label: "Is caused." },
    ], correct: "c",
  },
  {
    id: "g2", section: "Grammar", prompt: "What question is grammatically correct?",
    options: [
      { id: "a", label: "What did you ate?" }, { id: "b", label: "When does you eat?" },
      { id: "c", label: "Where did you eat?" }, { id: "d", label: "Why did you ate?" },
    ], correct: "c",
  },
  {
    id: "g3", section: "Grammar", prompt: "Yesterday, the detectives a full investigation on how the murder occurred?",
    options: [
      { id: "a", label: "Have promised." }, { id: "b", label: "Are going to promise." },
      { id: "c", label: "Promised." }, { id: "d", label: "Will promise." },
    ], correct: "c",
  },
  {
    id: "g4", section: "Grammar", prompt: "Does she play tennis?",
    options: [
      { id: "a", label: "Yes, she did" }, { id: "b", label: "No, she hasn’t" },
      { id: "c", label: "No, she didn’t" }, { id: "d", label: "Yes, she does" },
    ], correct: "d",
  },
  {
    id: "g5", section: "Grammar", prompt: "This book by a famous writer in 1990.",
    options: [
      { id: "a", label: "Wrote" }, { id: "b", label: "Writes" },
      { id: "c", label: "Was written" }, { id: "d", label: "Is written" },
    ], correct: "c",
  },
  {
    id: "v1", section: "Vocabulary", prompt: "Suddenly, the boy screamed ‘save me, I’m…………’",
    options: [
      { id: "a", label: "Organizing" }, { id: "b", label: "Flying" },
      { id: "c", label: "Drowning" }, { id: "d", label: "Playing" },
    ], correct: "c",
  },
  {
    id: "v2", section: "Vocabulary", prompt: "I’ve come to the………that Ali is not the right person for the job.",
    options: [
      { id: "a", label: "Conclusion" }, { id: "b", label: "Evidence" },
      { id: "c", label: "Observation" }, { id: "d", label: "Playing" },
    ], correct: "a",
  },
  {
    id: "v3", section: "Vocabulary", prompt: "The city’s……..ballooned to over 10 million in just a decade.",
    options: [
      { id: "a", label: "Population" }, { id: "b", label: "Migration" },
      { id: "c", label: "Innovation" }, { id: "d", label: "Exploration" },
    ], correct: "a",
  },
  {
    id: "v4", section: "Vocabulary", prompt: "The most exciting part of a play, piece of music or a narrative is known as ……..",
    options: [
      { id: "a", label: "Climax" }, { id: "b", label: "Conclusion" },
      { id: "c", label: "Scene" }, { id: "d", label: "Narrative" },
    ], correct: "a",
  },
  {
    id: "v5", section: "Vocabulary", prompt: "‘Leaving a newborn baby unattended is very DANGEROUS’, the antonym of the capitalized word is:",
    options: [
      { id: "e", label: "Hazardous" }, { id: "f", label: "Savage" },
      { id: "g", label: "Risky" }, { id: "h", label: "Safe" },
    ], correct: "h",
  },
  {
    id: "r1", section: "Reading", passageTitle: "Can Physical exercise be a sport?",
    passage: "Physical exercise and team sports are good for mind, body and spirit. Furthermore, team sports are good for learning accountability, dedication, and leadership, among many other traits. Putting it all together by playing a sport is a winning combination. Playing a sport or becoming an athlete requires a lot of time and energy.\n\nSports require memorization, repetition and learning skill sets that are directly relevant to class work. Also, the determination and goal-setting skills sports require can be transferred to the classroom. Fighting for a common goal with other players, coaches, managers and community members teaches you how to build collective team spirit and effectively communicate the best way to solve problems towards success. Clearly, sports will improve your fitness and weight. In addition, they also encourage healthy decisions such as not smoking or drinking alcohol and offer hidden health benefits such as a lower chance of getting bone weakness or breast cancer later in life.\n\nWatching your hard work pay off and achieving your dreams brings about tons of self-confidence. If you can achieve something in a sport or with a fitness goal, then you know you can achieve any other goal you set. Exercising is a natural way to loosen up and let go of stress. Also, you will most likely make many new friends on the team who can be there for you as a support system. When you find you are having a lot of stress, you can call up teammates and head to the gym to discuss it and play it out.",
    prompt: "Team sports helps develop players.",
    options: [
      { id: "a", label: "accountability, dedication and dreams" },
      { id: "b", label: "leadership, dedication, dreams" },
      { id: "c", label: "accountability, dedication leadership" },
      { id: "d", label: "new friends, dreams, leadership" },
    ], correct: "c",
  },
  {
    id: "r2", section: "Reading", passageTitle: "Can Physical exercise be a sport?",
    prompt: "Student-athletes can benefit from sports activities while in classroom because:",
    options: [
      { id: "a", label: "memorization and repetition skill sets from sports can be applicable in classrooms." },
      { id: "b", label: "determination and goal-setting skills of sportsmen are relevant to class work." },
      { id: "c", label: "memorization, repetition, determination and goal-setting skills can be applicable in classrooms." },
      { id: "d", label: "It can help them be fit and lose weight." },
    ], correct: "c",
  },
  {
    id: "r3", section: "Reading", passageTitle: "Can Physical exercise be a sport?",
    prompt: "What does the word 'they' mean in paragraph 2?",
    options: [
      { id: "a", label: "sports" }, { id: "b", label: "decisions" },
      { id: "c", label: "sportsmen" }, { id: "d", label: "fitness and weight" },
    ], correct: "a",
  },
  {
    id: "r4", section: "Reading", passageTitle: "Can Physical exercise be a sport?",
    prompt: "What is the main idea of this article?",
    options: [
      { id: "a", label: "People get paid when they do sports." },
      { id: "b", label: "Sports require a lot of time and energy." },
      { id: "c", label: "It is always a great decision to get involved in sports." },
      { id: "d", label: "Sports are of many types." },
    ], correct: "c",
  },
  {
    id: "r5", section: "Reading", passageTitle: "Can Physical exercise be a sport?",
    prompt: "As a sports person, to get released from stress you should.",
    options: [
      { id: "a", label: "go to the gym." }, { id: "b", label: "discuss it with friends." },
      { id: "c", label: "discuss it and play it out." }, { id: "d", label: "sit quietly" },
    ], correct: "c",
  },
];

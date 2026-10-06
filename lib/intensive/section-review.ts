export type RawSectionReviewItem = {
  number: number;
  questionId: string;
  sectionTitle: string;
  skill: string;
  type: string;
  prompt: string;
  marks: number;
  earned: number;
  selectedAnswer: string;
  correctAnswer: string;
  passage?: null | {
    id?: string;
    title?: string;
    body?: string;
    imageUrl?: string | null;
  };
  referenceSource?: string | null;
  referenceUnit?: string | null;
  referencePage?: string | null;
  referenceEvidence?: string | null;
};

function grammarFocus(prompt: string) {
  const text = prompt.toLowerCase();

  if (/reported speech|indirect speech|\bsaid\b|\basked\b|\btold\b|promised/.test(text)) {
    return {
      en: "Focus: reported speech. Check pronouns, tense backshift, time expressions, and the reporting verb pattern.",
      ar: "التركيز: الكلام المنقول. راجع الضمائر وتحويل الزمن وتعبيرات الوقت وصيغة فعل النقل.",
    };
  }

  if (/\bif\b/.test(text)) {
    return {
      en: "Focus: conditionals. Match the tense in the if-clause with the correct result clause.",
      ar: "التركيز: الجمل الشرطية. اربط زمن جملة if بصيغة النتيجة المناسبة.",
    };
  }

  if (/passive|active form|is played|are caused|be killed|was rescued/.test(text)) {
    return {
      en: "Focus: active/passive voice. Check the form of be + past participle and whether the doer is introduced with by.",
      ar: "التركيز: المبني للمعلوم والمجهول. راجع صيغة be + التصريف الثالث واستخدام by عند ذكر الفاعل.",
    };
  }

  if (/\bsince\b|\bfor\b|recently|past six|past two|since last|since the beginning|have you|has been|have been/.test(text)) {
    return {
      en: "Focus: present perfect / present perfect continuous. Use it for actions connected to the present, especially with since, for, recently, or an unfinished time period.",
      ar: "التركيز: المضارع التام أو المضارع التام المستمر. يستخدم للأفعال المرتبطة بالحاضر، خصوصا مع since وfor وrecently والفترات غير المنتهية.",
    };
  }

  if (/\bhad\b|before|after|already left|when i arrived|before she went/.test(text)) {
    return {
      en: "Focus: past perfect. Use had + past participle for the earlier of two past actions.",
      ar: "التركيز: الماضي التام. نستخدم had + التصريف الثالث للفعل الذي حدث أولا بين حدثين في الماضي.",
    };
  }

  if (/should|must|could|can|have to|allowed|permitted/.test(text)) {
    return {
      en: "Focus: modal verbs. Choose the modal that matches obligation, advice, permission, ability, or prohibition.",
      ar: "التركيز: الأفعال الناقصة. اختر الفعل الذي يعبر عن الإلزام أو النصيحة أو الإذن أو القدرة أو المنع.",
    };
  }

  if (/agree|provide|depend|concentrate|critical|search|belong|spends|specialized|fed up|look up|prefer/.test(text)) {
    return {
      en: "Focus: prepositions and fixed collocations. Learn the verb/adjective together with the preposition it normally takes.",
      ar: "التركيز: حروف الجر والتراكيب الثابتة. احفظ الفعل أو الصفة مع حرف الجر الذي يأتي معها عادة.",
    };
  }

  return {
    en: "Focus: sentence structure and grammatical form. Check tense, agreement, word order, and the form required by the surrounding words.",
    ar: "التركيز: تركيب الجملة والصيغة النحوية. راجع الزمن والتوافق وترتيب الكلمات والصيغة التي يفرضها سياق الجملة.",
  };
}

export function enrichSectionReview(item: RawSectionReviewItem) {
  const skill = (item.skill || "").toLowerCase();
  const selected = item.selectedAnswer || "No answer";
  const correct = item.correctAnswer || "—";

  if (item.referenceEvidence && item.referenceSource) {
    const unanswered = selected === "No answer" || selected === "لم تتم الإجابة";
    return {
      ...item,
      correctionEn: unanswered
        ? `No answer was selected. The correct answer is “${correct}”.`
        : `Your answer was “${selected}”. The correct answer is “${correct}”.`,
      correctionAr: unanswered
        ? `لم تتم الإجابة عن هذا السؤال. الإجابة الصحيحة هي «${correct}».`
        : `إجابتك كانت «${selected}»، والصحيح هو «${correct}».`,
      explanationEn: item.referenceEvidence,
      explanationAr: item.referenceEvidence,
      tipEn: `Reference: ${item.referenceSource}${item.referencePage ? `, p. ${item.referencePage}` : ""}.`,
      tipAr: `المصدر: ${item.referenceSource}${item.referenceUnit ? `، ${item.referenceUnit}` : ""}${item.referencePage ? `، ص ${item.referencePage}` : ""}.`,
    };
  }

  if (skill === "grammar") {
    const focus = grammarFocus(item.prompt);
    return {
      ...item,
      correctionEn:
        selected === "No answer"
          ? `You did not answer this question. The correct answer is “${correct}”.`
          : `Your answer was “${selected}”. The correct answer is “${correct}”.`,
      correctionAr:
        selected === "No answer"
          ? `لم تتم الإجابة عن هذا السؤال. الإجابة الصحيحة هي «${correct}».`
          : `إجابتك كانت «${selected}»، والصحيح هو «${correct}».`,
      explanationEn:
        `“${correct}” is the grammatically correct choice for this sentence. ${focus.en}`,
      explanationAr:
        `«${correct}» هي الصيغة الصحيحة نحويًا في هذه الجملة. ${focus.ar}`,
      tipEn: "Read the whole sentence once with the correct answer, then identify the signal word or structure that makes it correct.",
      tipAr: "اقرأ الجملة كاملة بالإجابة الصحيحة، ثم حدد الكلمة أو التركيب الذي دل على هذه الإجابة.",
    };
  }

  if (skill === "vocabulary") {
    return {
      ...item,
      correctionEn:
        selected === "No answer"
          ? `No answer was selected. The correct choice is “${correct}”.`
          : `You selected “${selected}”. The correct choice is “${correct}”.`,
      correctionAr:
        selected === "No answer"
          ? `لم تختر إجابة. الاختيار الصحيح هو «${correct}».`
          : `اخترت «${selected}»، بينما الاختيار الصحيح هو «${correct}».`,
      explanationEn:
        `“${correct}” best matches the meaning and natural word combination required by the sentence. Vocabulary questions should be solved from context, not from the word alone.`,
      explanationAr:
        `«${correct}» هي الأنسب لمعنى الجملة وللتعبير الطبيعي المستخدم معها. أسئلة المفردات تحل من السياق وليس من معنى الكلمة منفردة فقط.`,
      tipEn: "Re-read the sentence before and after the blank and learn the target word as a phrase or collocation.",
      tipAr: "أعد قراءة الجملة حول الفراغ واحفظ الكلمة ضمن عبارة أو تركيب ثابت وليس بشكل منفرد.",
    };
  }

  if (skill === "reading") {
    const passage = item.passage?.title ? ` in “${item.passage.title}”` : "";
    const passageAr = item.passage?.title ? ` في قطعة «${item.passage.title}»` : "";
    return {
      ...item,
      correctionEn:
        selected === "No answer"
          ? `No answer was selected. The correct answer is “${correct}”.`
          : `You selected “${selected}”. The correct answer is “${correct}”.`,
      correctionAr:
        selected === "No answer"
          ? `لم تختر إجابة. الإجابة الصحيحة هي «${correct}».`
          : `اخترت «${selected}»، بينما الإجابة الصحيحة هي «${correct}».`,
      explanationEn:
        `The correct answer is supported by the information or inference${passage}. Return to the relevant sentence, identify the key idea, then compare each option with the text.`,
      explanationAr:
        `الإجابة الصحيحة مدعومة بمعلومة صريحة أو استنتاج${passageAr}. ارجع إلى الجملة المرتبطة بالسؤال وحدد الفكرة الأساسية ثم قارن كل خيار بالنص.`,
      tipEn: "For reading questions, prove the answer from the passage before choosing it. Eliminate options that add information not stated or implied.",
      tipAr: "في أسئلة القراءة أثبت الإجابة من القطعة قبل اختيارها، واستبعد الخيارات التي تضيف معلومات غير مذكورة أو غير مستنتجة من النص.",
    };
  }

  return {
    ...item,
    correctionEn: `The correct answer is “${correct}”.`,
    correctionAr: `الإجابة الصحيحة هي «${correct}».`,
    explanationEn: "Review the wording of the question and compare your answer with the correct response.",
    explanationAr: "راجع صياغة السؤال وقارن إجابتك بالإجابة الصحيحة.",
    tipEn: "Try the item again after reviewing the rule or context.",
    tipAr: "أعد محاولة السؤال بعد مراجعة القاعدة أو السياق.",
  };
}

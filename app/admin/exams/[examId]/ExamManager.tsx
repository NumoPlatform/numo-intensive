"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CopyPlus,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { intensiveFetch } from "@/lib/intensive/client";

type Exam = {
  id: string;
  course_id: string;
  title: string;
  category: string;
  description: string | null;
  instructions: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  attempts_allowed: number;
  total_marks: number;
  passing_score: number | null;
  status: string;
  result_release: string;
};
type Section = {
  id: string;
  exam_id: string;
  title: string;
  position: number;
  marks: number;
  question_count: number | null;
};
type Option = {
  id?: string;
  label: string;
  value?: string;
  is_correct?: boolean;
  isCorrect?: boolean;
  position?: number;
};
type ManagedQuestion = {
  id: string;
  question_id: string;
  section_id: string;
  skill: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  prompt: string;
  mappingMarks: number;
  passage: { id: string; title: string; body: string } | null;
  grading_mode: "AUTO" | "MANUAL";
  acceptable_answers: string[];
  correct_boolean: boolean | null;
  options: Option[];
};
type ExamSettings = {
  title: string;
  category: string;
  description: string;
  instructions: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: string;
  attemptsAllowed: string;
  passingScore: string;
  resultRelease: string;
};

type EditState = {
  prompt: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  marks: string;
  passageTitle: string;
  passageBody: string;
  gradingMode: "AUTO" | "MANUAL";
  acceptableAnswers: string;
  correctBoolean: boolean;
  options: Array<{ label: string; isCorrect: boolean }>;
};

function toRiyadhInput(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day") + "T" + get("hour") + ":" + get("minute");
}

function riyadhInputToIso(value: string) {
  return new Date(value + ":00+03:00").toISOString();
}

function examToSettings(exam: Exam): ExamSettings {
  return {
    title: exam.title,
    category: exam.category,
    description: exam.description ?? "",
    instructions: exam.instructions,
    startsAt: toRiyadhInput(exam.starts_at),
    endsAt: toRiyadhInput(exam.ends_at),
    durationMinutes: String(exam.duration_minutes),
    attemptsAllowed: String(exam.attempts_allowed),
    passingScore: exam.passing_score === null ? "" : String(exam.passing_score),
    resultRelease: exam.result_release,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

function makeEdit(question: ManagedQuestion): EditState {
  return {
    prompt: question.prompt,
    difficulty: question.difficulty,
    marks: String(question.mappingMarks),
    passageTitle: question.passage?.title ?? "",
    passageBody: question.passage?.body ?? "",
    gradingMode: question.grading_mode,
    acceptableAnswers: (question.acceptable_answers ?? []).join("\n"),
    correctBoolean: question.correct_boolean ?? true,
    options: question.options.length
      ? question.options.map((item) => ({
          label: item.label,
          isCorrect: Boolean(item.is_correct ?? item.isCorrect),
        }))
      : [
          { label: "", isCorrect: true },
          { label: "", isCorrect: false },
        ],
  };
}

export default function ExamManager() {
  const params = useParams<{ examId: string }>();
  const examId = String(params?.examId ?? "");
  const [exam, setExam] = useState<Exam | null>(null);
  const [examSettings, setExamSettings] = useState<ExamSettings | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<ManagedQuestion[]>([]);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function load() {
    const [overviewResponse, questionResponse] = await Promise.all([
      intensiveFetch("/api/admin/overview", { cache: "no-store" }),
      intensiveFetch("/api/admin/question-manage?examId=" + encodeURIComponent(examId), {
        cache: "no-store",
      }),
    ]);

    if (overviewResponse.status === 401 || overviewResponse.status === 403) {
      window.location.replace("/");
      return;
    }

    const overview = await overviewResponse.json();
    const questionPayload = await questionResponse.json();
    if (!overviewResponse.ok) throw new Error(overview.message || "تعذر تحميل الاختبار.");
    if (!questionResponse.ok) throw new Error(questionPayload.message || "تعذر تحميل الأسئلة.");

    const found = (overview.exams as Exam[]).find((item) => item.id === examId) ?? null;
    setExam(found);
    setExamSettings(found ? examToSettings(found) : null);
    setSections((overview.sections as Section[]).filter((item) => item.exam_id === examId));
    const list = (questionPayload.questions ?? []) as ManagedQuestion[];
    setQuestions(list);
    setEdits(Object.fromEntries(list.map((question) => [question.question_id, makeEdit(question)])));
    setLoading(false);
  }

  useEffect(() => {
    if (examId) {
      load().catch((error) => {
        setNotice(error instanceof Error ? error.message : "تعذر تحميل الاختبار.");
        setLoading(false);
      });
    }
  }, [examId]);

  const sectionMap = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );

  async function saveQuestion(question: ManagedQuestion) {
    const edit = edits[question.question_id];
    if (!edit) return;
    setWorking(question.question_id);
    setNotice("");
    try {
      const response = await intensiveFetch("/api/admin/question-manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          questionId: question.question_id,
          prompt: edit.prompt,
          difficulty: edit.difficulty,
          marks: Number(edit.marks),
          options: edit.options,
          correctBoolean: edit.correctBoolean,
          acceptableAnswers: edit.acceptableAnswers
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          gradingMode: edit.gradingMode,
          passageTitle: edit.passageTitle,
          passageBody: edit.passageBody,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر حفظ السؤال.");
      setNotice("تم تحديث السؤال وإعادة احتساب درجات الاختبار.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ السؤال.");
    } finally {
      setWorking(null);
    }
  }

  async function deleteQuestion(question: ManagedQuestion) {
    if (!window.confirm("هل تريد إزالة هذا السؤال من الاختبار؟")) return;
    setWorking(question.question_id);
    setNotice("");
    const response = await intensiveFetch("/api/admin/question-manage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, questionId: question.question_id }),
    });
    const payload = await response.json();
    setNotice(response.ok ? "تمت إزالة السؤال وإعادة احتساب الدرجات." : payload.message || "تعذر إزالة السؤال.");
    if (response.ok) await load();
    setWorking(null);
  }

  async function saveExamSettings() {
    if (!exam || !examSettings) return;
    setWorking("settings");
    setNotice("");
    try {
      const response = await intensiveFetch("/api/admin/exam-manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          title: examSettings.title,
          category: examSettings.category,
          description: examSettings.description,
          instructions: examSettings.instructions,
          startsAt: riyadhInputToIso(examSettings.startsAt),
          endsAt: riyadhInputToIso(examSettings.endsAt),
          durationMinutes: Number(examSettings.durationMinutes),
          attemptsAllowed: Number(examSettings.attemptsAllowed),
          passingScore: examSettings.passingScore === "" ? null : Number(examSettings.passingScore),
          resultRelease: examSettings.resultRelease,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر حفظ إعدادات الاختبار.");
      setNotice("تم تحديث إعدادات الاختبار بنجاح.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ إعدادات الاختبار.");
    } finally {
      setWorking(null);
    }
  }

  async function duplicateExam() {
    if (!exam) return;

    const title = window.prompt("اكتب اسم الاختبار المنسوخ.", exam.title + " Copy")?.trim();
    if (!title) return;

    const shiftMs = 7 * 24 * 60 * 60 * 1000;
    const startsAt = new Date(new Date(exam.starts_at).getTime() + shiftMs).toISOString();
    const endsAt = new Date(new Date(exam.ends_at).getTime() + shiftMs).toISOString();

    setWorking("duplicate");
    setNotice("");
    try {
      const response = await intensiveFetch("/api/admin/exam-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          title,
          startsAt,
          endsAt,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر نسخ الاختبار.");
      window.location.assign("/admin/exams/" + payload.examId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر نسخ الاختبار.");
      setWorking(null);
    }
  }

  async function toggleArchive() {
    if (!exam) return;
    const action = exam.status === "ARCHIVED" ? "RESTORE" : "ARCHIVE";
    if (action === "ARCHIVE" && !window.confirm("هل تريد أرشفة الاختبار؟ سيختفي عن الطلاب أثناء الأرشفة.")) return;
    setWorking("exam");
    const response = await intensiveFetch("/api/admin/exam-manage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, action }),
    });
    const payload = await response.json();
    setNotice(response.ok ? (action === "ARCHIVE" ? "تمت أرشفة الاختبار." : "تمت استعادة الاختبار.") : payload.message || "تعذر تحديث الاختبار.");
    if (response.ok) await load();
    setWorking(null);
  }

  function updateEdit(questionId: string, patch: Partial<EditState>) {
    setEdits((current) => ({
      ...current,
      [questionId]: { ...current[questionId], ...patch },
    }));
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-[#1F2B5E]">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] px-4 py-10 text-[#1F2B5E]">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <strong>لم يتم العثور على الاختبار.</strong>
          <a href="/admin" className="btn mt-5">العودة للوحة المدير</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] px-4 py-7 text-[#1F2B5E] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/admin" className="inline-flex items-center gap-2 text-sm font-black text-[#73788d]">
            <ArrowRight size={17} /> العودة للوحة المدير
          </a>
          <div className="flex items-center gap-2">
            <a href="/admin/question-bank" className="rounded-xl border border-[#ddd8e5] bg-white px-4 py-2 text-xs font-black shadow-sm">بنك الأسئلة</a>
            <a href="/admin/exams/new" className="rounded-xl bg-[#1F2B5E] px-4 py-2 text-xs font-black text-white shadow-sm">اختبار جديد</a>
            <img src="/icon.svg" alt="شعار منصة نمو" className="h-10 w-10 rounded-xl bg-[#1F2B5E] p-1.5" />
          </div>
        </div>

        <header className="mb-6 rounded-[1.8rem] bg-gradient-to-l from-[#1F2B5E] via-[#2c3d7e] to-[#6366F1] p-7 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-[#e9c0ab]">{exam.category}</div>
              <h1 dir="ltr" className="mt-1 text-3xl font-black">{exam.title}</h1>
              <div className="mt-2 text-sm text-white/70">
                {formatDate(exam.starts_at)} — {formatDate(exam.ends_at)} · {exam.duration_minutes} دقيقة
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                <div className="text-2xl font-black">{exam.total_marks}</div>
                <div className="text-xs text-white/65">الدرجات</div>
              </div>
              <button
                onClick={duplicateExam}
                disabled={working === "duplicate"}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-black"
              >
                {working === "duplicate" ? <Loader2 size={17} className="animate-spin" /> : <CopyPlus size={17} />}
                نسخ الاختبار
              </button>
              <button
                onClick={toggleArchive}
                disabled={working === "exam"}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-black"
              >
                {working === "exam" ? <Loader2 size={17} className="animate-spin" /> : exam.status === "ARCHIVED" ? <RotateCcw size={17} /> : <Archive size={17} />}
                {exam.status === "ARCHIVED" ? "استعادة" : "أرشفة"}
              </button>
            </div>
          </div>
        </header>

        {notice ? (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#e1dce7] bg-white p-4 text-sm font-bold">
            <CheckCircle2 size={18} className="text-emerald-600" />
            {notice}
          </div>
        ) : null}

        {examSettings ? (
          <section className="mb-6 rounded-[1.6rem] border border-[#e2dfe8] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-black">إعدادات الاختبار</h2>
              <p className="mt-1 text-sm text-[#777b8d]">
                جميع الأوقات بتوقيت الرياض. يتم قفل إعدادات الوقت والهيكل بعد بدء أي محاولة.
                عند نسخ الاختبار تُنشأ نسخة كمسودة مع جميع الأقسام والأسئلة.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black">اسم الاختبار</span>
                <input
                  className="field"
                  value={examSettings.title}
                  onChange={(e)=>setExamSettings({...examSettings,title:e.target.value})}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">تصنيف الاختبار</span>
                <select
                  className="field"
                  value={examSettings.category}
                  onChange={(e)=>setExamSettings({...examSettings,category:e.target.value})}
                >
                  {["QUIZ 1","QUIZ 2","MIDTERM","FINAL","MOCK EXAM","PRACTICE EXAM","CUSTOM"].map((item)=>(
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">يفتح في</span>
                <input
                  className="field"
                  type="datetime-local"
                  value={examSettings.startsAt}
                  onChange={(e)=>setExamSettings({...examSettings,startsAt:e.target.value})}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">يغلق في</span>
                <input
                  className="field"
                  type="datetime-local"
                  value={examSettings.endsAt}
                  onChange={(e)=>setExamSettings({...examSettings,endsAt:e.target.value})}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-2 block text-sm font-black">المدة الإجمالية بالدقائق</span>
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={480}
                  value={examSettings.durationMinutes}
                  onChange={(e)=>setExamSettings({...examSettings,durationMinutes:e.target.value})}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">عدد المحاولات</span>
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={20}
                  value={examSettings.attemptsAllowed}
                  onChange={(e)=>setExamSettings({...examSettings,attemptsAllowed:e.target.value})}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">درجة النجاح</span>
                <input
                  className="field"
                  type="number"
                  min={0}
                  max={exam.total_marks}
                  step={0.25}
                  placeholder="اختياري"
                  value={examSettings.passingScore}
                  onChange={(e)=>setExamSettings({...examSettings,passingScore:e.target.value})}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">إظهار النتيجة</span>
                <select
                  className="field"
                  value={examSettings.resultRelease}
                  onChange={(e)=>setExamSettings({...examSettings,resultRelease:e.target.value})}
                >
                  <option value="IMMEDIATE">مباشرة بعد اكتمال التصحيح</option>
                  <option value="AFTER_END">بعد إغلاق الاختبار</option>
                  <option value="MANUAL">يدويا من المدير</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-black">الوصف</span>
              <textarea
                className="field min-h-20"
                value={examSettings.description}
                onChange={(e)=>setExamSettings({...examSettings,description:e.target.value})}
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-black">تعليمات الطالب</span>
              <textarea
                dir="ltr" className="field min-h-24 text-left"
                value={examSettings.instructions}
                onChange={(e)=>setExamSettings({...examSettings,instructions:e.target.value})}
              />
            </label>

            <button
              onClick={saveExamSettings}
              disabled={working === "settings"}
              className="btn mt-5"
            >
              {working === "settings" ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              حفظ إعدادات الاختبار
            </button>
          </section>
        ) : null}

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          {sections.map((section) => (
            <div key={section.id} className="rounded-2xl border border-[#e4e0e8] bg-white p-4 shadow-sm">
              <div className="text-xs font-black text-[#B1785C]">القسم {section.position}</div>
              <div className="mt-1 font-black">{section.title}</div>
              <div className="mt-2 text-sm text-[#777b8d]">{section.question_count || 0} سؤال · {section.marks} درجة</div>
            </div>
          ))}
        </section>

        <div className="space-y-5">
          {questions.map((question, index) => {
            const edit = edits[question.question_id];
            if (!edit) return null;
            return (
              <article key={question.question_id} className="rounded-[1.6rem] border border-[#e2dfe8] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-[#B1785C]">
                      السؤال {index + 1} · {sectionMap.get(question.section_id)?.title ?? question.skill}
                    </div>
                    <div className="mt-1 text-sm font-black text-[#777b8d]">
                      {question.type === "MULTIPLE_CHOICE" ? "اختيار من متعدد" : question.type === "TRUE_FALSE" ? "صح / خطأ" : "إجابة كتابية"}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteQuestion(question)}
                    disabled={working === question.question_id}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-black text-rose-700"
                  >
                    <Trash2 size={16} /> إزالة
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_150px_170px]">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black">نص السؤال</span>
                    <textarea
                      dir="auto" className="field min-h-28"
                      value={edit.prompt}
                      onChange={(e)=>updateEdit(question.question_id,{prompt:e.target.value})}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-black">الدرجة</span>
                    <input
                      className="field"
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={edit.marks}
                      onChange={(e)=>updateEdit(question.question_id,{marks:e.target.value})}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-black">الصعوبة</span>
                    <select
                      className="field"
                      value={edit.difficulty}
                      onChange={(e)=>updateEdit(question.question_id,{difficulty:e.target.value as EditState["difficulty"]})}
                    >
                      <option value="EASY">سهل</option>
                      <option value="MEDIUM">متوسط</option>
                      <option value="HARD">صعب</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-2xl border border-[#e8e4ed] bg-[#faf9fb] p-4">
                  <div className="mb-3 text-sm font-black">قطعة قراءة اختيارية</div>
                  <input
                    className="field mb-3"
                    placeholder="عنوان القطعة"
                    value={edit.passageTitle}
                    onChange={(e)=>updateEdit(question.question_id,{passageTitle:e.target.value})}
                  />
                  <textarea
                    className="field min-h-28"
                    placeholder="نص القطعة"
                    value={edit.passageBody}
                    onChange={(e)=>updateEdit(question.question_id,{passageBody:e.target.value})}
                  />
                </div>

                {question.type === "MULTIPLE_CHOICE" ? (
                  <div className="mt-4">
                    <div className="mb-2 text-sm font-black">الخيارات — حدد الإجابة الصحيحة</div>
                    <div className="space-y-2">
                      {edit.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={"correct-" + question.question_id}
                            checked={option.isCorrect}
                            onChange={() =>
                              updateEdit(question.question_id, {
                                options: edit.options.map((item, i) => ({ ...item, isCorrect: i === optionIndex })),
                              })
                            }
                          />
                          <input
                            className="field"
                            value={option.label}
                            onChange={(e) =>
                              updateEdit(question.question_id, {
                                options: edit.options.map((item, i) => i === optionIndex ? { ...item, label: e.target.value } : item),
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {question.type === "TRUE_FALSE" ? (
                  <div className="mt-4 rounded-2xl border border-[#e8e4ed] p-4">
                    <div className="mb-3 text-sm font-black">الإجابة الصحيحة</div>
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={edit.correctBoolean === true} onChange={()=>updateEdit(question.question_id,{correctBoolean:true})} />
                        صح
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={edit.correctBoolean === false} onChange={()=>updateEdit(question.question_id,{correctBoolean:false})} />
                        خطأ
                      </label>
                    </div>
                  </div>
                ) : null}

                {question.type === "SHORT_ANSWER" ? (
                  <div className="mt-4 rounded-2xl border border-[#e8e4ed] p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-black">طريقة التصحيح</span>
                      <select
                        className="field"
                        value={edit.gradingMode}
                        onChange={(e)=>updateEdit(question.question_id,{gradingMode:e.target.value as "AUTO" | "MANUAL"})}
                      >
                        <option value="AUTO">تلقائي</option>
                        <option value="MANUAL">يدوي</option>
                      </select>
                    </label>
                    {edit.gradingMode === "AUTO" ? (
                      <label className="mt-3 block">
                        <span className="mb-2 block text-sm font-black">الإجابات المقبولة — إجابة واحدة في كل سطر</span>
                        <textarea
                          className="field min-h-28"
                          value={edit.acceptableAnswers}
                          onChange={(e)=>updateEdit(question.question_id,{acceptableAnswers:e.target.value})}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}

                <button
                  onClick={() => saveQuestion(question)}
                  disabled={working === question.question_id}
                  className="btn mt-5"
                >
                  {working === question.question_id ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                  حفظ تعديلات السؤال
                </button>
              </article>
            );
          })}

          {questions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#d6d0de] bg-white p-10 text-center">
              <RefreshCw className="mx-auto mb-3 text-[#B1785C]" />
              <div className="font-black">لم تتم إضافة أسئلة إلى هذا الاختبار حتى الآن.</div>
              <a href="/admin" className="btn mt-5">العودة لمنشئ الأسئلة</a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

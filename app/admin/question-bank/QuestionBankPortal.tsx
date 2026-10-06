"use client";

import NumoBrand from "@/app/components/NumoBrand";
import { useEffect, useMemo, useState } from "react";
import { intensiveFetch } from "@/lib/intensive/client";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Filter,
  Layers3,
  LibraryBig,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

type Course = { id: string; code: string; title: string; is_active: boolean };
type Exam = { id: string; course_id: string; title: string; category: string; status: string };
type Section = { id: string; exam_id: string; title: string; position: number };
type Option = { id: string; question_id: string; label: string; value: string; is_correct: boolean; position: number };
type Usage = { exam_id: string; section_id: string; question_id: string; marks: number; position: number };
type Question = {
  id: string;
  course_id: string;
  exam_category: string | null;
  skill: string;
  type: string;
  difficulty: string;
  prompt: string;
  passage_id: string | null;
  grading_mode: string;
  acceptable_answers: string[];
  correct_boolean: boolean | null;
  marks: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
  options: Option[];
  passage: { id: string; title: string; body: string } | null;
  usages: Usage[];
};
type BankPayload = {
  courses: Course[];
  exams: Exam[];
  sections: Section[];
  questions: Question[];
};

type AttachState = { examId: string; sectionId: string; marks: string };

const typeLabel: Record<string, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدد",
  TRUE_FALSE: "صح / خطأ",
  SHORT_ANSWER: "إجابة كتابية",
};

function shortText(value: string, max = 220) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? compact.slice(0, max).trimEnd() + "…" : compact;
}

export default function QuestionBankPortal() {
  const [data, setData] = useState<BankPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [skill, setSkill] = useState("");
  const [attach, setAttach] = useState<Record<string, AttachState>>({});

  async function load() {
    setLoading(true);
    try {
      const response = await intensiveFetch("/api/admin/question-bank", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        window.location.replace("/");
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر تحميل بنك الأسئلة.");
      setData(payload);
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر تحميل بنك الأسئلة.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const courseMap = useMemo(
    () => new Map((data?.courses ?? []).map((course) => [course.id, course])),
    [data],
  );
  const examMap = useMemo(
    () => new Map((data?.exams ?? []).map((exam) => [exam.id, exam])),
    [data],
  );

  const skills = useMemo(
    () => [...new Set((data?.questions ?? []).map((question) => question.skill).filter(Boolean))].sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.questions ?? []).filter((question) => {
      if (courseId && question.course_id !== courseId) return false;
      if (type && question.type !== type) return false;
      if (difficulty && question.difficulty !== difficulty) return false;
      if (skill && question.skill !== skill) return false;
      if (
        query &&
        ![
          question.prompt,
          question.skill,
          question.exam_category ?? "",
          question.passage?.title ?? "",
          ...(question.tags ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ) return false;
      return true;
    });
  }, [data, courseId, type, difficulty, skill, search]);

  function stateFor(question: Question): AttachState {
    return attach[question.id] ?? {
      examId: "",
      sectionId: "",
      marks: String(question.marks),
    };
  }

  function patchAttach(questionId: string, patch: Partial<AttachState>) {
    const question = data?.questions.find((item) => item.id === questionId);
    if (!question) return;
    const current = stateFor(question);
    setAttach((items) => ({ ...items, [questionId]: { ...current, ...patch } }));
  }

  async function attachQuestion(question: Question) {
    const current = stateFor(question);
    if (!current.examId || !current.sectionId) {
      setNotice({ type: "error", text: "اختر الاختبار والقسم أولا." });
      return;
    }

    setWorking(question.id);
    setNotice(null);
    try {
      const response = await intensiveFetch("/api/admin/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          examId: current.examId,
          sectionId: current.sectionId,
          marks: current.marks ? Number(current.marks) : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر إعادة استخدام هذا السؤال.");
      setNotice({ type: "success", text: "تمت إضافة السؤال إلى الاختبار المحدد من بنك الأسئلة." });
      await load();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر إعادة استخدام هذا السؤال.",
      });
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="admin-shell min-h-screen overflow-x-hidden bg-[#f5f6fa] px-3 py-4 text-[#1F2B5E] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/admin" className="inline-flex items-center gap-2 text-sm font-black text-[#73788d]">
            <ArrowLeft size={17} /> العودة للوحة المدير
          </a>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#ddd8e5] bg-white px-4 py-2 text-sm font-black shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> تحديث البنك
          </button>
        </div>

        <header className="relative mb-7 overflow-hidden rounded-[1.9rem] bg-gradient-to-br from-[#1F2B5E] via-[#2c3d7e] to-[#6366F1] p-5 text-white sm:p-7 shadow-[0_24px_70px_rgba(31,43,94,.22)] sm:p-8">
          <div className="absolute left-5 top-5 hidden sm:block">
            <NumoBrand className="w-20" inverse />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[#efc8b4]">
                <Sparkles size={16} /> NUMO INTENSIVE
              </div>
              <h1 className="text-2xl font-black sm:text-3xl sm:text-4xl">بنك الأسئلة</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">
                ابحث في جميع الأسئلة، راجع مفتاح الإجابة، وأعد استخدام السؤال في أي اختبار للمقرر نفسه دون إعادة كتابته.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
              <div className="text-2xl font-black sm:text-3xl">{data?.questions.length ?? 0}</div>
              <div className="text-xs font-bold text-white/65">سؤال في البنك</div>
            </div>
          </div>
        </header>

        {notice ? (
          <div
            className={
              "mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold " +
              (notice.type === "success"
                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                : "border-rose-100 bg-rose-50 text-rose-800")
            }
          >
            {notice.type === "success" ? <CheckCircle2 size={19} /> : <CircleHelp size={19} />}
            <span>{notice.text}</span>
          </div>
        ) : null}

        <section className="mb-6 rounded-[1.6rem] border border-[#e2dfe8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-[#B1785C]" />
            <h2 className="font-black">البحث والتصفية</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative block xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#969aac]" size={18} />
              <input
                className="field pl-10"
                placeholder="ابحث في نص السؤال أو القطعة أو الوسم"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select className="field" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="">كل المواد</option>
              {(data?.courses ?? []).map((course) => (
                <option key={course.id} value={course.id}>{course.code}</option>
              ))}
            </select>
            <select className="field" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">كل أنواع الأسئلة</option>
              <option value="MULTIPLE_CHOICE">اختيار من متعدد</option>
              <option value="TRUE_FALSE">صح / خطأ</option>
              <option value="SHORT_ANSWER">إجابة كتابية</option>
            </select>
            <select className="field" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="">كل مستويات الصعوبة</option>
              <option value="EASY">سهل</option>
              <option value="MEDIUM">متوسط</option>
              <option value="HARD">صعب</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSkill("")}
              className={"rounded-full px-3 py-1.5 text-xs font-black " + (!skill ? "bg-[#1F2B5E] text-white" : "bg-[#f3f1f6] text-[#686e84]")}
            >
              كل الأقسام
            </button>
            {skills.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSkill(item)}
                className={"rounded-full px-3 py-1.5 text-xs font-black " + (skill === item ? "bg-[#1F2B5E] text-white" : "bg-[#f3f1f6] text-[#686e84]")}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {loading && !data ? (
          <div className="grid min-h-80 place-items-center rounded-[1.7rem] border border-[#e2dfe8] bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 animate-spin" />
              <div className="font-black">جاري تحميل بنك الأسئلة...</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 text-sm text-[#777b8d]">
              <span><strong className="text-[#1F2B5E]">{filtered.length}</strong> سؤال مطابق</span>
              <span>إعادة استخدام داخل المقرر</span>
            </div>

            {filtered.map((question) => {
              const course = courseMap.get(question.course_id);
              const current = stateFor(question);
              const availableExams = (data?.exams ?? []).filter(
                (exam) => exam.course_id === question.course_id && exam.status !== "ARCHIVED",
              );
              const availableSections = (data?.sections ?? []).filter(
                (section) => section.exam_id === current.examId,
              );

              return (
                <article key={question.id} className="rounded-[1.55rem] border border-[#e2dfe8] bg-white p-5 shadow-sm sm:p-6">
                  <div className="grid gap-6 xl:grid-cols-[1fr_370px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#1F2B5E] px-3 py-1 text-[11px] font-black text-white">{course?.code ?? "—"}</span>
                        <span className="rounded-full bg-[#f8f0ec] px-3 py-1 text-[11px] font-black text-[#9a6249]">{question.skill}</span>
                        <span className="rounded-full bg-[#f2f1ff] px-3 py-1 text-[11px] font-black text-[#5559ca]">{typeLabel[question.type] ?? question.type}</span>
                        <span className="rounded-full bg-[#f4f3f7] px-3 py-1 text-[11px] font-black text-[#6f7486]">{question.difficulty}</span>
                        {!question.is_active ? <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700">INACTIVE</span> : null}
                      </div>

                      {question.passage ? (
                        <div className="mt-4 rounded-2xl border border-[#eee7e3] bg-[#fdf9f7] p-4">
                          <div className="flex items-center gap-2 text-xs font-black text-[#9a6249]">
                            <BookOpenCheck size={15} /> قطعة قراءة · {question.passage.title}
                          </div>
                          <p dir="ltr" className="mt-2 text-left text-sm leading-7 text-[#686e82]">{shortText(question.passage.body, 280)}</p>
                        </div>
                      ) : null}

                      <div dir="ltr" className="mt-4 whitespace-pre-wrap text-left text-base font-black leading-8">{question.prompt}</div>

                      {question.type === "MULTIPLE_CHOICE" ? (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {question.options.map((option) => (
                            <div
                              key={option.id}
                              className={
                                "rounded-xl border px-3 py-2 text-sm " +
                                (option.is_correct
                                  ? "border-emerald-200 bg-emerald-50 font-black text-emerald-800"
                                  : "border-[#ebe7ef] bg-[#faf9fb] text-[#646a7d]")
                              }
                            >
                              {option.position}. {option.label}
                              {option.is_correct ? " ✓" : ""}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {question.type === "TRUE_FALSE" ? (
                        <div className="mt-4 inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">
                          الإجابة الصحيحة: {question.correct_boolean ? "صح" : "خطأ"}
                        </div>
                      ) : null}

                      {question.type === "SHORT_ANSWER" ? (
                        <div className="mt-4 rounded-xl bg-[#f8f7fa] px-4 py-3 text-sm text-[#676d81]">
                          <strong>التصحيح:</strong> {question.grading_mode === "MANUAL" ? "يدوي" : "تلقائي"}
                          {question.grading_mode === "AUTO" && question.acceptable_answers.length
                            ? " · الإجابات المقبولة: " + question.acceptable_answers.join(", ")
                            : ""}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap gap-4 text-xs text-[#7b8092]">
                        <span><strong className="text-[#1F2B5E]">{question.marks}</strong> درجة افتراضية</span>
                        <span><strong className="text-[#1F2B5E]">{question.usages.length}</strong> استخدام في الاختبارات</span>
                        {question.exam_category ? <span>أنشئ لـ <strong className="text-[#1F2B5E]">{question.exam_category}</strong></span> : null}
                      </div>

                      {question.usages.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {question.usages.slice(0, 6).map((usage, index) => {
                            const exam = examMap.get(usage.exam_id);
                            return (
                              <span key={usage.exam_id + usage.section_id + index} className="rounded-lg border border-[#ebe7ef] bg-[#faf9fb] px-2.5 py-1 text-[11px] font-bold text-[#707588]">
                                {exam?.title ?? "اختبار"} · {usage.marks} درجة
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <aside className="rounded-2xl border border-[#e7e3eb] bg-[#faf9fc] p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <Layers3 size={17} className="text-[#6366F1]" />
                        <div>
                          <div className="text-sm font-black">إعادة استخدام في اختبار</div>
                          <div className="text-xs text-[#808597]">اختبارات المقرر نفسه فقط</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-black text-[#707588]">الاختبار</span>
                          <select
                            className="field"
                            value={current.examId}
                            disabled={!question.is_active}
                            onChange={(event) => patchAttach(question.id, { examId: event.target.value, sectionId: "" })}
                          >
                            <option value="">Select an exam</option>
                            {availableExams.map((exam) => (
                              <option key={exam.id} value={exam.id}>{exam.category} — {exam.title}</option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-xs font-black text-[#707588]">Section / skill</span>
                          <select
                            className="field"
                            value={current.sectionId}
                            disabled={!current.examId || !question.is_active}
                            onChange={(event) => patchAttach(question.id, { sectionId: event.target.value })}
                          >
                            <option value="">Select a section</option>
                            {availableSections.map((section) => (
                              <option key={section.id} value={section.id}>{section.position}. {section.title}</option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-xs font-black text-[#707588]">Marks in this exam</span>
                          <input
                            className="field"
                            type="number"
                            min={0.25}
                            step={0.25}
                            value={current.marks}
                            disabled={!question.is_active}
                            onChange={(event) => patchAttach(question.id, { marks: event.target.value })}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => attachQuestion(question)}
                          disabled={!question.is_active || working === question.id || !current.examId || !current.sectionId}
                          className="btn w-full"
                        >
                          {working === question.id ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                          Add from question bank
                        </button>
                      </div>
                    </aside>
                  </div>
                </article>
              );
            })}

            {!filtered.length ? (
              <div className="rounded-[1.7rem] border border-dashed border-[#d7d2df] bg-white p-12 text-center">
                <LibraryBig className="mx-auto mb-4 text-[#B1785C]" size={40} />
                <h2 className="text-xl font-black">No questions match these filters</h2>
                <p className="mt-2 text-sm text-[#777b8d]">Clear one or more filters, or create questions from the exam builder.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

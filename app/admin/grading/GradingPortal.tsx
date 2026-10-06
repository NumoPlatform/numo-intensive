"use client";

import { useEffect, useState } from "react";
import { intensiveFetch } from "@/lib/intensive/client";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";

type PendingEntry = {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: unknown;
  admin_feedback: string | null;
  saved_at: string;
  maxMarks: number;
  question: { id: string; prompt: string; type: string; skill: string } | null;
  student: { id: string; full_name: string; username: string } | null;
  exam: { id: string; title: string; category: string; course_id: string } | null;
  attemptNumber: number | null;
};

type UnpublishedResult = {
  attempt_id: string;
  final_score: number | null;
  total_marks: number;
  percentage: number | null;
  status: string | null;
  student: { full_name: string; username: string } | null;
  exam: { title: string; category: string } | null;
};

export default function GradingPortal() {
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [results, setResults] = useState<UnpublishedResult[]>([]);
  const [grades, setGrades] = useState<Record<string, { score: string; feedback: string; publish: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function load() {
    const [gradingResponse, resultsResponse] = await Promise.all([
      intensiveFetch("/api/admin/grading", { cache: "no-store" }),
      intensiveFetch("/api/admin/results", { cache: "no-store" }),
    ]);

    if (gradingResponse.status === 401 || gradingResponse.status === 403) {
      window.location.replace("/");
      return;
    }

    const gradingPayload = await gradingResponse.json();
    const resultsPayload = await resultsResponse.json();
    if (!gradingResponse.ok) throw new Error(gradingPayload.message || "تعذر تحميل بيانات التصحيح.");

    setPending(gradingPayload.entries ?? []);
    setResults(resultsResponse.ok ? resultsPayload.results ?? [] : []);
    setGrades((current) => {
      const next = { ...current };
      for (const entry of gradingPayload.entries ?? []) {
        if (!next[entry.id]) next[entry.id] = { score: "", feedback: "", publish: false };
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setNotice("تعذر تحميل قائمة التصحيح.");
      setLoading(false);
    });
  }, []);

  async function saveGrade(entry: PendingEntry) {
    const grade = grades[entry.id] ?? { score: "", feedback: "", publish: false };
    setWorking(entry.id);
    setNotice("");
    try {
      const response = await intensiveFetch("/api/admin/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerId: entry.id,
          score: Number(grade.score),
          feedback: grade.feedback,
          publishWhenComplete: grade.publish,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر حفظ الدرجة.");
      setNotice("تم حفظ الدرجة بنجاح.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ الدرجة.");
    } finally {
      setWorking(null);
    }
  }

  async function publish(attemptId: string) {
    setWorking(attemptId);
    setNotice("");
    const response = await intensiveFetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId }),
    });
    const payload = await response.json();
    setNotice(response.ok ? "تم نشر النتيجة للطالب." : payload.message || "تعذر نشر النتيجة.");
    if (response.ok) await load();
    setWorking(null);
  }

  return (
    <div className="admin-shell min-h-screen overflow-x-hidden bg-[#f5f6fa] px-3 py-4 text-[#1F2B5E] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-[#73788d]">
          <ArrowRight size={17} /> Back to admin dashboard
        </a>

        <header className="mb-7 overflow-hidden rounded-[1.5rem] sm:rounded-[1.8rem] bg-gradient-to-l from-[#1F2B5E] via-[#2c3d7e] to-[#6366F1] p-5 text-white sm:p-7 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[#e9c0ab]">
                <Sparkles size={16} /> NUMO INTENSIVE
              </div>
              <h1 className="text-2xl font-black sm:text-3xl">Grading & Results</h1>
              <p className="mt-2 text-sm leading-7 text-white/70">Grade written answers and publish completed results.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center">
              <div className="text-2xl font-black sm:text-3xl">{pending.length}</div>
              <div className="text-xs text-white/65">Answers awaiting grading</div>
            </div>
          </div>
        </header>

        {notice ? <div className="mb-5 rounded-xl border border-[#e1dce7] bg-white p-4 text-sm font-bold">{notice}</div> : null}

        {loading ? (
          <div className="grid min-h-72 place-items-center rounded-3xl bg-white">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-7">
            <section className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2f1ff] text-[#6366F1]"><ClipboardCheck size={21} /></div>
                <div>
                  <h2 className="text-xl font-black">الإجابات الكتابية</h2>
                  <p className="text-sm text-[#777b8d]">أدخل درجة ضمن الحد الأعلى وأضف ملاحظة للطالب عند الحاجة.</p>
                </div>
              </div>

              <div className="space-y-4">
                {pending.map((entry) => {
                  const grade = grades[entry.id] ?? { score: "", feedback: "", publish: false };
                  return (
                    <article key={entry.id} className="rounded-2xl border border-[#e8e4ed] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-[#B1785C]">{entry.exam?.category} · المحاولة {entry.attemptNumber}</div>
                          <h3 className="mt-1 font-black">{entry.student?.full_name ?? "الطالب"} — {entry.exam?.title ?? "الاختبار"}</h3>
                          <div className="mt-1 text-xs text-[#777b8d]" dir="ltr">@{entry.student?.username}</div>
                        </div>
                        <span className="rounded-xl bg-[#f5f3f7] px-3 py-2 text-sm font-black">of {entry.maxMarks}</span>
                      </div>

                      <div className="mt-5 rounded-xl bg-[#faf9fb] p-4">
                        <div className="text-xs font-black text-[#777b8d]">{entry.question?.skill}</div>
                        <div dir="auto" className="mt-2 whitespace-pre-wrap font-black leading-8">{entry.question?.prompt}</div>
                      </div>

                      <div className="mt-3 rounded-xl border border-[#e5e1e9] bg-white p-4">
                        <div className="mb-2 text-xs font-black text-[#B1785C]">إجابة الطالب</div>
                        <div dir="auto" className="whitespace-pre-wrap leading-8">{String(entry.answer ?? "")}</div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
                        <label className="block">
                          <span className="mb-2 block text-sm font-black">الدرجة</span>
                          <input
                            className="field"
                            type="number"
                            min={0}
                            max={entry.maxMarks}
                            step={0.25}
                            value={grade.score}
                            onChange={(e)=>setGrades({...grades,[entry.id]:{...grade,score:e.target.value}})}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-black">ملاحظات للطالب</span>
                          <input
                            className="field"
                            value={grade.feedback}
                            onChange={(e)=>setGrades({...grades,[entry.id]:{...grade,feedback:e.target.value}})}
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-[#696f84]">
                          <input
                            type="checkbox"
                            checked={grade.publish}
                            onChange={(e)=>setGrades({...grades,[entry.id]:{...grade,publish:e.target.checked}})}
                          />
                          Publish the result automatically when grading is complete
                        </label>
                        <button
                          onClick={()=>saveGrade(entry)}
                          disabled={working===entry.id || grade.score===""}
                          className="btn"
                        >
                          {working===entry.id?<Loader2 size={17} className="animate-spin"/>:<Check size={17}/>}
                          Save score
                        </button>
                      </div>
                    </article>
                  );
                })}
                {pending.length===0?(
                  <div className="rounded-2xl bg-emerald-50 p-7 text-center text-emerald-800">
                    <CheckCircle2 className="mx-auto mb-3" />
                    <strong>No written answers are awaiting grading.</strong>
                  </div>
                ):null}
              </div>
            </section>

            <section className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-xl font-black">Completed results awaiting publication</h2>
                <p className="mt-1 text-sm text-[#777b8d]">For exams with manual result release.</p>
              </div>
              <div className="space-y-3">
                {results.map((result)=>(
                  <div key={result.attempt_id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e8e4ed] p-4">
                    <div>
                      <div className="text-xs font-black text-[#B1785C]">{result.exam?.category}</div>
                      <div className="mt-1 font-black">{result.student?.full_name} — {result.exam?.title}</div>
                      <div className="mt-1 text-sm text-[#777b8d]">{result.final_score} / {result.total_marks} · {result.percentage}%</div>
                    </div>
                    <button onClick={()=>publish(result.attempt_id)} disabled={working===result.attempt_id} className="btn">
                      {working===result.attempt_id?<Loader2 size={17} className="animate-spin"/>:<Send size={17}/>}
                      Publish result
                    </button>
                  </div>
                ))}
                {results.length===0?<div className="rounded-xl bg-[#f7f7fa] p-5 text-[#777b8d]">No completed results are awaiting publication.</div>:null}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, Save, ShieldCheck, UserRound } from "lucide-react";
import { intensiveFetch } from "@/lib/intensive/client";

type Course = { id: string; code: string; title: string; is_active: boolean };
type Student = {
  id: string;
  full_name: string;
  username: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  start_date: string | null;
  expiration_date: string | null;
  last_login_at: string | null;
};
type Enrollment = { student_id: string; course_id: string; is_active: boolean };
type Device = {
  student_id: string;
  status: string;
  registered_at: string | null;
  last_access_at: string | null;
  reset_at: string | null;
};

function formatRiyadhDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

export default function StudentAccountEditor() {
  const params = useParams<{ studentId: string }>();
  const studentId = String(params?.studentId ?? "");
  const [student, setStudent] = useState<Student | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [status, setStatus] = useState<Student["status"]>("ACTIVE");
  const [expirationDate, setExpirationDate] = useState("");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await intensiveFetch("/api/admin/overview", { cache: "no-store" });
    const payload = await response.json();
    if (response.status === 401 || response.status === 403) {
      window.location.replace("/");
      return;
    }
    if (!response.ok) throw new Error(payload.message || "تعذر تحميل بيانات الطالب.");
    const found = (payload.students as Student[]).find((item) => item.id === studentId) ?? null;
    if (!found) {
      setNotice("حساب الطالب غير موجود.");
      setLoading(false);
      return;
    }
    const currentEnrollments = (payload.enrollments as Enrollment[]).filter(
      (item) => item.student_id === studentId && item.is_active,
    );
    setStudent(found);
    setCourses(payload.courses ?? []);
    setEnrollments(payload.enrollments ?? []);
    setDevice(((payload.devices ?? []) as Device[]).find((item) => item.student_id === studentId) ?? null);
    setStatus(found.status);
    setExpirationDate(found.expiration_date ?? "");
    setCourseIds(currentEnrollments.map((item) => item.course_id));
    setLoading(false);
  }

  useEffect(() => {
    if (studentId) {
      load().catch(() => {
        setNotice("تعذر تحميل تفاصيل الطالب.");
        setLoading(false);
      });
    }
  }, [studentId]);

  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);

  function toggleCourse(courseId: string) {
    setCourseIds((current) =>
      current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId],
    );
  }

  async function save() {
    setWorking(true);
    setNotice("");
    try {
      const response = await intensiveFetch("/api/admin/student-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          status,
          expirationDate: expirationDate || null,
          courseIds,
          password: password || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر حفظ التغييرات.");
      setPassword("");
      setNotice("تم تحديث حساب الطالب بنجاح.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ التغييرات.");
    } finally {
      setWorking(false);
    }
  }

  async function resetDevice() {
    setWorking(true);
    setNotice("");
    const response = await intensiveFetch("/api/admin/reset-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    const payload = await response.json();
    setNotice(response.ok ? "تمت إعادة ضبط الجهاز. يمكن تسجيل جهاز جديد عند تسجيل الدخول القادم." : payload.message || "تعذر إعادة ضبط الجهاز الموثوق.");
    if (response.ok) await load();
    setWorking(false);
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-[#1F2B5E]"><Loader2 className="animate-spin" /></div>;
  }

  if (!student) {
    return (
      <div className="admin-shell min-h-screen overflow-x-hidden bg-[#f5f6fa] px-4 py-10 text-[#1F2B5E]">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="font-black">{notice || "حساب الطالب غير موجود."}</div>
          <a href="/admin" className="btn mt-5">العودة للوحة المدير</a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen overflow-x-hidden bg-[#f5f6fa] px-3 py-4 text-[#1F2B5E] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <a href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-[#73788d]">
          <ArrowRight size={17} /> Back to admin dashboard
        </a>

        <header className="mb-6 rounded-[1.5rem] sm:rounded-[1.8rem] bg-gradient-to-l from-[#1F2B5E] via-[#2c3d7e] to-[#6366F1] p-5 text-white sm:p-7 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-[#e9c0ab]">إدارة حساب الطالب</div>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">{student.full_name}</h1>
              <div className="mt-2 text-sm text-white/65" dir="ltr">@{student.username}</div>
            </div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/15 bg-white/10">
              <UserRound size={30} />
            </div>
          </div>
        </header>

        {notice ? <div className="mb-5 rounded-xl border border-[#e1dce7] bg-white p-4 text-sm font-bold">{notice}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-[1.6rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">الحالة والمواد</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black">حالة الحساب</span>
                <select className="field" value={status} onChange={(e)=>setStatus(e.target.value as Student["status"])}>
                  <option value="ACTIVE">نشط</option>
                  <option value="SUSPENDED">موقوف</option>
                  <option value="EXPIRED">منتهي</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">تاريخ الانتهاء</span>
                <input className="field" type="date" value={expirationDate} onChange={(e)=>setExpirationDate(e.target.value)} />
              </label>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-black">المواد المسجلة</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {courses.filter((course)=>course.is_active).map((course) => (
                  <label key={course.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e5e1e9] p-3">
                    <input type="checkbox" checked={courseIds.includes(course.id)} onChange={()=>toggleCourse(course.id)} />
                    <span>
                      <strong className="block">{course.code}</strong>
                      <small className="text-[#777b8d]">{course.title}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={save} disabled={working} className="btn mt-6 w-full">
              {working ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save account details
            </button>
          </section>

          <section className="rounded-[1.6rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">الأمان والدخول</h2>
            <div className="mt-5 rounded-2xl bg-[#f8f7fa] p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[#6366F1]" />
                <div>
                  <strong className="block">الدخول من جهاز واحد</strong>
                  <span className="text-xs text-[#777b8d]">يسمح للطالب بجهاز موثوق واحد فقط في الوقت نفسه.</span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3">
                  <div className="text-[11px] font-black text-[#8a8e9e]">DEVICE STATUS</div>
                  <div className={
                    "mt-1 text-sm font-black " +
                    (device?.status === "ACTIVE" ? "text-emerald-700" : device?.status === "RESET" ? "text-amber-700" : "text-[#777b8d]")
                  }>
                    {device?.status ?? "غير مسجل"}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <div className="text-[11px] font-black text-[#8a8e9e]">LAST ACCESS</div>
                  <div className="mt-1 text-sm font-black text-[#1F2B5E]">
                    {formatRiyadhDateTime(device?.last_access_at ?? null)}
                  </div>
                </div>
              </div>

              {device?.registered_at ? (
                <div className="mt-3 text-xs leading-6 text-[#777b8d]">
                  تم التسجيل {formatRiyadhDateTime(device.registered_at)}
                  {device.reset_at ? " · آخر إعادة ضبط " + formatRiyadhDateTime(device.reset_at) : ""}
                </div>
              ) : null}

              <button
                onClick={resetDevice}
                disabled={working || !device || device.status === "RESET"}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#ddd8e5] bg-white px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <KeyRound size={17} /> Reset trusted device
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-black">كلمة مرور جديدة</span>
              <input
                className="field"
                dir="ltr"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="اتركه فارغا للإبقاء على كلمة المرور الحالية"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
              />
            </label>
            <button onClick={save} disabled={working || !password} className="btn mt-4 w-full">
              {working ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
              Update password
            </button>

            <div className="mt-6 border-t border-[#ece8f0] pt-5 text-sm leading-7 text-[#777b8d]">
              <div><strong className="text-[#1F2B5E]">Last sign-in:</strong> {student.last_login_at ? formatRiyadhDateTime(student.last_login_at) : "لا يوجد"}</div>
              <div><strong className="text-[#1F2B5E]">Current courses:</strong> {courseIds.map((id)=>courseMap.get(id)?.code).filter(Boolean).join(",  ") || "لا يوجد"}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { intensiveFetch } from "@/lib/intensive/client";
import { ArrowRight, Image as ImageIcon, Loader2, Save, Sparkles } from "lucide-react";

type Course = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  default_cover_url: string | null;
  cover_path: string | null;
  is_active: boolean;
};

export default function CoversPortal() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await intensiveFetch("/api/admin/overview", { cache: "no-store" });
    const payload = await response.json();
    if (response.status === 401 || response.status === 403) {
      window.location.replace("/");
      return;
    }
    if (!response.ok) throw new Error(payload.message || "تعذر تحميل المواد.");
    setCourses(payload.courses ?? []);
    setValues(Object.fromEntries((payload.courses ?? []).map((course: Course) => [
      course.id,
      course.default_cover_url ?? course.cover_path ?? "",
    ])));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setNotice("تعذر تحميل الأغلفة.");
      setLoading(false);
    });
  }, []);

  async function upload(course: Course, file: File | null) {
    if (!file) return;
    setWorking(course.id);
    setNotice("");
    try {
      const form = new FormData();
      form.set("courseId", course.id);
      form.set("file", file);
      const response = await intensiveFetch("/api/admin/course-cover-upload", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "تعذر رفع الغلاف.");
      setNotice("تم رفع غلاف " + course.code + " وربطه بالمادة.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر رفع الغلاف.");
    } finally {
      setWorking(null);
    }
  }

  async function save(course: Course) {
    setWorking(course.id);
    setNotice("");
    const response = await intensiveFetch("/api/admin/course-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: course.id, coverUrl: values[course.id] ?? "" }),
    });
    const payload = await response.json();
    setNotice(response.ok ? "تم تحديث غلاف " + course.code + "." : payload.message || "تعذر تحديث الغلاف.");
    if (response.ok) await load();
    setWorking(null);
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] px-4 py-7 text-[#1F2B5E] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-[#73788d]">
          <ArrowRight size={17} /> Back to admin dashboard
        </a>

        <header className="mb-7 overflow-hidden rounded-[1.8rem] bg-gradient-to-l from-[#1F2B5E] via-[#2c3d7e] to-[#6366F1] p-7 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[#e9c0ab]"><Sparkles size={16}/> NUMO INTENSIVE</div>
              <h1 className="text-3xl font-black">أغلفة المواد</h1>
              <p className="mt-2 text-sm leading-7 text-white/70">استخدم صورة مرفوعة أو رابط HTTPS خارجي لكل مادة.</p>
            </div>
            <ImageIcon size={42} className="text-white/70" />
          </div>
        </header>

        {notice ? <div className="mb-5 rounded-xl border border-[#e1dce7] bg-white p-4 text-sm font-bold">{notice}</div> : null}

        {loading ? (
          <div className="grid min-h-72 place-items-center rounded-3xl bg-white"><Loader2 className="animate-spin"/></div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => {
              const url = values[course.id] ?? "";
              return (
                <article key={course.id} className="overflow-hidden rounded-[1.6rem] border border-[#e2dfe8] bg-white shadow-sm">
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#1F2B5E] via-[#35478e] to-[#6366F1]">
                    <div className="absolute inset-0 grid place-items-center p-5 text-center text-white">
                      <div>
                        <div className="text-sm font-black text-[#e8c0ab]">NUMO INTENSIVE</div>
                        <div dir="ltr" className="mt-2 text-3xl font-black">{course.code}</div>
                        <div dir="ltr" className="mt-1 text-sm text-white/70">{course.title}</div>
                      </div>
                    </div>
                    {url ? (
                      <img
                        src={url}
                        alt={"غلاف " + course.code}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(event)=>{ event.currentTarget.style.display="none"; }}
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <div dir="ltr" className="font-black">{course.code}</div>
                      <div dir="ltr" className="mt-1 text-xs text-[#777b8d]">{course.title}</div>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-sm font-black">رابط الغلاف</span>
                      <input
                        className="field"
                        dir="ltr"
                        placeholder="/covers/el111.png or https://..."
                        value={url}
                        onChange={(e)=>setValues({...values,[course.id]:e.target.value})}
                      />
                    </label>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-black">أو ارفع صورة</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="block w-full rounded-xl border border-[#e2dce7] bg-[#faf9fb] p-3 text-sm"
                        disabled={working===course.id}
                        onChange={(event)=>{
                          const file = event.target.files?.[0] ?? null;
                          void upload(course, file);
                          event.currentTarget.value = "";
                        }}
                      />
                      <span className="mt-1 block text-xs text-[#777b8d]">PNG / JPEG / WebP — الحد الأقصى 5 MB</span>
                    </label>
                    <button onClick={()=>save(course)} disabled={working===course.id} className="btn mt-4 w-full">
                      {working===course.id?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>}
                      Save cover URL
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

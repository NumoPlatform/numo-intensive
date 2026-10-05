"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  UsersRound,
  CalendarClock,
} from "lucide-react";
import { intensiveFetch } from "@/lib/intensive/client";
import { courseCover, courseVisual } from "@/lib/intensive/ui";

type Course = {
  id:string;
  code:string;
  title:string;
  description:string|null;
  default_cover_url:string|null;
  cover_path:string|null;
  is_active:boolean;
};
type Enrollment={student_id:string;course_id:string;is_active:boolean};
type Exam={id:string;course_id:string;status:string};
type Overview={courses:Course[];enrollments:Enrollment[];exams:Exam[]};

export default function CoursesPortal(){
  const [data,setData]=useState<Overview|null>(null);
  const [edit,setEdit]=useState<Record<string,{title:string;description:string;isActive:boolean}>>({});
  const [working,setWorking]=useState<string|null>(null);
  const [notice,setNotice]=useState("");

  async function load(){
    const response=await intensiveFetch("/api/admin/overview",{cache:"no-store"});
    if(response.status===401||response.status===403){window.location.replace("/");return;}
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.message||"تعذر تحميل المقررات.");
    const courses=(payload.courses??[]) as Course[];
    setData({courses,enrollments:payload.enrollments??[],exams:payload.exams??[]});
    setEdit(Object.fromEntries(courses.map(course=>[course.id,{title:course.title,description:course.description??"",isActive:course.is_active}])));
  }

  useEffect(()=>{load().catch(()=>setNotice("تعذر تحميل المقررات."));},[]);

  const activeCount=useMemo(()=>data?.courses.filter(c=>c.is_active).length??0,[data]);

  async function save(course:Course){
    const current=edit[course.id];
    if(!current)return;
    setWorking(course.id);
    setNotice("");
    try{
      const response=await intensiveFetch("/api/admin/course-manage",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({courseId:course.id,title:current.title,description:current.description,isActive:current.isActive}),
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.message||"تعذر تحديث المقرر.");
      setNotice("تم حفظ إعدادات المقرر بنجاح.");
      await load();
    }catch(error){
      setNotice(error instanceof Error?error.message:"تعذر تحديث المقرر.");
    }finally{setWorking(null);}
  }

  if(!data&&!notice){
    return <main className="grid min-h-screen place-items-center bg-[#f5f6fa] text-[#1F2B5E]"><div className="text-center"><Loader2 className="mx-auto mb-3 animate-spin"/><div className="font-black">جاري تحميل المقررات...</div></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#1F2B5E] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/admin" className="inline-flex items-center gap-2 text-sm font-black text-[#73788d]"><ArrowRight size={17}/> العودة للوحة المدير</a>
          <div className="flex items-center gap-3"><img src="/icon.svg" alt="شعار منصة نمو" className="h-11 w-11 rounded-xl bg-[#1F2B5E] p-1.5"/><div><div className="font-black">منصة نمو</div><div className="text-[10px] font-bold tracking-[.12em] text-[#B1785C]" dir="ltr">NUMO INTENSIVE</div></div></div>
        </div>

        <header className="overflow-hidden rounded-[2rem] bg-gradient-to-l from-[#1F2B5E] via-[#2d3e7d] to-[#6366F1] p-8 text-white shadow-[0_25px_70px_rgba(31,43,94,.22)]">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><div className="inline-flex items-center gap-2 text-sm font-black text-[#efc8b4]"><Sparkles size={16}/> إدارة المقررات</div><h1 className="mt-2 text-4xl font-black">تحكم كامل بالمقررات</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">عدّل اسم المقرر ووصفه وحالة التفعيل، وادخل مباشرة إلى الاختبارات والأغلفة.</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center"><div className="text-3xl font-black">{activeCount}</div><div className="text-xs text-white/60">مقررات نشطة</div></div>
          </div>
        </header>

        {notice?<div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#e1dce7] bg-white p-4 text-sm font-bold"><CheckCircle2 size={18} className="text-emerald-600"/>{notice}</div>:null}

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          {(data?.courses??[]).map(course=>{
            const visual=courseVisual(course.code);
            const current=edit[course.id];
            const students=data?.enrollments.filter(item=>item.course_id===course.id&&item.is_active).length??0;
            const exams=data?.exams.filter(item=>item.course_id===course.id).length??0;
            return (
              <article key={course.id} className="overflow-hidden rounded-[1.8rem] border border-[#e3dfe8] bg-white shadow-[0_15px_42px_rgba(31,43,94,.07)]">
                <div className="grid md:grid-cols-[220px_1fr]">
                  <div className="relative min-h-52 overflow-hidden">
                    <img src={courseCover(course.code,course.default_cover_url)} alt={course.code} className="absolute inset-0 h-full w-full object-cover"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1F2B5E]/72 via-transparent to-transparent"/>
                    <div className="absolute bottom-4 right-4"><div className="rounded-full bg-white/95 px-3 py-1 text-xs font-black">{visual.level}</div></div>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><div dir="ltr" className="text-xl font-black">{course.code}</div><div className="mt-1 text-xs font-bold text-[#7e8395]">{visual.label}</div></div>
                      <label className="inline-flex items-center gap-2 rounded-full bg-[#f6f5f9] px-3 py-2 text-xs font-black">
                        <input type="checkbox" checked={current?.isActive??course.is_active} onChange={e=>setEdit({...edit,[course.id]:{...(current??{title:course.title,description:course.description??"",isActive:course.is_active}),isActive:e.target.checked}})}/>
                        {current?.isActive??course.is_active?"نشط":"غير نشط"}
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-[#f8f7fa] p-3 text-center"><UsersRound className="mx-auto text-[#6366F1]" size={18}/><div className="mt-1 text-xl font-black">{students}</div><div className="text-[10px] text-[#8a8e9f]">طالب</div></div>
                      <div className="rounded-xl bg-[#f8f7fa] p-3 text-center"><CalendarClock className="mx-auto text-[#B1785C]" size={18}/><div className="mt-1 text-xl font-black">{exams}</div><div className="text-[10px] text-[#8a8e9f]">اختبار</div></div>
                    </div>

                    <label className="mt-4 block"><span className="mb-2 block text-xs font-black">اسم المقرر</span><input className="field" value={current?.title??course.title} onChange={e=>setEdit({...edit,[course.id]:{...(current??{title:course.title,description:course.description??"",isActive:course.is_active}),title:e.target.value}})}/></label>
                    <label className="mt-3 block"><span className="mb-2 block text-xs font-black">الوصف</span><textarea className="field min-h-20" value={current?.description??course.description??""} onChange={e=>setEdit({...edit,[course.id]:{...(current??{title:course.title,description:course.description??"",isActive:course.is_active}),description:e.target.value}})}/></label>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button type="button" onClick={()=>save(course)} disabled={working===course.id} className="btn min-h-11 px-3 py-2 text-xs">{working===course.id?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>} حفظ</button>
                      <a href="/admin/exams/new" className="rounded-xl border border-[#ddd8e5] bg-white px-3 py-2.5 text-center text-xs font-black">إنشاء اختبار</a>
                      <a href="/admin/covers" className="rounded-xl border border-[#ddd8e5] bg-white px-3 py-2.5 text-center text-xs font-black">إدارة الغلاف</a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {(data?.courses.length??0)===0?<div className="mt-6 rounded-3xl border border-dashed border-[#d7d1df] bg-white p-10 text-center"><BookOpenCheck className="mx-auto mb-3 text-[#B1785C]"/><div className="font-black">لا توجد مقررات حاليا.</div></div>:null}
      </div>
    </main>
  );
}

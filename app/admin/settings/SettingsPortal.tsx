"use client";

import NumoBrand from "@/app/components/NumoBrand";
import { BRAND } from "@/lib/brand";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Globe2, Loader2, MessageCircle, Save, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { intensiveFetch } from "@/lib/intensive/client";

type Settings={
  support_phone:string|null;
  support_whatsapp:string|null;
  support_website:string|null;
  support_email:string|null;
  timezone:string;
  default_section_minutes:number;
  default_attempts:number;
  default_result_release:"IMMEDIATE"|"AFTER_END"|"MANUAL";
  updated_at:string|null;
};

export default function SettingsPortal(){
  const [settings,setSettings]=useState<Settings|null>(null);
  const [working,setWorking]=useState(false);
  const [notice,setNotice]=useState<{type:"success"|"error";text:string}|null>(null);

  useEffect(()=>{
    intensiveFetch("/api/admin/settings",{cache:"no-store"})
      .then(async response=>{
        if(response.status===401||response.status===403){window.location.replace("/");return;}
        const payload=await response.json();
        if(!response.ok)throw new Error(payload.message||"تعذر تحميل الإعدادات.");
        setSettings(payload.settings);
      })
      .catch(error=>setNotice({type:"error",text:error instanceof Error?error.message:"تعذر تحميل الإعدادات."}));
  },[]);

  async function save(event:FormEvent){
    event.preventDefault();
    if(!settings)return;
    setWorking(true);setNotice(null);
    try{
      const response=await intensiveFetch("/api/admin/settings",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          supportPhone:settings.support_phone,
          supportWhatsapp:settings.support_whatsapp,
          supportWebsite:settings.support_website,
          supportEmail:settings.support_email,
          timezone:settings.timezone,
          defaultSectionMinutes:settings.default_section_minutes,
          defaultAttempts:settings.default_attempts,
          defaultResultRelease:settings.default_result_release,
        }),
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.message||"تعذر حفظ الإعدادات.");
      setSettings(payload.settings);
      setNotice({type:"success",text:"تم حفظ إعدادات النظام بنجاح."});
    }catch(error){
      setNotice({type:"error",text:error instanceof Error?error.message:"تعذر حفظ الإعدادات."});
    }finally{setWorking(false);}
  }

  if(!settings&&!notice){
    return <main className="grid min-h-screen place-items-center bg-[#f5f6fa] text-[#1F2B5E]"><div className="text-center"><Loader2 className="mx-auto mb-3 animate-spin"/><div className="font-black">جاري تحميل إعدادات النظام...</div></div></main>;
  }

  return (
    <main className="admin-shell min-h-screen overflow-x-hidden bg-[#f5f6fa] px-3 py-4 text-[#1F2B5E] sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <a href="/admin" className="inline-flex items-center gap-2 text-sm font-black text-[#73788d]"><ArrowRight size={17}/> العودة للوحة المدير</a>
          <NumoBrand className="w-24" />
        </div>

        <header className="overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-l from-[#1F2B5E] via-[#2c3d7c] to-[#6366F1] p-5 text-white sm:p-8 shadow-[0_25px_70px_rgba(31,43,94,.22)]">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><div className="inline-flex items-center gap-2 text-sm font-black text-[#efc8b4]"><Sparkles size={16}/> إعدادات النظام</div><h1 className="mt-2 text-2xl font-black sm:text-4xl">إعدادات {BRAND.nameAr}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">تحكم ببيانات الدعم والمنطقة الزمنية، وراجع السياسات الأساسية التي تحكم تجربة الطالب والاختبارات.</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5"><ShieldCheck className="text-emerald-300"/><div className="mt-2 font-black">سياسات الأمان مفعلة</div><div className="mt-1 text-xs text-white/55">جهاز موثوق واحد لكل طالب</div></div>
          </div>
        </header>

        {notice?<div className={"mt-5 flex items-center gap-2 rounded-2xl border p-4 text-sm font-bold "+(notice.type==="success"?"border-emerald-100 bg-emerald-50 text-emerald-800":"border-rose-100 bg-rose-50 text-rose-700")}><CheckCircle2 size={18}/>{notice.text}</div>:null}

        {settings?(
          <form onSubmit={save} className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <section className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2"><MessageCircle size={20} className="text-[#B1785C]"/><h2 className="text-xl font-black">بيانات التواصل والدعم</h2></div>
              <p className="mt-1 text-sm text-[#777c8f]">هذه البيانات تظهر للطالب في قسم الدعم داخل البوابة.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label><span className="mb-2 block text-sm font-black">رقم الدعم</span><input className="field" dir="ltr" value={settings.support_phone??""} onChange={e=>setSettings({...settings,support_phone:e.target.value})}/></label>
                <label><span className="mb-2 block text-sm font-black">رابط واتساب</span><input className="field" dir="ltr" value={settings.support_whatsapp??""} onChange={e=>setSettings({...settings,support_whatsapp:e.target.value})}/></label>
                <label><span className="mb-2 block text-sm font-black">الموقع الرسمي</span><input className="field" dir="ltr" value={settings.support_website??""} onChange={e=>setSettings({...settings,support_website:e.target.value})}/></label>
                <label><span className="mb-2 block text-sm font-black">البريد الإلكتروني</span><input className="field" dir="ltr" type="email" value={settings.support_email??""} onChange={e=>setSettings({...settings,support_email:e.target.value})}/></label>
              </div>
              <label className="mt-4 block"><span className="mb-2 flex items-center gap-2 text-sm font-black"><Clock3 size={17} className="text-[#6366F1]"/> المنطقة الزمنية</span><select className="field" value={settings.timezone} onChange={e=>setSettings({...settings,timezone:e.target.value})}><option value="Asia/Riyadh">Asia/Riyadh — الرياض</option></select></label>
              <button className="btn mt-5" disabled={working}>{working?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} {working?"جاري الحفظ...":"حفظ الإعدادات"}</button>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-emerald-600"/><h2 className="font-black">سياسات الدخول</h2></div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3"><span>جهاز واحد لكل طالب</span><strong className="text-emerald-700">مفعل</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-[#f7f6fa] p-3"><span>إعادة ضبط الجهاز</span><strong>من المدير فقط</strong></div>
                </div>
              </section>
              <section className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2"><Smartphone size={20} className="text-[#6366F1]"/><h2 className="font-black">الإعدادات الافتراضية للاختبار</h2></div>
                <p className="mt-1 text-xs leading-6 text-[#85899a]">سيستخدم منشئ الاختبارات هذه القيم تلقائيا، ويمكن تعديلها داخل أي اختبار قبل الإنشاء.</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-[#f7f6fa] p-3">
                    <div className="mb-2 flex justify-between gap-3"><span>الأقسام</span><strong dir="ltr">Grammar · Vocabulary · Reading</strong></div>
                    <div className="text-[11px] text-[#85899a]">الهيكل ثابت للدورات المكثفة.</div>
                  </div>
                  <label className="block rounded-xl bg-[#f7f6fa] p-3">
                    <span className="mb-2 block font-black">مدة القسم بالدقائق</span>
                    <input className="field" type="number" min={1} max={240} value={settings.default_section_minutes} onChange={e=>setSettings({...settings,default_section_minutes:Number(e.target.value)})}/>
                  </label>
                  <label className="block rounded-xl bg-[#f7f6fa] p-3">
                    <span className="mb-2 block font-black">عدد المحاولات</span>
                    <input className="field" type="number" min={1} max={20} value={settings.default_attempts} onChange={e=>setSettings({...settings,default_attempts:Number(e.target.value)})}/>
                  </label>
                  <label className="block rounded-xl bg-[#f7f6fa] p-3">
                    <span className="mb-2 block font-black">إظهار النتيجة</span>
                    <select className="field" value={settings.default_result_release} onChange={e=>setSettings({...settings,default_result_release:e.target.value as Settings["default_result_release"]})}>
                      <option value="IMMEDIATE">مباشرة بعد التسليم</option>
                      <option value="AFTER_END">بعد إغلاق الاختبار</option>
                      <option value="MANUAL">يدويا من المدير</option>
                    </select>
                  </label>
                </div>
              </section>
              <section className="rounded-[1.7rem] border border-[#e2dfe8] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2"><Globe2 size={20} className="text-[#B1785C]"/><h2 className="font-black">النطاق</h2></div>
                <div className="mt-3 text-sm font-black">{BRAND.nameAr}</div><div className="mt-1 text-[10px] font-black tracking-[.1em] text-[#B1785C]" dir="ltr">{BRAND.nameEn}</div>
                <div className="mt-1 text-xs leading-6 text-[#85899a]">النطاق التشغيلي وإعدادات DNS تبقى مُدارة في مشروع Vercel دون تغيير ضمن إعادة التموضع النصي.</div>
              </section>
            </aside>
          </form>
        ):null}
      </div>
    </main>
  );
}

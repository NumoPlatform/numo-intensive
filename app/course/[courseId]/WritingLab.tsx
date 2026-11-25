"use client";
import { useState } from "react";
import { PenTool, ArrowUpRight, ChevronLeft, CheckCircle2 } from "lucide-react";
const topics=[
["Millennials being negatively affected by global culture at the expense of their national identity.","Do you think machines can ever be exactly like humans? Would it be a good thing?"],
["We all have a way in which we best learn. As students, we are either visual, auditory, kinesthetic, or perhaps a mix of all. Write about your preferred learning style and what works best for you in class.","Discuss two techniques that you think teachers should use to improve students’ writing skills."],
["Do you agree that millennials are creating a global culture? Support your argument with evidence and examples.","Should ordinary citizens in wealthy countries do more to help developing countries? Why? Why not? Support your argument with evidence and examples."],
["Highlight the importance of networking (when you meet people at events and parties and connect with them) and provide tips for it.","If you could go back in time and study, which era would you choose and why?"],
["How the Arab Open University meets students’ needs.","Should we interact with others with cultural differences?"],
["Discuss why you think travelers must familiarize themselves with the culture of the countries they plan to visit.","Do you agree that working in a team is more difficult than working individually? Support your argument with evidence and examples."]
];
const labels=["Academic Title","Introduction","Body Paragraph 1","Body Paragraph 2","Conclusion"];
const hints=["Choose a concise title that reflects your argument.","Hook → Background → Thesis Statement","Topic Sentence → Explanation → Example → Development","Topic Sentence → Explanation → Example → Development","Restate the thesis → Summarise → Closing Statement"];
const targets=[0,55,75,75,45];
const count=(s:string)=>(s.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]).length;
export default function WritingLab({onBack}:{onBack:()=>void}){
const [model,setModel]=useState<number|null>(null);
const [topic,setTopic]=useState<number|null>(null);
const [guided,setGuided]=useState(true);
const [parts,setParts]=useState(["","","","",""]);
const [essay,setEssay]=useState("");
const [review,setReview]=useState(false);
const total=guided?parts.slice(1).reduce((a,b)=>a+count(b),0):count(essay);
const reset=()=>{setParts(["","","","",""]);setEssay("");setReview(false);};
return <section className="mt-6 overflow-hidden rounded-[2rem] border border-[#dedbe5] bg-white shadow-[0_18px_50px_rgba(31,43,94,.12)]">
<header className="bg-gradient-to-br from-[#101831] via-[#1F2B5E] to-[#4548a4] p-5 text-white sm:p-8"><button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-bold"><ChevronLeft size={18}/> العودة للأقسام</button><div dir="ltr"><p className="text-xs font-bold tracking-[.2em] text-[#edc2ad]">NUMO SIGNATURE DELUXE · EL112</p><h2 className="mt-3 text-3xl font-black">Academic Writing Lab</h2><p className="mt-2 text-sm text-white/90">FINAL EXAM · 6 Models · 12 Topics · 250 Words</p></div></header>
<div className="p-4 sm:p-7">
{model===null?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{topics.map((_,i)=><button key={i} type="button" dir="ltr" onClick={()=>{setModel(i);setTopic(null);reset()}} className="rounded-[1.5rem] bg-gradient-to-br from-[#1F2B5E] to-[#343878] p-4 text-left text-white shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#6366F1]"><div className="flex justify-between text-[#edc2ad]"><PenTool size={25}/><span>0{i+1}</span></div><h3 className="mt-6 text-lg font-black">MODEL {["ONE","TWO","THREE","FOUR","FIVE","SIX"][i]}</h3><p className="mt-2 text-xs text-white/90">2 Academic Topics</p><div className="mt-5 flex justify-between border-t border-white/25 pt-3 text-xs">Explore Model<ArrowUpRight size={16}/></div></button>)}</div>:<>
<button type="button" className="mb-4 font-bold text-[#6366F1]" onClick={()=>{setModel(null);setTopic(null);reset()}}>العودة للنماذج</button>
{topic===null?<div className="space-y-3" dir="ltr"><h3 className="text-xl font-black">Choose ONE topic</h3>{topics[model].map((t,i)=><button type="button" key={i} onClick={()=>{setTopic(i);reset()}} className="block w-full rounded-2xl border border-[#dedbe5] bg-[#f7f7fb] p-5 text-left leading-7"><b className="text-[#6366F1]">Topic {i===0?"A":"B"}</b><p>{t}</p></button>)}</div>:<>
<div dir="ltr" className="rounded-2xl bg-[#f1f1ff] p-4 leading-7"><b>Writing Topic</b><p>{topics[model][topic]}</p></div>
<div className="my-4 flex flex-wrap gap-2"><button type="button" onClick={()=>{if(!guided&&essay.trim()&&!window.confirm("تغيير الوضع يحذف النص الحالي. هل تريد المتابعة؟"))return;setGuided(true);reset()}} className={"rounded-xl px-4 py-3 font-bold "+(guided?"bg-[#1F2B5E] text-white":"bg-[#f1f1ff]")}>Guided Practice</button><button type="button" onClick={()=>{if(guided&&parts.some(p=>p.trim())&&!window.confirm("تغيير الوضع يحذف النص الحالي. هل تريد المتابعة؟"))return;setGuided(false);reset()}} className={"rounded-xl px-4 py-3 font-bold "+(!guided?"bg-[#1F2B5E] text-white":"bg-[#f1f1ff]")}>Independent Practice</button></div>
<div dir="ltr" className="space-y-4">{guided?labels.map((label,i)=><label key={label} className="block"><span className="font-black">{label}</span><span className="block text-sm text-[#73788d]">{hints[i]}</span><textarea value={parts[i]} onChange={e=>{setParts(p=>p.map((v,j)=>j===i?e.target.value:v));setReview(false)}} rows={i===0?2:5} className="mt-2 w-full rounded-xl border border-[#d9d4e2] bg-white p-3 text-base" placeholder="Write in English..."/>{i>0&&<span className="text-xs text-[#73788d]">{count(parts[i])} / {targets[i]} suggested words</span>}</label>):<><label className="block font-black">Academic Title<input value={parts[0]} onChange={e=>{setParts(p=>[e.target.value,...p.slice(1)]);setReview(false)}} className="mt-2 block w-full rounded-xl border border-[#d9d4e2] p-3"/></label><label className="block font-black">Essay<textarea rows={14} value={essay} onChange={e=>{setEssay(e.target.value);setReview(false)}} className="mt-2 block w-full rounded-xl border border-[#d9d4e2] p-3" placeholder="Write your essay in English..."/></label></>}</div>
<div className="mt-4 rounded-xl bg-[#f1f1ff] p-4" dir="ltr"><b>{total} / 250 words</b><div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-[#6366F1]" style={{width:Math.min(100,total/250*100)+"%"}}/></div></div>
<button type="button" disabled={!total} onClick={()=>setReview(true)} className="mt-4 w-full rounded-xl bg-[#1F2B5E] p-4 font-black text-white disabled:opacity-50">Review Structure</button>
{review&&<div className="mt-4 rounded-2xl border border-[#dedbe5] p-4"><h3 className="flex items-center gap-2 font-black"><CheckCircle2 size={20}/> مراجعة بنية المقال</h3><p className="mt-2 text-sm">عدد الكلمات: {total}. {total===250?"تم بلوغ العدد المستهدف.":total<250?"أضف تفاصيل وأمثلة مرتبطة بالموضوع.":"راجع الإطالة مع الحفاظ على المعنى."}</p><p className="mt-2 text-sm">{parts[0].trim()?"تم إدخال عنوان.":"أضف عنوانا أكاديميا."}</p><p className="mt-2 text-sm">عدد الفقرات المكتوبة: {guided?parts.slice(1).filter(p=>p.trim()).length:essay.trim().split(/\n\s*\n/).filter(p=>p.trim()).length} / 4</p><p className="mt-3 text-sm leading-7 text-[#73788d]">هذه مراجعة آلية للعدد والبنية فقط، وليست تصحيحا لغويا أو درجة أكاديمية. راجع الأطروحة والأمثلة وأدوات الربط والخاتمة بنفسك.</p></div>}
</>}</>}
</div></section>;
}

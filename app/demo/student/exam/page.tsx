"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock3, RotateCcw, Send } from "lucide-react";
import { demoQuestions, demoSections, type DemoSectionName } from "../../demo-data";

type TrialState={attempts:number;bestPercentage:number|null;lastPercentage:number|null};
const key=(section:DemoSectionName)=>"numo_intensive_demo_"+section.toLowerCase();
const valid=(v:string|null):v is DemoSectionName=>v==="Grammar"||v==="Vocabulary"||v==="Reading";

export default function DemoExamPage(){
  const [section,setSection]=useState<DemoSectionName>("Grammar");
  const [ready,setReady]=useState(false);
  const [index,setIndex]=useState(0);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [remaining,setRemaining]=useState(30*60);
  const [result,setResult]=useState<{score:number;percentage:number}|null>(null);
  const [attempt,setAttempt]=useState(1);

  const meta=useMemo(()=>demoSections.find(x=>x.title===section)??demoSections[0],[section]);
  const questions=useMemo(()=>demoQuestions.filter(x=>x.section===section),[section]);
  const current=questions[index];
  const passage=current?.passage ?? questions.find(q=>q.passageTitle===current?.passageTitle && q.passage)?.passage ?? null;

  useEffect(()=>{
    const requested=new URLSearchParams(location.search).get("section");
    const selected=valid(requested)?requested:"Grammar";
    setSection(selected);
    try{
      const raw=localStorage.getItem(key(selected));
      const state:TrialState=raw?JSON.parse(raw):{attempts:0,bestPercentage:null,lastPercentage:null};
      if(state.attempts>=4){location.replace("/demo/student");return;}
      setAttempt(state.attempts+1);
    }catch{}
    setReady(true);
  },[]);

  useEffect(()=>{
    if(!ready||result)return;
    const timer=setInterval(()=>setRemaining(v=>Math.max(0,v-1)),1000);
    return()=>clearInterval(timer);
  },[ready,result]);

  useEffect(()=>{
    if(ready&&remaining===0&&!result) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[remaining,ready,result]);

  function finish(){
    const score=questions.reduce((n,q)=>n+(answers[q.id]===q.correct?1:0),0);
    const percentage=questions.length?Math.round(score/questions.length*100):0;
    setResult({score,percentage});
    try{
      const raw=localStorage.getItem(key(section));
      const prev:TrialState=raw?JSON.parse(raw):{attempts:0,bestPercentage:null,lastPercentage:null};
      localStorage.setItem(key(section),JSON.stringify({
        attempts:Math.min(4,prev.attempts+1),
        lastPercentage:percentage,
        bestPercentage:prev.bestPercentage===null?percentage:Math.max(prev.bestPercentage,percentage),
      }));
    }catch{}
  }

  if(!ready||!current)return <main className="grid min-h-screen place-items-center font-black text-[#1F2B5E]">Loading section...</main>;

  if(result){
    const wrong=questions.filter(q=>answers[q.id]!==q.correct);
    return (
      <main className="min-h-screen bg-[#f5f6fa] px-4 py-10 text-[#1F2B5E]">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#e2dfe8] bg-white p-7 text-center shadow-xl sm:p-10">
          <CheckCircle2 className="mx-auto text-emerald-600" size={44}/>
          <div className="mt-4 text-xs font-black text-[#B1785C]">{section.toUpperCase()} · ATTEMPT {attempt} OF 4</div>
          <h1 className="mt-2 text-3xl font-black">Section submitted</h1>
          <div className="mt-6 text-6xl font-black">{result.percentage}%</div>
          <div className="mt-2 text-[#777b8d]">{result.score} of {questions.length} correct in this preview</div>

          <section className="mt-8 text-left">
            <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">Questions you missed</h2><span className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{wrong.length} wrong</span></div>
            {wrong.length?(
              <div className="mt-4 space-y-4">
                {wrong.map(q=>{
                  const selected=q.options.find(o=>o.id===answers[q.id]);
                  const correct=q.options.find(o=>o.id===q.correct);
                  return <article key={q.id} className="rounded-2xl border border-[#e8e4ed] p-5"><div className="font-black leading-8">{q.prompt}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-rose-50 p-4"><div className="text-xs font-black text-rose-700">Your answer</div><div className="mt-1 font-bold">{selected?.label??"No answer"}</div></div><div className="rounded-xl bg-emerald-50 p-4"><div className="text-xs font-black text-emerald-700">Correct answer</div><div className="mt-1 font-bold">{correct?.label??"—"}</div></div></div></article>;
                })}
              </div>
            ):<div className="mt-4 rounded-2xl bg-emerald-50 p-6 text-center font-black text-emerald-800">All answers are correct.</div>}
          </section>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo/student" className="rounded-xl bg-[#1F2B5E] px-5 py-3 font-black text-white">Back to Student Portal</Link>
            <button onClick={()=>{localStorage.removeItem(key(section));location.replace("/demo/student");}} className="inline-flex items-center gap-2 rounded-xl border border-[#ddd8e5] px-5 py-3 font-black"><RotateCcw size={17}/>Reset {section} attempts</button>
          </div>
        </div>
      </main>
    );
  }

  const mm=String(Math.floor(remaining/60)).padStart(2,"0");
  const ss=String(remaining%60).padStart(2,"0");

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-4 py-6 text-[#1F2B5E]">
      <div className="mx-auto max-w-6xl">
        <Link href="/demo/student" className="inline-flex items-center gap-2 text-sm font-black text-[#73788d]"><ArrowLeft size={17}/>Exit preview</Link>
        <header className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-[#1F2B5E] p-5 text-white shadow-lg">
          <div><div className="text-xs font-black text-[#e8bea9]">EL111 MIDTERM</div><h1 className="mt-1 text-2xl font-black">{section}</h1><div className="mt-1 text-xs text-white/65">{meta.questionCount} questions in the full authenticated section</div></div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-black"><Clock3 size={18}/>{mm}:{ss}</div>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
          <aside className="rounded-[1.4rem] border border-[#e3dfe9] bg-white p-4 shadow-sm">
            <div className="text-xs font-black text-[#777b8d]">Preview questions</div>
            <div className="mt-3 flex flex-wrap gap-2">{questions.map((q,i)=><button key={q.id} onClick={()=>setIndex(i)} className={"grid h-9 w-9 place-items-center rounded-lg text-xs font-black "+(i===index?"bg-[#1F2B5E] text-white":answers[q.id]?"bg-emerald-50 text-emerald-700":"bg-[#f2f1f4] text-[#7d8192]")}>{i+1}</button>)}</div>
          </aside>

          <section className="rounded-[1.6rem] border border-[#e3dfe9] bg-white p-5 shadow-sm sm:p-7">
            <div className="text-sm font-black text-[#B1785C]">Question {index+1} of {questions.length}</div>
            {current.passageTitle?<div className="mt-5 rounded-2xl border border-[#e7dfdb] bg-[#fffaf7] p-5"><div className="text-sm font-black text-[#9a6249]">{current.passageTitle}</div>{passage?<div className="mt-3 max-h-[300px] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-[#555b70]">{passage}</div>:null}</div>:null}
            <h2 className="mt-5 text-xl font-black leading-8">{current.prompt}</h2>
            <div className="mt-6 space-y-3">{current.options.map(o=><label key={o.id} className={"flex cursor-pointer items-start gap-3 rounded-2xl border p-4 "+(answers[current.id]===o.id?"border-[#6366F1] bg-[#f2f2ff]":"border-[#e6e2ea] hover:bg-[#faf9fb]")}><input type="radio" name={current.id} checked={answers[current.id]===o.id} onChange={()=>setAnswers({...answers,[current.id]:o.id})} className="mt-1"/><span className="font-bold leading-7">{o.label}</span></label>)}</div>
            <div className="mt-7 flex justify-end">{index<questions.length-1?<button onClick={()=>setIndex(i=>i+1)} className="inline-flex items-center gap-2 rounded-xl bg-[#1F2B5E] px-5 py-3 font-black text-white">Next<ChevronRight size={17}/></button>:<button onClick={finish} className="inline-flex items-center gap-2 rounded-xl bg-[#1F2B5E] px-5 py-3 font-black text-white"><Send size={17}/>Submit and review</button>}</div>
          </section>
        </div>
      </div>
    </main>
  );
}

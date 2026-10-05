import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, userRequest } from "@/lib/intensive/server";

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
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const [courses, questions, options, passages, usages, exams, sections] = await Promise.all([
    serviceRequest<Array<{ id: string; code: string; title: string; is_active: boolean }>>(
      "/rest/v1/intensive_courses?select=id,code,title,is_active&order=code.asc&limit=200",
    ),
    serviceRequest<Question[]>(
      "/rest/v1/intensive_questions?select=id,course_id,exam_category,skill,type,difficulty,prompt,passage_id,grading_mode,acceptable_answers,correct_boolean,marks,tags,is_active,created_at&order=created_at.desc&limit=1000",
    ),
    serviceRequest<Array<{ id: string; question_id: string; label: string; value: string; is_correct: boolean; position: number }>>(
      "/rest/v1/intensive_question_options?select=id,question_id,label,value,is_correct,position&order=position.asc&limit=5000",
    ),
    serviceRequest<Array<{ id: string; title: string; body: string }>>(
      "/rest/v1/intensive_passages?select=id,title,body&order=created_at.desc&limit=1000",
    ),
    serviceRequest<Array<{ exam_id: string; section_id: string; question_id: string; marks: number; position: number }>>(
      "/rest/v1/intensive_exam_questions?select=exam_id,section_id,question_id,marks,position&limit=5000",
    ),
    serviceRequest<Array<{ id: string; course_id: string; title: string; category: string; status: string }>>(
      "/rest/v1/intensive_exams?select=id,course_id,title,category,status&order=created_at.desc&limit=1000",
    ),
    serviceRequest<Array<{ id: string; exam_id: string; title: string; position: number }>>(
      "/rest/v1/intensive_exam_sections?select=id,exam_id,title,position&order=position.asc&limit=5000",
    ),
  ]);

  const optionsByQuestion = new Map<string, typeof options>();
  for (const option of options) {
    optionsByQuestion.set(option.question_id, [
      ...(optionsByQuestion.get(option.question_id) ?? []),
      option,
    ]);
  }
  const usageByQuestion = new Map<string, typeof usages>();
  for (const usage of usages) {
    usageByQuestion.set(usage.question_id, [
      ...(usageByQuestion.get(usage.question_id) ?? []),
      usage,
    ]);
  }
  const passageMap = new Map(passages.map((passage) => [passage.id, passage]));

  return NextResponse.json({
    ok: true,
    courses,
    exams,
    sections,
    questions: questions.map((question) => ({
      ...question,
      options: optionsByQuestion.get(question.id) ?? [],
      passage: question.passage_id ? passageMap.get(question.passage_id) ?? null : null,
      usages: usageByQuestion.get(question.id) ?? [],
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    questionId?: string;
    examId?: string;
    sectionId?: string;
    marks?: number | null;
  };

  if (!body.questionId || !body.examId || !body.sectionId) {
    return NextResponse.json(
      { ok: false, message: "Select a question, exam, and section." },
      { status: 400 },
    );
  }

  const marks =
    body.marks === null || body.marks === undefined || body.marks === 0
      ? null
      : Number(body.marks);
  if (marks !== null && (!Number.isFinite(marks) || marks <= 0 || marks > 1000)) {
    return NextResponse.json({ ok: false, message: "Enter valid question marks." }, { status: 400 });
  }

  try {
    const result = await userRequest<Record<string, unknown>>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_admin_attach_question",
      {
        method: "POST",
        body: JSON.stringify({
          p_question_id: body.questionId,
          p_exam_id: body.examId,
          p_section_id: body.sectionId,
          p_marks: marks,
        }),
      },
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    let message = "Unable to add this question to the selected exam.";
    if (raw.includes("QUESTION_ALREADY_IN_EXAM")) message = "This question is already used in the selected exam.";
    if (raw.includes("QUESTION_COURSE_MISMATCH")) message = "The question and exam must belong to the same course.";
    if (raw.includes("QUESTION_INACTIVE")) message = "This question is inactive.";
    if (raw.includes("EXAM_ARCHIVED")) message = "Archived exams cannot be changed.";
    if (raw.includes("SECTION_NOT_FOUND")) message = "The selected section does not belong to this exam.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

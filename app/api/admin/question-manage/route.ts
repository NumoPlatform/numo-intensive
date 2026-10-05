import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, writeIntensiveAudit } from "@/lib/intensive/server";

type Mapping = {
  id: string;
  exam_id: string;
  section_id: string;
  question_id: string;
  marks: number;
  position: number;
};

async function requireAdmin(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return { error: NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 }) };
  if (auth.profile.role !== "ADMIN") {
    return { error: NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 }) };
  }
  return { auth };
}

async function recompute(examId: string, sectionId: string) {
  const sectionRows = await serviceRequest<Array<{ marks: number }>>(
    "/rest/v1/intensive_exam_questions?" + new URLSearchParams({
      select: "marks",
      exam_id: "eq." + examId,
      section_id: "eq." + sectionId,
    }).toString(),
  );
  const sectionMarks = sectionRows.reduce((sum, item) => sum + Number(item.marks || 0), 0);
  await serviceRequest<unknown>("/rest/v1/intensive_exam_sections?id=eq." + encodeURIComponent(sectionId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ marks: sectionMarks, question_count: sectionRows.length }),
  });

  const examRows = await serviceRequest<Array<{ marks: number }>>(
    "/rest/v1/intensive_exam_questions?" + new URLSearchParams({
      select: "marks",
      exam_id: "eq." + examId,
    }).toString(),
  );
  const total = examRows.reduce((sum, item) => sum + Number(item.marks || 0), 0);
  await serviceRequest<unknown>("/rest/v1/intensive_exams?id=eq." + encodeURIComponent(examId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ total_marks: total }),
  });
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  const examId = request.nextUrl.searchParams.get("examId") ?? "";
  if (!examId) return NextResponse.json({ ok: false, message: "Select an exam." }, { status: 400 });

  const mappings = await serviceRequest<Mapping[]>(
    "/rest/v1/intensive_exam_questions?" + new URLSearchParams({
      select: "id,exam_id,section_id,question_id,marks,position",
      exam_id: "eq." + examId,
      order: "position.asc",
    }).toString(),
  );
  if (!mappings.length) return NextResponse.json({ ok: true, questions: [] });

  const questionIds = [...new Set(mappings.map((item) => item.question_id))];
  const questions = await serviceRequest<Array<{
    id: string;
    skill: string;
    type: string;
    difficulty: string;
    prompt: string;
    passage_id: string | null;
    grading_mode: string;
    acceptable_answers: string[];
    correct_boolean: boolean | null;
    marks: number;
  }>>(
    "/rest/v1/intensive_questions?" + new URLSearchParams({
      select: "id,skill,type,difficulty,prompt,passage_id,grading_mode,acceptable_answers,correct_boolean,marks",
      id: "in.(" + questionIds.join(",") + ")",
    }).toString(),
  );

  const passageIds = [...new Set(questions.map((item) => item.passage_id).filter(Boolean) as string[])];
  const passages = passageIds.length
    ? await serviceRequest<Array<{ id: string; title: string; body: string }>>(
        "/rest/v1/intensive_passages?" + new URLSearchParams({
          select: "id,title,body",
          id: "in.(" + passageIds.join(",") + ")",
        }).toString(),
      )
    : [];

  const options = await serviceRequest<Array<{
    id: string;
    question_id: string;
    label: string;
    value: string;
    is_correct: boolean;
    position: number;
  }>>(
    "/rest/v1/intensive_question_options?" + new URLSearchParams({
      select: "id,question_id,label,value,is_correct,position",
      question_id: "in.(" + questionIds.join(",") + ")",
      order: "position.asc",
    }).toString(),
  );

  const questionMap = new Map(questions.map((item) => [item.id, item]));
  const passageMap = new Map(passages.map((item) => [item.id, item]));
  return NextResponse.json({
    ok: true,
    questions: mappings.map((mapping) => {
      const question = questionMap.get(mapping.question_id)!;
      return {
        ...mapping,
        ...question,
        mappingMarks: mapping.marks,
        passage: question?.passage_id ? passageMap.get(question.passage_id) ?? null : null,
        options: options.filter((item) => item.question_id === mapping.question_id),
      };
    }),
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  const body = (await request.json().catch(() => ({}))) as {
    examId?: string;
    questionId?: string;
    prompt?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    marks?: number;
    options?: Array<{ label: string; value?: string; isCorrect?: boolean }>;
    correctBoolean?: boolean | null;
    acceptableAnswers?: string[];
    gradingMode?: "AUTO" | "MANUAL";
    passageTitle?: string;
    passageBody?: string;
  };

  const examId = String(body.examId ?? "");
  const questionId = String(body.questionId ?? "");
  if (!examId || !questionId) {
    return NextResponse.json({ ok: false, message: "Select a question." }, { status: 400 });
  }

  const mappings = await serviceRequest<Mapping[]>(
    "/rest/v1/intensive_exam_questions?" + new URLSearchParams({
      select: "id,exam_id,section_id,question_id,marks,position",
      exam_id: "eq." + examId,
      question_id: "eq." + questionId,
      limit: "1",
    }).toString(),
  );
  const mapping = mappings[0];
  if (!mapping) return NextResponse.json({ ok: false, message: "This question is not in the exam." }, { status: 404 });

  const questionRows = await serviceRequest<Array<{
    id: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    passage_id: string | null;
  }>>(
    "/rest/v1/intensive_questions?" + new URLSearchParams({
      select: "id,type,passage_id",
      id: "eq." + questionId,
      limit: "1",
    }).toString(),
  );
  const question = questionRows[0];
  if (!question) return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });

  const marks = Number(body.marks ?? mapping.marks);
  if (!Number.isFinite(marks) || marks <= 0 || marks > 1000) {
    return NextResponse.json({ ok: false, message: "Enter valid marks for the question." }, { status: 400 });
  }
  if (!body.prompt || !String(body.prompt).trim()) {
    return NextResponse.json({ ok: false, message: "Question text is required." }, { status: 400 });
  }

  const questionPatch: Record<string, unknown> = {
    prompt: String(body.prompt).trim(),
    difficulty: body.difficulty ?? "MEDIUM",
    marks,
  };

  if (question.type === "TRUE_FALSE") {
    if (body.correctBoolean === null || body.correctBoolean === undefined) {
      return NextResponse.json({ ok: false, message: "Select the correct answer." }, { status: 400 });
    }
    questionPatch.correct_boolean = body.correctBoolean;
  }

  if (question.type === "SHORT_ANSWER") {
    const gradingMode = body.gradingMode ?? "AUTO";
    const acceptable = Array.isArray(body.acceptableAnswers)
      ? body.acceptableAnswers.map(String).map((item) => item.trim()).filter(Boolean)
      : [];
    if (gradingMode === "AUTO" && !acceptable.length) {
      return NextResponse.json({ ok: false, message: "Add an accepted answer or select manual grading." }, { status: 400 });
    }
    questionPatch.grading_mode = gradingMode;
    questionPatch.acceptable_answers = acceptable;
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const options = Array.isArray(body.options)
      ? body.options.map((item) => ({
          label: String(item.label ?? "").trim(),
          value: String(item.value ?? item.label ?? "").trim(),
          is_correct: Boolean(item.isCorrect),
        })).filter((item) => item.label)
      : [];
    if (options.length < 2 || options.filter((item) => item.is_correct).length !== 1) {
      return NextResponse.json({ ok: false, message: "Add at least two options and select exactly one correct answer." }, { status: 400 });
    }
    await serviceRequest<unknown>("/rest/v1/intensive_question_options?question_id=eq." + encodeURIComponent(questionId), {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    await serviceRequest<unknown>("/rest/v1/intensive_question_options", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(options.map((item, index) => ({
        question_id: questionId,
        label: item.label,
        value: item.value || item.label,
        is_correct: item.is_correct,
        position: index + 1,
      }))),
    });
  }

  const passageBody = String(body.passageBody ?? "").trim();
  const passageTitle = String(body.passageTitle ?? "").trim();
  if (passageBody) {
    if (question.passage_id) {
      await serviceRequest<unknown>("/rest/v1/intensive_passages?id=eq." + encodeURIComponent(question.passage_id), {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ title: passageTitle || "Reading Passage", body: passageBody }),
      });
    } else {
      const examRows = await serviceRequest<Array<{ course_id: string }>>(
        "/rest/v1/intensive_exams?" + new URLSearchParams({
          select: "course_id",
          id: "eq." + examId,
          limit: "1",
        }).toString(),
      );
      const created = await serviceRequest<Array<{ id: string }>>("/rest/v1/intensive_passages", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          course_id: examRows[0]?.course_id,
          title: passageTitle || "Reading Passage",
          body: passageBody,
          created_by: gate.auth.profile.id,
        }),
      });
      questionPatch.passage_id = created[0]?.id ?? null;
    }
  } else if (question.passage_id) {
    questionPatch.passage_id = null;
  }

  await serviceRequest<unknown>("/rest/v1/intensive_questions?id=eq." + encodeURIComponent(questionId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(questionPatch),
  });
  await serviceRequest<unknown>("/rest/v1/intensive_exam_questions?id=eq." + encodeURIComponent(mapping.id), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ marks }),
  });

  await recompute(examId, mapping.section_id);
  await writeIntensiveAudit(
    gate.auth.profile.id,
    "UPDATE_EXAM_QUESTION",
    "intensive_questions",
    questionId,
    { exam_id: examId, section_id: mapping.section_id, marks },
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("error" in gate) return gate.error;

  const body = (await request.json().catch(() => ({}))) as { examId?: string; questionId?: string };
  const examId = String(body.examId ?? "");
  const questionId = String(body.questionId ?? "");
  if (!examId || !questionId) {
    return NextResponse.json({ ok: false, message: "Select a question." }, { status: 400 });
  }

  const mappings = await serviceRequest<Mapping[]>(
    "/rest/v1/intensive_exam_questions?" + new URLSearchParams({
      select: "id,exam_id,section_id,question_id,marks,position",
      exam_id: "eq." + examId,
      question_id: "eq." + questionId,
      limit: "1",
    }).toString(),
  );
  const mapping = mappings[0];
  if (!mapping) return NextResponse.json({ ok: false, message: "Question not found." }, { status: 404 });

  await serviceRequest<unknown>("/rest/v1/intensive_exam_questions?id=eq." + encodeURIComponent(mapping.id), {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  const uses = await serviceRequest<Array<{ id: string }>>(
    "/rest/v1/intensive_exam_questions?" + new URLSearchParams({
      select: "id",
      question_id: "eq." + questionId,
      limit: "1",
    }).toString(),
  );
  if (!uses.length) {
    await serviceRequest<unknown>("/rest/v1/intensive_questions?id=eq." + encodeURIComponent(questionId), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_active: false }),
    });
  }

  await recompute(examId, mapping.section_id);
  await writeIntensiveAudit(
    gate.auth.profile.id,
    "REMOVE_EXAM_QUESTION",
    "intensive_questions",
    questionId,
    { exam_id: examId, section_id: mapping.section_id },
  );
  return NextResponse.json({ ok: true });
}

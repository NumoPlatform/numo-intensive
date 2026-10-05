import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest } from "@/lib/intensive/server";

const TYPES = new Set(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"]);
const DIFFICULTIES = new Set(["EASY", "MEDIUM", "HARD"]);

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    examId?: string;
    sectionId?: string;
    skill?: string;
    type?: string;
    prompt?: string;
    marks?: number;
    difficulty?: string;
    options?: Array<{ label: string; value?: string; isCorrect?: boolean }>;
    correctBoolean?: boolean | null;
    acceptableAnswers?: string[];
    gradingMode?: "AUTO" | "MANUAL";
    passageTitle?: string | null;
    passageBody?: string | null;
  };

  const type = String(body.type ?? "");
  const difficulty = String(body.difficulty ?? "MEDIUM");
  if (!TYPES.has(type)) {
    return NextResponse.json({ ok: false, message: "Select a valid question type." }, { status: 400 });
  }
  if (!DIFFICULTIES.has(difficulty)) {
    return NextResponse.json({ ok: false, message: "Select a valid difficulty level." }, { status: 400 });
  }

  const options = Array.isArray(body.options)
    ? body.options
        .map((item) => ({
          label: String(item.label ?? "").trim(),
          value: String(item.value ?? item.label ?? "").trim(),
          isCorrect: Boolean(item.isCorrect),
        }))
        .filter((item) => item.label)
    : null;

  const acceptableAnswers = Array.isArray(body.acceptableAnswers)
    ? body.acceptableAnswers.map((item) => String(item).trim()).filter(Boolean)
    : [];

  try {
    const result = await userRequest<{ question_id: string; passage_id: string | null; position: number }>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_admin_add_question",
      {
        method: "POST",
        body: JSON.stringify({
          p_exam_id: body.examId,
          p_section_id: body.sectionId,
          p_skill: String(body.skill ?? "").trim(),
          p_type: type,
          p_prompt: String(body.prompt ?? "").trim(),
          p_marks: Number(body.marks ?? 1),
          p_difficulty: difficulty,
          p_options: type === "MULTIPLE_CHOICE" ? options : null,
          p_correct_boolean: type === "TRUE_FALSE" ? body.correctBoolean : null,
          p_acceptable_answers: type === "SHORT_ANSWER" ? acceptableAnswers : [],
          p_grading_mode: type === "SHORT_ANSWER" ? body.gradingMode ?? "AUTO" : "AUTO",
          p_passage_title: String(body.passageTitle ?? "").trim() || null,
          p_passage_body: String(body.passageBody ?? "").trim() || null,
        }),
      },
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    let message = "Unable to add the question. Check its details.";
    if (raw.includes("MCQ_REQUIRES_ONE_CORRECT_OPTION")) message = "Select exactly one correct answer.";
    if (raw.includes("MCQ_OPTIONS_REQUIRED")) message = "Add at least two options for the multiple-choice question.";
    if (raw.includes("TRUE_FALSE_CORRECT_ANSWER_REQUIRED")) message = "Select whether the statement is true or false.";
    if (raw.includes("SHORT_ANSWER_ACCEPTABLE_ANSWER_REQUIRED")) {
      message = "Add an accepted answer for automatic grading or select manual grading.";
    }
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

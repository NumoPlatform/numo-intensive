import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest, verifyStudentDevice } from "@/lib/intensive/server";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "STUDENT" || !(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json({ ok: false, message: "This device is not authorized." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    attemptId?: string;
    questionId?: string;
    answer?: unknown;
    flagged?: boolean;
  };
  if (!body.attemptId || !body.questionId) {
    return NextResponse.json({ ok: false, message: "Required answer details are missing." }, { status: 400 });
  }

  try {
    const result = await userRequest<{ saved: boolean; saved_at: string }>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_save_answer_sectioned",
      {
        method: "POST",
        body: JSON.stringify({
          p_attempt_id: body.attemptId,
          p_question_id: body.questionId,
          p_answer: body.answer ?? null,
          p_flagged: Boolean(body.flagged),
        }),
      },
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        ok: false,
        message:
          raw.includes("SECTION_EXPIRED")
            ? "This section time has expired."
            : raw.includes("QUESTION_SECTION_LOCKED")
              ? "This question belongs to a locked section."
              : raw.includes("ATTEMPT_EXPIRED")
                ? "The attempt time has expired."
                : "Unable to save the answer.",
      },
      { status: raw.includes("ATTEMPT_EXPIRED") ? 409 : 400 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest } from "@/lib/intensive/server";

type DuplicateResult = {
  ok: boolean;
  exam_id: string;
  title: string;
  status: string;
};

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  }
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    examId?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
  };

  const examId = String(body.examId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const startsAt = String(body.startsAt ?? "").trim();
  const endsAt = String(body.endsAt ?? "").trim();

  if (!examId) {
    return NextResponse.json({ ok: false, message: "Select an exam." }, { status: 400 });
  }
  if (title.length < 2 || title.length > 160) {
    return NextResponse.json({ ok: false, message: "Enter a valid title for the duplicated exam." }, { status: 400 });
  }

  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return NextResponse.json({ ok: false, message: "Enter a valid schedule." }, { status: 400 });
  }

  try {
    const result = await userRequest<DuplicateResult>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_duplicate_exam",
      {
        method: "POST",
        body: JSON.stringify({
          p_source_exam_id: examId,
          p_title: title,
          p_starts_at: new Date(startMs).toISOString(),
          p_ends_at: new Date(endMs).toISOString(),
        }),
      },
    );

    return NextResponse.json({
      ok: true,
      examId: result.exam_id,
      title: result.title,
      status: result.status,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const message = raw.includes("EXAM_NOT_FOUND")
      ? "Exam not found."
      : raw.includes("INVALID_SCHEDULE")
        ? "Enter a valid schedule."
        : raw.includes("INVALID_TITLE")
          ? "Enter a valid exam title."
          : "Unable to duplicate the exam.";

    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

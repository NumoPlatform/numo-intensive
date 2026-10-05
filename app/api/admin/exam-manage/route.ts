import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, writeIntensiveAudit } from "@/lib/intensive/server";

const CATEGORIES = new Set([
  "QUIZ 1",
  "QUIZ 2",
  "MIDTERM",
  "FINAL",
  "MOCK EXAM",
  "PRACTICE EXAM",
  "CUSTOM",
]);
const RELEASES = new Set(["IMMEDIATE", "AFTER_END", "MANUAL"]);

type ExamRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  instructions: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  attempts_allowed: number;
  total_marks: number;
  passing_score: number | null;
  result_release: string;
  status: string;
};

function scheduleStatus(startsAt: string, endsAt: string) {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return now < start ? "SCHEDULED" : now <= end ? "LIVE" : "CLOSED";
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    examId?: string;
    action?: "ARCHIVE" | "RESTORE";
    title?: string;
    category?: string;
    description?: string | null;
    instructions?: string;
    startsAt?: string;
    endsAt?: string;
    durationMinutes?: number;
    attemptsAllowed?: number;
    passingScore?: number | null;
    resultRelease?: string;
    sectionDurations?: Record<string, number>;
  };

  const examId = String(body.examId ?? "");
  if (!examId) {
    return NextResponse.json({ ok: false, message: "Select an exam." }, { status: 400 });
  }

  const rows = await serviceRequest<ExamRow[]>(
    "/rest/v1/intensive_exams?" + new URLSearchParams({
      select: "id,title,category,description,instructions,starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,passing_score,result_release,status",
      id: "eq." + examId,
      limit: "1",
    }).toString(),
  );
  const exam = rows[0];
  if (!exam) {
    return NextResponse.json({ ok: false, message: "Exam not found." }, { status: 404 });
  }

  if (body.action) {
    const status =
      body.action === "ARCHIVE"
        ? "ARCHIVED"
        : scheduleStatus(exam.starts_at, exam.ends_at);

    await serviceRequest<unknown>("/rest/v1/intensive_exams?id=eq." + encodeURIComponent(examId), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status }),
    });

    await writeIntensiveAudit(
      auth.profile.id,
      body.action === "ARCHIVE" ? "ARCHIVE_EXAM" : "RESTORE_EXAM",
      "intensive_exams",
      examId,
      { status },
    );
    return NextResponse.json({ ok: true, status });
  }

  const structuralChange =
    body.category !== undefined ||
    body.startsAt !== undefined ||
    body.endsAt !== undefined ||
    body.durationMinutes !== undefined ||
    body.attemptsAllowed !== undefined ||
    body.passingScore !== undefined ||
    body.sectionDurations !== undefined;

  if (structuralChange) {
    const attempts = await serviceRequest<Array<{ id: string }>>(
      "/rest/v1/intensive_exam_attempts?" + new URLSearchParams({
        select: "id",
        exam_id: "eq." + examId,
        limit: "1",
      }).toString(),
    );
    if (attempts.length) {
      return NextResponse.json(
        { ok: false, message: "Timing, attempt limits, and passing score cannot be changed after an attempt has started. You can still update descriptive text and the result release policy." },
        { status: 409 },
      );
    }
  }

  let sectionDurationEntries: Array<[string, number]> = [];
  if (body.sectionDurations !== undefined) {
    sectionDurationEntries = Object.entries(body.sectionDurations).map(([sectionId, minutes]) => [
      sectionId,
      Number(minutes),
    ]);
    if (
      !sectionDurationEntries.length ||
      sectionDurationEntries.some(([sectionId, minutes]) =>
        !sectionId || !Number.isInteger(minutes) || minutes < 1 || minutes > 240
      )
    ) {
      return NextResponse.json(
        { ok: false, message: "Each section duration must be between 1 and 240 minutes." },
        { status: 400 },
      );
    }

    const sectionIds = sectionDurationEntries.map(([sectionId]) => sectionId);
    const existingSections = await serviceRequest<Array<{ id: string }>>(
      "/rest/v1/intensive_exam_sections?" + new URLSearchParams({
        select: "id",
        exam_id: "eq." + examId,
      }).toString(),
    );
    const allowed = new Set(existingSections.map((item) => item.id));
    if (sectionIds.some((id) => !allowed.has(id))) {
      return NextResponse.json({ ok: false, message: "One or more sections do not belong to this exam." }, { status: 400 });
    }
  }

  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (title.length < 2 || title.length > 160) {
      return NextResponse.json({ ok: false, message: "Enter a valid exam title." }, { status: 400 });
    }
    patch.title = title;
  }

  if (body.category !== undefined) {
    if (!CATEGORIES.has(body.category)) {
      return NextResponse.json({ ok: false, message: "Select a valid exam category." }, { status: 400 });
    }
    patch.category = body.category;
  }

  if (body.description !== undefined) {
    patch.description = String(body.description ?? "").trim() || null;
  }

  if (body.instructions !== undefined) {
    const instructions = String(body.instructions).trim();
    if (!instructions) {
      return NextResponse.json({ ok: false, message: "Exam instructions are required." }, { status: 400 });
    }
    patch.instructions = instructions;
  }

  const startsAt = body.startsAt ?? exam.starts_at;
  const endsAt = body.endsAt ?? exam.ends_at;
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return NextResponse.json({ ok: false, message: "Enter valid start and end times." }, { status: 400 });
  }
  if (body.startsAt !== undefined) patch.starts_at = new Date(startsAt).toISOString();
  if (body.endsAt !== undefined) patch.ends_at = new Date(endsAt).toISOString();

  if (body.durationMinutes !== undefined) {
    const duration = Number(body.durationMinutes);
    if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
      return NextResponse.json({ ok: false, message: "Exam duration must be between 1 and 480 minutes." }, { status: 400 });
    }
    patch.duration_minutes = duration;
  }

  if (body.attemptsAllowed !== undefined) {
    const attempts = Number(body.attemptsAllowed);
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 20) {
      return NextResponse.json({ ok: false, message: "Allowed attempts must be between 1 and 20." }, { status: 400 });
    }
    patch.attempts_allowed = attempts;
  }

  if (body.passingScore !== undefined) {
    if (body.passingScore === null) {
      patch.passing_score = null;
    } else {
      const passing = Number(body.passingScore);
      if (!Number.isFinite(passing) || passing < 0 || passing > Number(exam.total_marks)) {
        return NextResponse.json(
          { ok: false, message: "The passing score must be between 0 and the total marks." },
          { status: 400 },
        );
      }
      patch.passing_score = passing;
    }
  }

  if (body.resultRelease !== undefined) {
    if (!RELEASES.has(body.resultRelease)) {
      return NextResponse.json({ ok: false, message: "Select a valid result release policy." }, { status: 400 });
    }
    patch.result_release = body.resultRelease;
  }

  if (exam.status !== "ARCHIVED" && (body.startsAt !== undefined || body.endsAt !== undefined)) {
    patch.status = scheduleStatus(String(patch.starts_at ?? exam.starts_at), String(patch.ends_at ?? exam.ends_at));
  }

  if (!Object.keys(patch).length && !sectionDurationEntries.length) {
    return NextResponse.json({ ok: false, message: "There are no changes to save." }, { status: 400 });
  }

  if (Object.keys(patch).length) {
    await serviceRequest<unknown>("/rest/v1/intensive_exams?id=eq." + encodeURIComponent(examId), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
  }

  for (const [sectionId, timeLimitMinutes] of sectionDurationEntries) {
    await serviceRequest<unknown>(
      "/rest/v1/intensive_exam_sections?" + new URLSearchParams({
        id: "eq." + sectionId,
        exam_id: "eq." + examId,
      }).toString(),
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ time_limit_minutes: timeLimitMinutes }),
      },
    );
  }

  await writeIntensiveAudit(
    auth.profile.id,
    "UPDATE_EXAM_SETTINGS",
    "intensive_exams",
    examId,
    {
      ...patch,
      ...(sectionDurationEntries.length
        ? { sectionDurations: Object.fromEntries(sectionDurationEntries) }
        : {}),
    },
  );

  return NextResponse.json({ ok: true, status: patch.status ?? exam.status });
}

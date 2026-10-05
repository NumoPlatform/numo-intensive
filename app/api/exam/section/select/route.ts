import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest, verifyStudentDevice } from "@/lib/intensive/server";

type SelectSectionResult = {
  attempt_id: string;
  section_id: string;
  section_title: string;
  section_position: number;
  time_limit_minutes: number;
  section_expires_at: string;
  section_progress: Record<string, unknown>;
  section_attempt_id: string | null;
  section_attempt_number: number;
  attempts_allowed: number;
  attempts_remaining: number;
  resumed: boolean;
};

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "STUDENT" || !(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json({ ok: false, message: "This device is not authorized." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { attemptId?: string; sectionId?: string };
  if (!body.attemptId || !body.sectionId) {
    return NextResponse.json({ ok: false, message: "Select a section." }, { status: 400 });
  }

  try {
    const result = await userRequest<SelectSectionResult>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_select_section",
      {
        method: "POST",
        body: JSON.stringify({
          p_attempt_id: body.attemptId,
          p_section_id: body.sectionId,
        }),
      },
    );
    return NextResponse.json({
      ok: true,
      result: {
        attemptId: result.attempt_id,
        sectionId: result.section_id,
        sectionTitle: result.section_title,
        sectionPosition: Number(result.section_position ?? 0),
        timeLimitMinutes: Number(result.time_limit_minutes ?? 0),
        sectionExpiresAt: result.section_expires_at,
        sectionProgress: result.section_progress ?? {},
        sectionAttemptId: result.section_attempt_id,
        sectionAttemptNumber: Number(result.section_attempt_number ?? 1),
        attemptsAllowed: Number(result.attempts_allowed ?? 1),
        attemptsRemaining: Number(result.attempts_remaining ?? 0),
        resumed: Boolean(result.resumed),
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    const message =
      raw.includes("SECTION_ATTEMPTS_EXHAUSTED")
        ? "You have used all attempts for this section."
        : raw.includes("SECTION_ALREADY_ACTIVE")
          ? "Finish the active section before opening another section."
          : raw.includes("ATTEMPT_EXPIRED")
            ? "This attempt has expired."
            : raw.includes("SECTION_NOT_FOUND")
              ? "This section is not available."
              : "Unable to open this section.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

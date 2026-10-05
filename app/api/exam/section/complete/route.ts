import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest, verifyStudentDevice } from "@/lib/intensive/server";
import { enrichSectionReview, type RawSectionReviewItem } from "@/lib/intensive/section-review";

type CompleteSectionResult = {
  finished: boolean;
  attempt_id: string;
  section_id: string;
  section_title: string;
  section_attempt_id: string;
  section_attempt_number: number;
  attempts_allowed: number;
  attempts_remaining: number;
  score: number;
  total_marks: number;
  percentage: number;
  correct_count: number;
  wrong_count: number;
  question_count: number;
  best_score: number;
  best_percentage: number;
  review: RawSectionReviewItem[];
  completed_sections: number;
  total_sections: number;
  section_progress: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "STUDENT" || !(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json({ ok: false, message: "This device is not authorized." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { attemptId?: string };
  if (!body.attemptId) {
    return NextResponse.json({ ok: false, message: "Select an attempt." }, { status: 400 });
  }

  try {
    const result = await userRequest<CompleteSectionResult>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_complete_current_section",
      {
        method: "POST",
        body: JSON.stringify({ p_attempt_id: body.attemptId }),
      },
    );
    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        review: (result.review ?? []).map(enrichSectionReview),
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        ok: false,
        message: raw.includes("ATTEMPT_NOT_ACTIVE")
          ? "This attempt is no longer active."
          : "Unable to complete this section.",
      },
      { status: 400 },
    );
  }
}

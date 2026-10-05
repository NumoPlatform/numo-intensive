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
        sectionId: result.section_id,
        sectionTitle: result.section_title,
        sectionAttemptId: result.section_attempt_id,
        sectionAttemptNumber: Number(result.section_attempt_number ?? 1),
        attemptsAllowed: Number(result.attempts_allowed ?? 1),
        attemptsRemaining: Number(result.attempts_remaining ?? 0),
        score: Number(result.score ?? 0),
        totalMarks: Number(result.total_marks ?? 0),
        percentage: Number(result.percentage ?? 0),
        correctCount: Number(result.correct_count ?? 0),
        wrongCount: Number(result.wrong_count ?? 0),
        questionCount: Number(result.question_count ?? 0),
        bestScore: Number(result.best_score ?? 0),
        bestPercentage: Number(result.best_percentage ?? 0),
        review: (result.review ?? []).map(enrichSectionReview),
        completedSections: Number(result.completed_sections ?? 0),
        totalSections: Number(result.total_sections ?? 0),
        allSectionsCompleted: Boolean(result.finished),
        sectionProgress: result.section_progress ?? {},
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

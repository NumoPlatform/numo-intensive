import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, verifyStudentDevice } from "@/lib/intensive/server";
import { enrichSectionReview, type RawSectionReviewItem } from "@/lib/intensive/section-review";
import { getSectionWritingReport } from "@/lib/intensive/writing-result";

type SectionAttemptRow = {
  id: string;
  exam_attempt_id: string;
  section_id: string;
  attempt_number: number;
  status: string;
  completed_at: string | null;
  score: number;
  total_marks: number;
  percentage: number | null;
  correct_count: number;
  wrong_count: number;
  review_snapshot: RawSectionReviewItem[];
};

type ExamRow = {
  attempts_allowed: number;
};

type SectionRow = {
  id: string;
  exam_id: string;
  title: string;
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "STUDENT" || !(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json({ ok: false, message: "This device is not authorized." }, { status: 403 });
  }

  const attemptId = request.nextUrl.searchParams.get("attemptId")?.trim() ?? "";
  const sectionId = request.nextUrl.searchParams.get("sectionId")?.trim() ?? "";
  if (!attemptId || !sectionId) {
    return NextResponse.json({ ok: false, message: "Attempt and section are required." }, { status: 400 });
  }

  try {
    const attempts = await serviceRequest<SectionAttemptRow[]>(
      "/rest/v1/intensive_section_attempts?" +
        new URLSearchParams({
          select: "id,exam_attempt_id,section_id,attempt_number,status,completed_at,score,total_marks,percentage,correct_count,wrong_count,review_snapshot",
          exam_attempt_id: "eq." + attemptId,
          section_id: "eq." + sectionId,
          student_id: "eq." + auth.profile.id,
          status: "in.(GRADED,EXPIRED)",
          order: "attempt_number.desc",
        }).toString(),
    );

    const latest = attempts[0];
    const best = [...attempts].sort(
      (a, b) => Number(b.percentage ?? 0) - Number(a.percentage ?? 0),
    )[0];
    if (!latest) {
      return NextResponse.json({ ok: false, message: "No completed result is available for this section yet." }, { status: 404 });
    }

    const sections = await serviceRequest<SectionRow[]>(
      "/rest/v1/intensive_exam_sections?" +
        new URLSearchParams({
          select: "id,exam_id,title",
          id: "eq." + sectionId,
          limit: "1",
        }).toString(),
    );
    const section = sections[0];
    if (!section) return NextResponse.json({ ok: false, message: "Section not found." }, { status: 404 });

    const exams = await serviceRequest<ExamRow[]>(
      "/rest/v1/intensive_exams?" +
        new URLSearchParams({
          select: "attempts_allowed",
          id: "eq." + section.exam_id,
          limit: "1",
        }).toString(),
    );
    const attemptsAllowed = Number(exams[0]?.attempts_allowed ?? 1);
    const pendingRows = await serviceRequest<Array<{ question_id: string }>>(
      "/rest/v1/intensive_writing_pending?" +
        new URLSearchParams({
          select: "question_id",
          section_attempt_id: "eq." + latest.id,
          student_id: "eq." + auth.profile.id,
          status: "eq.PENDING",
          limit: "1",
        }).toString(),
    );
    const pending = pendingRows[0] ?? null;
    const writingReport = pending ? null : await getSectionWritingReport(latest.id, auth.profile.id);

    const [allSections, completedSectionAttempts] = await Promise.all([
      serviceRequest<Array<{ id: string }>>(
        "/rest/v1/intensive_exam_sections?" +
          new URLSearchParams({
            select: "id",
            exam_id: "eq." + section.exam_id,
            is_enabled: "eq.true",
          }).toString(),
      ),
      serviceRequest<Array<{ section_id: string }>>(
        "/rest/v1/intensive_section_attempts?" +
          new URLSearchParams({
            select: "section_id",
            exam_attempt_id: "eq." + attemptId,
            student_id: "eq." + auth.profile.id,
            status: "in.(GRADED,EXPIRED)",
          }).toString(),
      ),
    ]);
    const completedSectionIds = new Set(completedSectionAttempts.map((item) => item.section_id));
    const allSectionsCompleted =
      allSections.length > 0 && allSections.every((item) => completedSectionIds.has(item.id));

    return NextResponse.json({
      ok: true,
      result: {
        sectionId,
        sectionTitle: section.title,
        sectionAttemptId: latest.id,
        sectionAttemptNumber: latest.attempt_number,
        attemptsAllowed,
        attemptsRemaining: attemptsAllowed === 0 ? -1 : Math.max(0, attemptsAllowed - latest.attempt_number),
        score: pending ? null : Number(latest.score ?? 0),
        totalMarks: Number(latest.total_marks ?? 0),
        percentage: pending ? null : Number(latest.percentage ?? 0),
        gradingStatus: pending ? "PENDING" : "GRADED",
        pendingQuestionId: pending?.question_id ?? null,
        writingReport,
        bestScore: Number(best?.score ?? latest.score ?? 0),
        bestPercentage: Number(best?.percentage ?? latest.percentage ?? 0),
        correctCount: Number(latest.correct_count ?? 0),
        wrongCount: Number(latest.wrong_count ?? 0),
        questionCount: Number(latest.correct_count ?? 0) + Number(latest.wrong_count ?? 0),
        review: (latest.review_snapshot ?? []).map(enrichSectionReview),
        allSectionsCompleted,
        completedAt: latest.completed_at,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to load this section result." }, { status: 500 });
  }
}

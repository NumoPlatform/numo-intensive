import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest, verifyStudentDevice } from "@/lib/intensive/server";

type SubmitResult = {
  submitted: boolean;
  result_id?: string;
  attempt_id?: string;
  pending_grading?: boolean;
};

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "STUDENT" || !(await verifyStudentDevice(request, auth.accessToken))) {
    return NextResponse.json({ ok: false, message: "This device is not authorized." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { attemptId?: string };
  if (!body.attemptId) return NextResponse.json({ ok: false, message: "Select an attempt." }, { status: 400 });

  try {
    const result = await userRequest<SubmitResult>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_submit_attempt_sectioned",
      { method: "POST", body: JSON.stringify({ p_attempt_id: body.attemptId }) },
    );

    const query = new URLSearchParams({
      select: "final_score,total_marks,percentage,status,grading_status,is_published,published_at",
      attempt_id: "eq." + body.attemptId,
      limit: "1",
    });
    const visibleResults = await userRequest<Array<{
      final_score: number | null;
      total_marks: number;
      percentage: number | null;
      status: string | null;
      grading_status: string;
      is_published: boolean;
      published_at: string | null;
    }>>(
      auth.accessToken,
      "/rest/v1/intensive_results?" + query.toString(),
      { method: "GET" },
    );

    const sectionBreakdown = await userRequest<Array<{
      sectionId: string;
      title: string;
      score: number;
      totalMarks: number;
      percentage: number;
    }>>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_attempt_score_breakdown",
      { method: "POST", body: JSON.stringify({ p_attempt_id: body.attemptId }) },
    );

    return NextResponse.json({
      ok: true,
      result,
      publishedResult: visibleResults[0] ?? null,
      sectionBreakdown,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to submit the attempt." }, { status: 400 });
  }
}

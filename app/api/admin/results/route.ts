import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, userRequest } from "@/lib/intensive/server";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });

  const resultQuery = new URLSearchParams({
    select: "attempt_id,exam_id,student_id,final_score,total_marks,percentage,status,grading_status,is_published,created_at",
    grading_status: "eq.COMPLETE",
    is_published: "eq.false",
    order: "created_at.desc",
    limit: "200",
  });
  const results = await serviceRequest<Array<{
    attempt_id: string;
    exam_id: string;
    student_id: string;
    final_score: number | null;
    total_marks: number;
    percentage: number | null;
    status: string | null;
    grading_status: string;
    is_published: boolean;
    created_at: string;
  }>>("/rest/v1/intensive_results?" + resultQuery.toString());

  if (!results.length) return NextResponse.json({ ok: true, results: [] });

  const studentIds = [...new Set(results.map((item) => item.student_id))];
  const examIds = [...new Set(results.map((item) => item.exam_id))];
  const [students, exams] = await Promise.all([
    serviceRequest<Array<{ id: string; full_name: string; username: string }>>(
      "/rest/v1/intensive_profiles?" + new URLSearchParams({
        select: "id,full_name,username",
        id: "in.(" + studentIds.join(",") + ")",
      }).toString(),
    ),
    serviceRequest<Array<{ id: string; title: string; category: string }>>(
      "/rest/v1/intensive_exams?" + new URLSearchParams({
        select: "id,title,category",
        id: "in.(" + examIds.join(",") + ")",
      }).toString(),
    ),
  ]);

  const studentMap = new Map(students.map((item) => [item.id, item]));
  const examMap = new Map(exams.map((item) => [item.id, item]));
  return NextResponse.json({
    ok: true,
    results: results.map((item) => ({
      ...item,
      student: studentMap.get(item.student_id) ?? null,
      exam: examMap.get(item.exam_id) ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { attemptId?: string };
  if (!body.attemptId) return NextResponse.json({ ok: false, message: "Select an attempt." }, { status: 400 });

  try {
    const result = await userRequest<Record<string, unknown>>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_finalize_grading",
      {
        method: "POST",
        body: JSON.stringify({ p_attempt_id: body.attemptId, p_publish: true }),
      },
    );
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to publish the result." }, { status: 400 });
  }
}

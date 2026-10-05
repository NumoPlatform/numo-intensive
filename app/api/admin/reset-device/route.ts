import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest } from "@/lib/intensive/server";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { studentId?: string };
  if (!body.studentId) {
    return NextResponse.json({ ok: false, message: "Select a student." }, { status: 400 });
  }

  try {
    await userRequest<boolean>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_reset_device",
      { method: "POST", body: JSON.stringify({ p_student_id: body.studentId }) },
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to reset the trusted device." }, { status: 400 });
  }
}

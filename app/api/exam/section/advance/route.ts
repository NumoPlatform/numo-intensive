import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest, verifyStudentDevice } from "@/lib/intensive/server";

type AdvanceResult = {
  finished: boolean;
  attempt_id: string;
  section_id?: string;
  section_title?: string;
  section_position?: number;
  time_limit_minutes?: number;
  section_expires_at?: string;
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
    const result = await userRequest<AdvanceResult>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_advance_section",
      {
        method: "POST",
        body: JSON.stringify({ p_attempt_id: body.attemptId }),
      },
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        ok: false,
        message: raw.includes("ATTEMPT_NOT_ACTIVE")
          ? "This attempt is no longer active."
          : "Unable to continue to the next section.",
      },
      { status: 400 },
    );
  }
}

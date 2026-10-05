import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest } from "@/lib/intensive/server";

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok:false, message:"انتهت الجلسة." }, { status:401 });
  if (auth.profile.role !== "ADMIN") return NextResponse.json({ ok:false, message:"غير مصرح." }, { status:403 });

  const body = (await request.json().catch(()=>({}))) as {
    courseId?: string;
    title?: string;
    description?: string;
    isActive?: boolean;
  };

  try {
    const result = await userRequest<Record<string,unknown>>(auth.accessToken, "/rest/v1/rpc/intensive_admin_update_course", {
      method:"POST",
      body:JSON.stringify({
        p_course_id: body.courseId,
        p_title: String(body.title ?? "").trim(),
        p_description: String(body.description ?? ""),
        p_is_active: body.isActive,
      }),
    });
    return NextResponse.json({ ok:true, course:result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ ok:false, message: message.includes("INVALID_COURSE_TITLE") ? "اسم المقرر غير صالح." : "تعذر تحديث المقرر." }, { status:400 });
  }
}

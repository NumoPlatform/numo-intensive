import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, userRequest } from "@/lib/intensive/server";

async function requireAdmin(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return { response: NextResponse.json({ ok:false, message:"انتهت الجلسة." }, { status:401 }) };
  if (auth.profile.role !== "ADMIN") return { response: NextResponse.json({ ok:false, message:"غير مصرح." }, { status:403 }) };
  return { auth };
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("response" in gate) return gate.response;
  try {
    const settings = await userRequest<Record<string,unknown>>(
      gate.auth!.accessToken,
      "/rest/v1/rpc/intensive_admin_get_settings",
      { method:"POST", body:"{}" },
    );
    return NextResponse.json({ ok:true, settings });
  } catch {
    return NextResponse.json({ ok:false, message:"تعذر تحميل إعدادات النظام." }, { status:500 });
  }
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin(request);
  if ("response" in gate) return gate.response;
  const body = (await request.json().catch(()=>({}))) as {
    supportPhone?:string;
    supportWhatsapp?:string;
    supportWebsite?:string;
    supportEmail?:string;
    timezone?:string;
    defaultSectionMinutes?:number;
    defaultAttempts?:number;
    defaultResultRelease?:string;
  };
  try {
    const settings = await userRequest<Record<string,unknown>>(
      gate.auth!.accessToken,
      "/rest/v1/rpc/intensive_admin_update_settings",
      {
        method:"POST",
        body:JSON.stringify({
          p_support_phone:String(body.supportPhone??""),
          p_support_whatsapp:String(body.supportWhatsapp??""),
          p_support_website:String(body.supportWebsite??""),
          p_support_email:String(body.supportEmail??""),
          p_timezone:String(body.timezone??"Asia/Riyadh"),
          p_default_section_minutes:Number(body.defaultSectionMinutes??30),
          p_default_attempts:Number(body.defaultAttempts??4),
          p_default_result_release:String(body.defaultResultRelease??"IMMEDIATE"),
        }),
      },
    );
    return NextResponse.json({ ok:true, settings });
  } catch {
    return NextResponse.json({ ok:false, message:"تعذر حفظ إعدادات النظام." }, { status:400 });
  }
}

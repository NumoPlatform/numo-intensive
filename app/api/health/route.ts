import { NextResponse } from "next/server";
import { publicRequest } from "@/lib/intensive/server";

export async function GET() {
  try {
    const health = await publicRequest<{ database?: string; courses?: number; timestamp?: string }>(
      "/rest/v1/rpc/intensive_public_health",
      { method: "POST", body: "{}" },
    );

    return NextResponse.json(
      {
        ok: true,
        service: "NUMO INTENSIVE",
        database: health.database ?? "ready",
        courses: health.courses ?? 0,
        timestamp: health.timestamp ?? new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "NUMO INTENSIVE",
        database: "unavailable",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

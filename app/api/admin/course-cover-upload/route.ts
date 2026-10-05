import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  intensiveStoragePublicUrl,
  serviceRawRequest,
  serviceRequest,
  writeIntensiveAudit,
} from "@/lib/intensive/server";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

function validImageSignature(bytes: Buffer, mime: string) {
  if (mime === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
  }

  if (mime === "image/jpeg") {
    return bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
  }

  if (mime === "image/webp") {
    return bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const form = await request.formData();
  const courseId = String(form.get("courseId") ?? "");
  const file = form.get("file");

  if (!courseId) {
    return NextResponse.json({ ok: false, message: "Select a course." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Select a cover image." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, message: "Only PNG, JPEG, and WebP images are supported." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "The image must be between 1 byte and 5 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) {
    return NextResponse.json(
      { ok: false, message: "The selected file does not match its declared image format." },
      { status: 400 },
    );
  }

  const courseRows = await serviceRequest<Array<{ id: string }>>(
    "/rest/v1/intensive_courses?" + new URLSearchParams({
      select: "id",
      id: "eq." + courseId,
      limit: "1",
    }).toString(),
  );
  if (!courseRows[0]) {
    return NextResponse.json({ ok: false, message: "Course not found." }, { status: 404 });
  }

  const objectPath = encodeURIComponent(courseId) + "/cover";
  const upload = await serviceRawRequest(
    "/storage/v1/object/intensive-covers/" + objectPath,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "x-upsert": "true",
        "Cache-Control": "3600",
      },
      body: bytes,
    },
  );

  if (!upload.ok) {
    const detail = await upload.text().catch(() => "");
    return NextResponse.json(
      { ok: false, message: detail ? "Unable to upload the cover to storage." : "Unable to upload the cover." },
      { status: 500 },
    );
  }

  const publicUrl = intensiveStoragePublicUrl("intensive-covers", objectPath) + "?v=" + Date.now();

  await serviceRequest<unknown>("/rest/v1/intensive_courses?id=eq." + encodeURIComponent(courseId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ default_cover_url: publicUrl }),
  });

  await writeIntensiveAudit(
    auth.profile.id,
    "UPDATE_COURSE_COVER",
    "intensive_courses",
    courseId,
    { cover_url: publicUrl, source: "UPLOAD" },
  );

  return NextResponse.json({ ok: true, url: publicUrl });
}

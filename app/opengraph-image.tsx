import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const alt = "محاكي نُمو — تعلّم مع نُمو، اختبر نفسك مع محاكي نُمو";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Exact user-approved card. At build time, copy the provided artwork into the
// site's own static Open Graph image, so chat apps receive the actual picture.
const source = "https://d2ol7oe51mr4n9.cloudfront.net/user_387CgECRaZUrXUVQQOH52f4rZ37/c48203ac-88fa-4838-8d89-b9ad514ac4a4.png";

export default async function OpenGraphImage() {
  const response = await fetch(source, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("Cannot load the approved NUMO preview card (" + response.status + ")");
  }
  const imageBytes = Buffer.from(await response.arrayBuffer());
  if (!imageBytes.length) throw new Error("Approved NUMO preview card is empty");
  const imageData = "data:image/png;base64," + imageBytes.toString("base64");

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <img src={imageData} alt={alt} width={1200} height={630} style={{ width: "100%", height: "100%", objectFit: "fill" }} />
    </div>,
    { ...size }
  );
}

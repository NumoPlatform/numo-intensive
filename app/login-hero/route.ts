// Immutable approved NUMO concept illustration. Cache the original image at
// build time on the simulator's own host; never embed a form as an image.
export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = false;

const approvedArtwork = "https://d2ol7oe51mr4n9.cloudfront.net/user_387CgECRaZUrXUVQQOH52f4rZ37/69c70e98-dcd6-49d4-9ea1-78931de8a1d4.png";

export async function GET() {
  const response = await fetch(approvedArtwork, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("Approved NUMO Student Login artwork could not be downloaded: " + response.status);
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 10000) throw new Error("Approved NUMO artwork is incomplete.");
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

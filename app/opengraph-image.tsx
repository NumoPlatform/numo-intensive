import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const alt = "محاكي نُمو — تعلّم واختبر واستعد بثقة";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const navy = "#1F2B5E";
const copper = "#B1785C";
const levels = ["EL097", "EL098", "EL099", "EL111", "EL112"];

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", position: "relative",
      overflow: "hidden", color: "#FFFFFF", fontFamily: "sans-serif",
      background: "linear-gradient(128deg, #081334 0%, #172857 58%, #343C79 100%)",
    }}>
      {/* Quiet copper architectural arches and illuminated academic orbit. */}
      <div style={{ display: "flex", position: "absolute", width: 820, height: 820, right: -195, top: -390, borderRadius: 820, border: "3px solid rgba(227,185,150,.40)" }} />
      <div style={{ display: "flex", position: "absolute", width: 730, height: 730, right: -150, top: -343, borderRadius: 730, border: "1px solid rgba(255,255,255,.25)" }} />
      <div style={{ display: "flex", position: "absolute", width: 600, height: 600, left: -350, bottom: -310, borderRadius: 600, border: "2px solid rgba(177,120,92,.32)" }} />
      <div style={{ display: "flex", position: "absolute", width: 1140, height: 566, left: 30, top: 30, borderRadius: 28, border: "1px solid rgba(229,189,156,.4)" }} />

      <div style={{ display: "flex", position: "absolute", top: 57, left: 69, alignItems: "center" }}>
        <div style={{ display: "flex", width: 58, height: 58, alignItems: "center", justifyContent: "center", border: "2px solid #D7AE8D", borderRadius: 15, fontWeight: 900, fontSize: 32, color: "#E8C09E", background: navy }}>N</div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 15 }}>
          <div style={{ display: "flex", fontSize: 25, letterSpacing: 3, fontWeight: 900 }}>NUMO PLATFORM</div>
          <div style={{ display: "flex", fontSize: 14, letterSpacing: 3, color: "#E8C09E" }}>ACADEMIC LEARNING</div>
        </div>
      </div>

      {/* The shared-page title is bilingual; strong contrast works in small chat thumbnails. */}
      <div style={{ display: "flex", position: "absolute", top: 167, left: 72, width: 660, flexDirection: "column" }}>
        <div style={{ display: "flex", color: "#E8B58C", fontWeight: 800, fontSize: 17, letterSpacing: 3 }}>EXPLORE · PRACTICE · ACHIEVE</div>
        <div style={{ display: "flex", fontSize: 75, fontWeight: 900, letterSpacing: -2, lineHeight: 1.08, marginTop: 17 }}>NUMO</div>
        <div style={{ display: "flex", fontSize: 51, fontWeight: 900, letterSpacing: -1, color: "#ECC39F", lineHeight: 1.11 }}>SIMULATOR</div>
        <div style={{ display: "flex", width: 500, height: 3, marginTop: 22, background: "linear-gradient(90deg,#D7A17B,#F1CCAA,transparent)" }} />
        <div style={{ display: "flex", fontSize: 23, marginTop: 17, color: "#F6F2EF" }}>Interactive Exams · Instant Results</div>
        <div style={{ display: "flex", fontSize: 18, marginTop: 8, color: "#C8D2E7" }}>Prepare with confidence. Learn with NUMO.</div>
      </div>

      <div style={{
        display: "flex", position: "absolute", right: 65, top: 123, width: 435, height: 360,
        borderRadius: 25, border: "2px solid #D9AE8A", background: "linear-gradient(145deg,#FFFDF9,#EDE9EA)",
        flexDirection: "column", padding: 20, boxShadow: "0 30px 50px rgba(0,0,0,.35)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #DBC8C1", paddingBottom: 16 }}>
          <div style={{ display: "flex", color: navy, fontWeight: 900, fontSize: 21 }}>ACADEMIC COURSES</div>
          <div style={{ display: "flex", fontSize: 14, color: copper, fontWeight: 900 }}>NUMO</div>
        </div>
        <div style={{ display: "flex", marginTop: 19, gap: 12, justifyContent: "center", alignItems: "center" }}>
          {levels.slice(0, 3).map((code, index) => (
            <div key={code} style={{
              display: "flex", width: 118, height: 171, borderRadius: 14, alignItems: "center",
              flexDirection: "column", justifyContent: "space-between", padding: 11,
              background: index === 1 ? "linear-gradient(150deg,#334584,#1A2855)" : "linear-gradient(150deg,#1F2B5E,#0C1A3F)",
              border: "1px solid #C99774", boxShadow: "0 12px 20px rgba(31,43,94,.23)",
            }}>
              <div style={{ display: "flex", width: 66, height: 66, borderRadius: 38, border: "2px solid #DAB18F", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 900, color: "#F0D0B1" }}>N</div>
              <div style={{ display: "flex", color: "#FFFFFF", fontSize: 20, fontWeight: 900 }}>{code}</div>
              <div style={{ display: "flex", fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#E0BAA0" }}>ENGLISH</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 23, justifyContent: "center", gap: 9 }}>
          {levels.map((code) => (
            <div key={code} style={{ display: "flex", borderRadius: 8, padding: "6px 8px", background: code === "EL097" ? navy : "#E7E2E5", color: code === "EL097" ? "white" : navy, fontSize: 13, fontWeight: 900 }}>{code}</div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 12, justifyContent: "center", color: "#936A57", fontSize: 12, letterSpacing: 1 }}>FOCUSED LEARNING · SMARTER PREPARATION</div>
      </div>

      <div style={{ display: "flex", position: "absolute", left: 71, bottom: 64, right: 71, borderTop: "1px solid rgba(224,176,141,.45)", paddingTop: 21, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", color: "#EEC8AB", fontSize: 23, fontWeight: 900, direction: "rtl" }}>محاكي نُمو</div>
        <div style={{ display: "flex", color: "#FFFFFF", fontSize: 20, letterSpacing: 1 }}>numo-intensive-two.vercel.app</div>
      </div>
    </div>,
    { ...size }
  );
}

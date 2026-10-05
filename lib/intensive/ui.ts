export type CourseVisual = {
  level: string;
  label: string;
  cover: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  gradient: string;
  scene: string;
};

const COURSE_VISUALS: Record<string, CourseVisual> = {
  "EL097_EL099E": {
    level: "Level 1",
    label: "Foundation English",
    cover: "/covers/official/level-1.png",
    accent: "#009CA6",
    accentDark: "#04747C",
    accentSoft: "#E7F9F9",
    gradient: "linear-gradient(135deg, #04747C 0%, #00A8B3 100%)",
    scene: "Skyline",
  },
  EL098: {
    level: "Level 2",
    label: "Core English Skills",
    cover: "/covers/official/level-2.png",
    accent: "#0878E8",
    accentDark: "#163F9D",
    accentSoft: "#EAF3FF",
    gradient: "linear-gradient(135deg, #163F9D 0%, #0878E8 100%)",
    scene: "Bridge",
  },
  EL099: {
    level: "Level 3",
    label: "Integrated English",
    cover: "/covers/official/level-3.png",
    accent: "#BC247D",
    accentDark: "#801450",
    accentSoft: "#FCEAF5",
    gradient: "linear-gradient(135deg, #801450 0%, #C72B88 100%)",
    scene: "Blossom",
  },
  EL111: {
    level: "Level 4",
    label: "Academic English",
    cover: "/covers/official/level-4.png",
    accent: "#E5252A",
    accentDark: "#A91120",
    accentSoft: "#FDEBED",
    gradient: "linear-gradient(135deg, #A91120 0%, #E5252A 100%)",
    scene: "Sail",
  },
  EL112: {
    level: "Level 5",
    label: "Advanced English",
    cover: "/covers/official/level-5.png",
    accent: "#F07F00",
    accentDark: "#B94700",
    accentSoft: "#FFF2DF",
    gradient: "linear-gradient(135deg, #B94700 0%, #F58B00 100%)",
    scene: "Dunes",
  },
};

export function courseVisual(code: string): CourseVisual {
  const normalized = code.trim().toUpperCase().replaceAll(" ", "");
  return COURSE_VISUALS[normalized] ?? {
    level: "English Intensive",
    label: "NUMO Intensive Course",
    cover: "/covers/el111.svg",
    accent: "#6366F1",
    accentDark: "#303B78",
    accentSoft: "#EEF2FF",
    gradient: "linear-gradient(135deg, #1F2B5E 0%, #6366F1 100%)",
    scene: "NUMO",
  };
}

export function courseCover(code: string, remote?: string | null) {
  return remote || courseVisual(code).cover;
}

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
    cover: "/covers/el097-el099e-premium.svg",
    accent: "#009CA6",
    accentDark: "#04747C",
    accentSoft: "#E7F9F9",
    gradient: "linear-gradient(135deg, #04747C 0%, #00A8B3 100%)",
    scene: "Skyline",
  },
  EL098: {
    level: "Level 2",
    label: "Core English Skills",
    cover: "/covers/el098.svg",
    accent: "#0878E8",
    accentDark: "#163F9D",
    accentSoft: "#EAF3FF",
    gradient: "linear-gradient(135deg, #163F9D 0%, #0878E8 100%)",
    scene: "Bridge",
  },
  EL099: {
    level: "Level 3",
    label: "Integrated English",
    cover: "/covers/el099.svg",
    accent: "#BC247D",
    accentDark: "#801450",
    accentSoft: "#FCEAF5",
    gradient: "linear-gradient(135deg, #801450 0%, #C72B88 100%)",
    scene: "Blossom",
  },
  EL111: {
    level: "Level 4",
    label: "Academic English",
    cover: "/covers/el111.svg",
    accent: "#E5252A",
    accentDark: "#A91120",
    accentSoft: "#FDEBED",
    gradient: "linear-gradient(135deg, #A91120 0%, #E5252A 100%)",
    scene: "Sail",
  },
  EL112: {
    level: "Level 5",
    label: "Advanced English",
    cover: "/covers/el112.svg",
    accent: "#F07F00",
    accentDark: "#B94700",
    accentSoft: "#FFF2DF",
    gradient: "linear-gradient(135deg, #B94700 0%, #F58B00 100%)",
    scene: "Dunes",
  },
  GR101: {
    level: "General Studies",
    label: "Self-Learning Skills",
    cover: "/covers/gr101-v2.webp",
    accent: "#B1785C",
    accentDark: "#7E503C",
    accentSoft: "#FBF2ED",
    gradient: "linear-gradient(135deg, #1F2B5E 0%, #B1785C 100%)",
    scene: "Learning Path",
  },
  GR111: {
    level: "General Studies",
    label: "Islamic Civilization",
    cover: "/covers/gr111-v2.webp",
    accent: "#1F2B5E",
    accentDark: "#152047",
    accentSoft: "#EEF0F7",
    gradient: "linear-gradient(135deg, #1F2B5E 0%, #6366F1 100%)",
    scene: "Civilization",
  },
  GR112: {
    level: "General Studies",
    label: "Development Issues in the Arab World",
    cover: "/covers/gr112-v2.webp",
    accent: "#6366F1",
    accentDark: "#4043B4",
    accentSoft: "#F0F0FF",
    gradient: "linear-gradient(135deg, #1F2B5E 0%, #6366F1 55%, #B1785C 100%)",
    scene: "Arab Development",
  },
  GR118: {
    level: "General Studies",
    label: "Life Skills",
    cover: "/covers/gr118-v2.webp",
    accent: "#B1785C",
    accentDark: "#7E503C",
    accentSoft: "#FBF2ED",
    gradient: "linear-gradient(135deg, #6366F1 0%, #1F2B5E 58%, #B1785C 100%)",
    scene: "Life Skills",
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

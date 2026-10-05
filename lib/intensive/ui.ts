export type CourseVisual = {
  level: string;
  label: string;
  cover: string;
  accent: string;
  accentSoft: string;
  scene: string;
};

const COURSE_VISUALS: Record<string, CourseVisual> = {
  "EL097_EL099E": {
    level: "Level 1",
    label: "Foundation English",
    cover: "/covers/el097-el099e.svg",
    accent: "#0891B2",
    accentSoft: "#ECFEFF",
    scene: "Skyline",
  },
  EL098: {
    level: "Level 2",
    label: "Core English Skills",
    cover: "/covers/el098.svg",
    accent: "#3B82F6",
    accentSoft: "#EFF6FF",
    scene: "Bridge",
  },
  EL099: {
    level: "Level 3",
    label: "Integrated English",
    cover: "/covers/el099.svg",
    accent: "#C026A6",
    accentSoft: "#FDF2F8",
    scene: "Blossom",
  },
  EL111: {
    level: "Level 4",
    label: "Academic English",
    cover: "/covers/el111.svg",
    accent: "#EF4444",
    accentSoft: "#FEF2F2",
    scene: "Sail",
  },
  EL112: {
    level: "Level 5",
    label: "Advanced English",
    cover: "/covers/el112.svg",
    accent: "#F59E0B",
    accentSoft: "#FFFBEB",
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
    accentSoft: "#EEF2FF",
    scene: "NUMO",
  };
}

export function courseCover(code: string, remote?: string | null) {
  return remote || courseVisual(code).cover;
}

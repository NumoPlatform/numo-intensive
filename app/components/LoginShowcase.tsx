import { BookOpen, BookOpenCheck, GraduationCap, Sparkles } from "lucide-react";

const FEATURED_COURSES = [
  {
    code: "EL097",
    name: "Foundation Level",
    cover: "/covers/el097-login.svg",
    number: "01",
  },
  {
    code: "EL098",
    name: "Pre-Intermediate Level",
    cover: "/covers/el098.svg",
    number: "02",
  },
  {
    code: "EL099",
    name: "Intermediate Level",
    cover: "/covers/el099.svg",
    number: "03",
  },
] as const;

/**
 * Decorative course exhibition for the unauthenticated landing page only.
 * It uses the approved course-cover artwork, never student enrollment data.
 * Each tile links to the real sign-in field rather than a restricted course URL.
 */
export default function LoginShowcase() {
  return (
    <section className="numo-login-showcase relative" aria-label="مقررات اللغة الإنجليزية المكثفة">
      <ul className="numo-login-showcase-grid" dir="ltr">
        {FEATURED_COURSES.map((course, index) => (
          <li key={course.code} className="numo-login-showcase-slot">
            <a
              className="numo-login-featured-card"
              href="#numo-login-username"
              aria-label={`الدخول للوصول إلى ${course.code} — ${course.name}`}
            >
              <div className="numo-login-featured-cover">
                <img
                  src={course.cover}
                  alt={`الغلاف المعتمد لمقرر ${course.code}`}
                  width={1600}
                  height={900}
                  decoding="async"
                  loading="eager"
                />
              </div>
              <div className="numo-login-featured-details" dir="ltr">
                <span className="numo-login-featured-count">{course.number} / COURSE</span>
                <strong>{course.code}</strong>
                <span className="numo-login-featured-level">{course.name}</span>
                <span className="numo-login-featured-term">SEMESTER 2026 - 2027</span>
                <span className="numo-login-featured-skills">
                  <span><BookOpenCheck aria-hidden="true" /> Grammar</span>
                  <span><BookOpen aria-hidden="true" /> Vocabulary</span>
                  <span><GraduationCap aria-hidden="true" /> Reading</span>
                </span>
              </div>
              <span className="numo-login-featured-shine" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <div className="numo-login-showcase-dots" aria-hidden="true"><i /><i /><i /></div>
      <div className="numo-login-showcase-transition" aria-hidden="true">
        <Sparkles size={15} /> NUMO INTENSIVE · LEARN · PRACTICE · IMPROVE
      </div>
    </section>
  );
}

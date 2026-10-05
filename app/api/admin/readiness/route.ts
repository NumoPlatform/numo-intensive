import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest, userRequest } from "@/lib/intensive/server";

type Course = { id: string; code: string };
type Exam = {
  id: string;
  title: string;
  attempts_allowed: number;
  result_release: string;
  status: string;
  allow_answer_review: boolean;
};
type Section = {
  id: string;
  exam_id: string;
  title: string;
  time_limit_minutes: number;
  question_count: number | null;
};
type ExamQuestion = { exam_id: string; question_id: string };
type Question = { id: string; type: string; grading_mode: string };
type QuestionOption = { question_id: string; is_correct: boolean };
type Assignment = { exam_id: string; all_course_students: boolean };

type SecurityReadiness = {
  baseExamRpcsLocked: boolean;
  sectionedRpcsAvailable: boolean;
  answerKeyTablesRls: boolean;
  legacyBootstrapRemoved: boolean;
  riyadhAccessWindows: boolean;
  publicSchemaFkIsolated: boolean;
  functionNamespaceIsolated: boolean;
  coverStorageLockedDown: boolean;
  examDuplicationAvailable: boolean;
};

const expectedSections = new Map([
  ["Grammar", 27],
  ["Vocabulary", 19],
  ["Reading", 86],
]);

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ ok: false, message: "انتهت الجلسة." }, { status: 401 });
  }
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "غير مصرح بالدخول." }, { status: 403 });
  }

  try {
    const security = await userRequest<SecurityReadiness>(
      auth.accessToken,
      "/rest/v1/rpc/intensive_security_readiness",
      { method: "POST", body: "{}" },
    );

    const securityChecks = {
      baseExamRpcsLocked: Boolean(security.baseExamRpcsLocked),
      sectionedRpcsAvailable: Boolean(security.sectionedRpcsAvailable),
      answerKeyTablesRls: Boolean(security.answerKeyTablesRls),
      legacyBootstrapRemoved: Boolean(security.legacyBootstrapRemoved),
      riyadhAccessWindows: Boolean(security.riyadhAccessWindows),
      publicSchemaFkIsolated: Boolean(security.publicSchemaFkIsolated),
      functionNamespaceIsolated: Boolean(security.functionNamespaceIsolated),
      coverStorageLockedDown: Boolean(security.coverStorageLockedDown),
      examDuplicationAvailable: Boolean(security.examDuplicationAvailable),
    };

    const courses = await serviceRequest<Course[]>(
      "/rest/v1/intensive_courses?" +
        new URLSearchParams({
          select: "id,code",
          code: "eq.EL111",
          limit: "1",
        }).toString(),
    );
    const course = courses[0];

    if (!course) {
      return NextResponse.json({
        ok: true,
        ready: false,
        sections: 0,
        questions: 0,
        checks: {
          el111Course: false,
          threeIndependentSections: false,
          sectionQuestionCounts: false,
          fourAttemptsPerSection: false,
          immediateResults: false,
          liveSections: false,
          thirtyMinuteSections: false,
          oneSectionPerAssessment: false,
          answerReviewEnabled: false,
          assignedToCourse: false,
          autoGradedQuestions: false,
          answerKeysValid: false,
          ...securityChecks,
        },
      });
    }

    const exams = await serviceRequest<Exam[]>(
      "/rest/v1/intensive_exams?" +
        new URLSearchParams({
          select: "id,title,attempts_allowed,result_release,status,allow_answer_review",
          course_id: "eq." + course.id,
          status: "eq.LIVE",
          order: "title.asc",
        }).toString(),
    );

    const assessments = exams.filter((exam) =>
      /^EL111 Midterm — (Grammar|Vocabulary|Reading)$/i.test(exam.title),
    );
    const ids = assessments.map((exam) => exam.id);

    const [sections, examQuestions, assignments] = ids.length
      ? await Promise.all([
          serviceRequest<Section[]>(
            "/rest/v1/intensive_exam_sections?" +
              new URLSearchParams({
                select: "id,exam_id,title,time_limit_minutes,question_count",
                exam_id: "in.(" + ids.join(",") + ")",
                is_enabled: "eq.true",
              }).toString(),
          ),
          serviceRequest<ExamQuestion[]>(
            "/rest/v1/intensive_exam_questions?" +
              new URLSearchParams({
                select: "exam_id,question_id",
                exam_id: "in.(" + ids.join(",") + ")",
              }).toString(),
          ),
          serviceRequest<Assignment[]>(
            "/rest/v1/intensive_exam_assignments?" +
              new URLSearchParams({
                select: "exam_id,all_course_students",
                exam_id: "in.(" + ids.join(",") + ")",
                all_course_students: "eq.true",
              }).toString(),
          ),
        ])
      : [[], [], []] as [Section[], ExamQuestion[], Assignment[]];

    const questionIds = [...new Set(examQuestions.map((item) => item.question_id))];
    const [questions, options] = questionIds.length
      ? await Promise.all([
          serviceRequest<Question[]>(
            "/rest/v1/intensive_questions?" +
              new URLSearchParams({
                select: "id,type,grading_mode",
                id: "in.(" + questionIds.join(",") + ")",
              }).toString(),
          ),
          serviceRequest<QuestionOption[]>(
            "/rest/v1/intensive_question_options?" +
              new URLSearchParams({
                select: "question_id,is_correct",
                question_id: "in.(" + questionIds.join(",") + ")",
              }).toString(),
          ),
        ])
      : [[], []] as [Question[], QuestionOption[]];

    const sectionCounts = new Map<string, number>();
    for (const section of sections) {
      sectionCounts.set(section.exam_id, (sectionCounts.get(section.exam_id) ?? 0) + 1);
    }

    const checks = {
      el111Course: true,
      threeIndependentSections:
        assessments.length === 3 &&
        ["Grammar", "Vocabulary", "Reading"].every((name) =>
          assessments.some((exam) => exam.title.endsWith("— " + name)),
        ),
      sectionQuestionCounts:
        sections.length === 3 &&
        sections.every((section) => expectedSections.get(section.title) === section.question_count),
      fourAttemptsPerSection:
        assessments.length === 3 && assessments.every((exam) => exam.attempts_allowed === 4),
      immediateResults:
        assessments.length === 3 && assessments.every((exam) => exam.result_release === "IMMEDIATE"),
      liveSections:
        assessments.length === 3 && assessments.every((exam) => exam.status === "LIVE"),
      thirtyMinuteSections:
        sections.length === 3 && sections.every((section) => section.time_limit_minutes === 30),
      oneSectionPerAssessment:
        assessments.length === 3 && assessments.every((exam) => sectionCounts.get(exam.id) === 1),
      answerReviewEnabled:
        assessments.length === 3 && assessments.every((exam) => exam.allow_answer_review),
      assignedToCourse:
        assessments.length === 3 &&
        assessments.every((exam) =>
          assignments.some((item) => item.exam_id === exam.id && item.all_course_students),
        ),
      autoGradedQuestions:
        questions.length === 132 && questions.every((question) => question.grading_mode === "AUTO"),
      answerKeysValid: (() => {
        if (questions.length !== 132) return false;
        const correctCounts = new Map<string, number>();
        for (const option of options) {
          if (option.is_correct) {
            correctCounts.set(option.question_id, (correctCounts.get(option.question_id) ?? 0) + 1);
          }
        }
        return questions.every((question) =>
          question.type !== "MULTIPLE_CHOICE" || correctCounts.get(question.id) === 1
        );
      })(),
      ...securityChecks,
    };

    return NextResponse.json({
      ok: true,
      ready: Object.values(checks).every(Boolean),
      checks,
      sections: assessments.length,
      questions: questionIds.length,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, ready: false, message: "تعذر التحقق من جاهزية النظام." },
      { status: 503 },
    );
  }
}

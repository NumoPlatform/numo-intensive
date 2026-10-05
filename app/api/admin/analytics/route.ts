import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest } from "@/lib/intensive/server";

type Course = { id: string; code: string; title: string };
type Exam = {
  id: string;
  course_id: string;
  title: string;
  category: string;
  status: string;
  total_marks: number;
};
type Result = {
  attempt_id: string;
  exam_id: string;
  student_id: string;
  final_score: number | null;
  total_marks: number;
  percentage: number | null;
  status: string | null;
  grading_status: string;
  is_published: boolean;
  skill_breakdown: Record<string, unknown> | null;
  created_at: string;
};
type Attempt = {
  id: string;
  exam_id: string;
  student_id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
};

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function percentageFor(result: Result) {
  if (result.percentage !== null) {
    const direct = Number(result.percentage);
    if (Number.isFinite(direct)) return direct;
  }
  if (result.final_score === null) return null;
  const score = Number(result.final_score);
  const total = Number(result.total_marks);
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return null;
  return (score / total) * 100;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const [courses, exams, students, attempts, results] = await Promise.all([
    serviceRequest<Course[]>("/rest/v1/intensive_courses?select=id,code,title&order=code.asc&limit=200"),
    serviceRequest<Exam[]>("/rest/v1/intensive_exams?select=id,course_id,title,category,status,total_marks&order=created_at.desc&limit=1000"),
    serviceRequest<Array<{ id: string }>>("/rest/v1/intensive_profiles?select=id&role=eq.STUDENT&limit=5000"),
    serviceRequest<Attempt[]>("/rest/v1/intensive_exam_attempts?select=id,exam_id,student_id,status,started_at,submitted_at&order=started_at.desc&limit=5000"),
    serviceRequest<Result[]>("/rest/v1/intensive_results?select=attempt_id,exam_id,student_id,final_score,total_marks,percentage,status,grading_status,is_published,skill_breakdown,created_at&order=created_at.desc&limit=5000"),
  ]);

  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const examMap = new Map(exams.map((exam) => [exam.id, exam]));
  const completedResults = results.filter((result) => result.grading_status === "COMPLETE" && percentageFor(result) !== null);

  const bestByStudentExam = new Map<string, Result>();
  for (const result of completedResults) {
    const key = result.student_id + "::" + result.exam_id;
    const current = bestByStudentExam.get(key);
    if (!current || Number(percentageFor(result) ?? 0) > Number(percentageFor(current) ?? 0)) {
      bestByStudentExam.set(key, result);
    }
  }
  const bestResults = [...bestByStudentExam.values()];
  const bestPercentages = bestResults
    .map(percentageFor)
    .filter((value): value is number => value !== null);
  const bestPassResults = bestResults.filter((result) => result.status === "PASS");

  const courseBuckets = new Map<string, Result[]>();
  const examBuckets = new Map<string, Result[]>();
  for (const result of bestResults) {
    const exam = examMap.get(result.exam_id);
    if (exam) courseBuckets.set(exam.course_id, [...(courseBuckets.get(exam.course_id) ?? []), result]);
    examBuckets.set(result.exam_id, [...(examBuckets.get(result.exam_id) ?? []), result]);
  }

  const courseAnalytics = courses.map((course) => {
    const rows = courseBuckets.get(course.id) ?? [];
    const percentages = rows.map(percentageFor).filter((value): value is number => value !== null);
    const passed = rows.filter((row) => row.status === "PASS").length;
    return {
      id: course.id,
      code: course.code,
      title: course.title,
      results: rows.length,
      averagePercentage: average(percentages),
      passRate: rows.length ? Math.round((passed / rows.length) * 1000) / 10 : null,
    };
  });

  const examAnalytics = exams.slice(0, 60).map((exam) => {
    const rows = examBuckets.get(exam.id) ?? [];
    const percentages = rows.map(percentageFor).filter((value): value is number => value !== null);
    const passed = rows.filter((row) => row.status === "PASS").length;
    const attemptsForExam = attempts.filter((attempt) => attempt.exam_id === exam.id);
    return {
      id: exam.id,
      courseCode: courseMap.get(exam.course_id)?.code ?? "—",
      title: exam.title,
      category: exam.category,
      status: exam.status,
      attempts: attemptsForExam.length,
      submitted: attemptsForExam.filter((attempt) => attempt.status !== "IN_PROGRESS").length,
      gradedResults: rows.length,
      averagePercentage: average(percentages),
      passRate: rows.length ? Math.round((passed / rows.length) * 1000) / 10 : null,
    };
  });

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: {
      students: students.length,
      exams: exams.length,
      attempts: attempts.length,
      inProgressAttempts: attempts.filter((attempt) => attempt.status === "IN_PROGRESS").length,
      completedResults: completedResults.length,
      publishedResults: results.filter((result) => result.is_published).length,
      averagePercentage: average(bestPercentages),
      passRate: bestResults.length
        ? Math.round((bestPassResults.length / bestResults.length) * 1000) / 10
        : null,
      bestResultRecords: bestResults.length,
    },
    courseAnalytics,
    examAnalytics,
  });
}

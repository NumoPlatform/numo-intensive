import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, serviceRequest } from "@/lib/intensive/server";

type Course = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  default_cover_url: string | null;
  cover_path: string | null;
  is_active: boolean;
};
type Student = {
  id: string;
  full_name: string;
  username: string;
  status: string;
  start_date: string | null;
  expiration_date: string | null;
  last_login_at: string | null;
};
type Enrollment = { student_id: string; course_id: string; is_active: boolean };
type Device = {
  student_id: string;
  status: string;
  registered_at: string | null;
  last_access_at: string | null;
  reset_at: string | null;
};
type Exam = {
  id: string;
  course_id: string;
  title: string;
  category: string;
  description: string | null;
  instructions: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  attempts_allowed: number;
  total_marks: number;
  passing_score: number | null;
  status: string;
  result_release: string;
};
type Section = {
  id: string;
  exam_id: string;
  title: string;
  position: number;
  marks: number;
  question_count: number | null;
  time_limit_minutes: number;
};
type AuditLog = {
  id: number;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  if (auth.profile.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Access denied." }, { status: 403 });
  }

  const courseQuery = new URLSearchParams({
    select: "id,code,title,description,default_cover_url,cover_path,is_active",
    order: "code.asc",
  });
  const studentQuery = new URLSearchParams({
    select: "id,full_name,username,status,start_date,expiration_date,last_login_at",
    role: "eq.STUDENT",
    order: "created_at.desc",
  });
  const enrollmentQuery = new URLSearchParams({
    select: "student_id,course_id,is_active",
    is_active: "eq.true",
  });
  const deviceQuery = new URLSearchParams({
    select: "student_id,status,registered_at,last_access_at,reset_at",
    order: "last_access_at.desc",
  });
  const examQuery = new URLSearchParams({
    select: "id,course_id,title,category,description,instructions,starts_at,ends_at,duration_minutes,attempts_allowed,total_marks,passing_score,status,result_release",
    order: "created_at.desc",
  });
  const sectionQuery = new URLSearchParams({
    select: "id,exam_id,title,position,marks,question_count,time_limit_minutes",
    order: "position.asc",
  });
  const auditQuery = new URLSearchParams({
    select: "id,admin_id,action,target_type,target_id,details,created_at",
    order: "created_at.desc",
    limit: "20",
  });

  const [courses, students, enrollments, devices, exams, sections, audits] = await Promise.all([
    serviceRequest<Course[]>("/rest/v1/intensive_courses?" + courseQuery.toString()),
    serviceRequest<Student[]>("/rest/v1/intensive_profiles?" + studentQuery.toString()),
    serviceRequest<Enrollment[]>("/rest/v1/intensive_enrollments?" + enrollmentQuery.toString()),
    serviceRequest<Device[]>("/rest/v1/intensive_trusted_devices?" + deviceQuery.toString()),
    serviceRequest<Exam[]>("/rest/v1/intensive_exams?" + examQuery.toString()),
    serviceRequest<Section[]>("/rest/v1/intensive_exam_sections?" + sectionQuery.toString()),
    serviceRequest<AuditLog[]>("/rest/v1/intensive_audit_logs?" + auditQuery.toString()),
  ]);

  const visibleExams = exams.filter(
    (exam) => !/^EL111 Midterm — Model \\d+$/i.test(exam.title),
  );
  const visibleExamIds = new Set(visibleExams.map((exam) => exam.id));
  const visibleSections = sections.filter((section) => visibleExamIds.has(section.exam_id));

  return NextResponse.json({
    ok: true,
    admin: { full_name: auth.profile.full_name, username: auth.profile.username },
    courses,
    students,
    enrollments,
    devices,
    exams: visibleExams,
    sections: visibleSections,
    audits,
  });
}

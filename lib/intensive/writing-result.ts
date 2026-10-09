import { serviceRequest } from "@/lib/intensive/server";

// Authenticated route callers must verify the student owns the section attempt
// before using this service-role-only helper.
export async function getSectionWritingReport(sectionAttemptId: string, studentId: string) {
  const rows = await serviceRequest<Array<{
    id: string;
    topic_index: number;
    topic_text: string;
    original_text: string;
    word_count: number;
    score_total: number;
    performance_level: string;
    task_achievement: number;
    grammar_accuracy: number;
    vocabulary_usage: number;
    organization_coherence: number;
    spelling_punctuation: number;
    corrections: Array<{ original: string; corrected: string; reasonAr: string }>;
    strengths: string[];
    improvements: string[];
    improved_version: string;
    rubric_version: string;
    model_id: string;
    created_at: string;
  }>>(
    "/rest/v1/intensive_writing_assessments?" + new URLSearchParams({
      select: "*",
      section_attempt_id: "eq." + sectionAttemptId,
      student_id: "eq." + studentId,
      order: "created_at.desc",
      limit: "1",
    }).toString(),
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    topicIndex: row.topic_index,
    topicText: row.topic_text,
    originalText: row.original_text,
    wordCount: Number(row.word_count),
    score: Number(row.score_total),
    performanceLevel: row.performance_level,
    criteria: {
      taskAchievement: Number(row.task_achievement),
      grammarAccuracy: Number(row.grammar_accuracy),
      vocabularyUsage: Number(row.vocabulary_usage),
      organizationCoherence: Number(row.organization_coherence),
      spellingPunctuation: Number(row.spelling_punctuation),
    },
    corrections: row.corrections ?? [],
    strengths: row.strengths ?? [],
    improvements: row.improvements ?? [],
    improvedVersion: row.improved_version,
    rubricVersion: row.rubric_version,
    modelId: row.model_id,
    createdAt: row.created_at,
  };
}

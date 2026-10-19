# EL097_EL099E — Final Exam implementation and academic QA

Source used: `EL097_Final_Answers_FIXED.docx` / NUMO answered final question bank, dated 18 October 2026. This was previously assembled from four final-exam compilations (F1–F4). All question wording, available answer choices, keyed letters, source references, and seven full reading passages have been imported without generating missing academic facts.

## Exam structure

| Section | Source bank | Graded questions | Time | Marks |
|---|---:|---:|---:|---:|
| Grammar and Vocabulary | 90 Grammar + 85 Vocabulary | 173 | 120 minutes | 173 |
| Reading (Passages) | 7 passages, 51 source questions | 50 | 60 minutes | 50 |
| Writing | 8 original topic options | 1 prompt | 45 minutes | 25 |
| **Total** | **227 source records (226 objective + 1 Writing)** | **224** | **225 minutes** | **248** |

This exam was imported into the existing EL097_EL099E FINAL draft. Attempts allowed `0` means unlimited, scoring keys source-locked. Five source True/False reading questions are represented with boolean scoring, not fabricated distractors. Writing supports eight original choices with a 100-word minimum and 25-mark intelligent grading. All 8 topics are from source page 32.

## Three questions requiring an academic decision

1. **Grammar #018**, “........ a student at Princeton University.” It lacks a subject. “am”, “are”, and “is” depend on the missing subject; no unique answer is valid.
2. **Grammar #048**, “You ____ to parties at all.” The source explicitly states none of the listed choices forms a correct ordinary-English sentence.
3. **Reading Passage 02, #2.6**, “What is the teacher's teaching style?” The passage names the teacher but never describes the teaching style; all four options are unsupported.

All three are **preserved with their original choices in the question bank** with an academic review note; they are intentionally not graded or displayed as settled answers. They are not deleted, and no arbitrary answer key was assigned. They can be added once source-corrected answers are provided.

## Safeguards

- Source answer choices stored under stable source-derived UUIDs, preserving letter identity even with duplicate text.
- Source inconsistencies and review notes are displayed as academic warnings, not replaced by invented Gemini justifications.
- Existing student Quiz 2 attempts and scores are unchanged; no new student accounts created or students impersonated.
- FINAL Writing server route accepts only EL097_EL099E FINAL in addition to previously supported Quiz 2 entries.
- Writing topic validation supports all 8 FINAL topics while preserving the original 7-topic Quiz 2 limit.
- Deferred Writing score is queued without showing zero if intelligent assessment is unavailable.
- EL098 and EL099 FINAL drafts remain waiting for separate source banks; EL111/EL112 unaffected.

## Release checks

Verify 7 passage bodies, 173+50+1 exam links, 248 marks, 3 inactive source-review questions, 5 source True/False items, 8 Writing topics, final Writing queue and grader, independent section navigation, Vercel build and authenticated smoke test. Do not claim production readiness from a build alone.

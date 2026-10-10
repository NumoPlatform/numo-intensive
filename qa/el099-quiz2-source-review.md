# EL099 — Quiz 2 source fidelity and academic QA

**Current policy: INCLUDE ALL SOURCE QUESTIONS.** The user explicitly requested no exclusions. All questions, their original answer options and original marked keys have been retained; academic inconsistencies are disclosed as source notes rather than silently omitted or rewritten.

## Three complete sections

| Section | Source items in exam | Time | Marks |
|---|---:|---:|---:|
| Grammar and Vocabulary | 166 / 166 | 120 min | 166 |
| Reading (Passages) | 44 / 44 in 7 passages | 60 min | 44 |
| Writing | 1 question with 6 original topic choices | 45 min | 25 |
| **Total** | **211** | **225 min** | **235** |

Original questions and answer labels from the user-supplied PDFs. Unlimited attempts. Source-key-driven objective scoring. Writing minimum 150 words, six selectable prompts and smart review / pending-grade protection.

## 11 source inconsistencies are included (not removed)

Grammar and Vocabulary source question identifiers:
- Q9: marked *as larg as*, a misspelling of grammatically correct *as large as*.
- Q11: answer *won't* contradicts the next sentence saying he will be in Italy (a European country).
- Q14: source includes two literally empty answer options, plus misspelled *predection*. Blank options remain blank in DB; screen explains that their content is absent in source.
- Q20: duplicated *will finish* in A and D; correct key remains C.
- Q84: B and C both say *the biggest*; only C is marked correct in source. UI must use actual UUID choice identity rather than text equality to avoid showing both as correct.
- Q110: original answer *since* is ungrammatical in “... five years”; *for* is absent from source options.
- Q127: options A and D both say *there is*, correct key B is unchanged.

Reading source question identifiers:
- Discovering Dubai Q3 (global reading #11): passage lacks Michelin-starred restaurant evidence.
- Discovering Dubai Q4 (global #12): “it” pronoun reference not found as stated.
- Discovering Dubai Q6 (global #14): desert safari / sunset not in passage.
- Discovering Joy Q5 (global #29): social connection to like-minded individuals not established in passage.

All 11 questions are ACTIVE and LINKED to the exam. Their original answer keys have **not** been changed. Student instant feedback presents a source-note warning; for these items Gemini does not generate a fabricated academic justification.

## QA checks

- Exactly 166 + 44 + 1 = 211 linked source questions, all 11 flagged source items active and attached.
- Exactly one marked source key per multiple-choice question, including duplicate option text.
- 7 nonempty passages.
- 6 writing topics and minimum 150 words; independent section scoring; no false zero on pending AI.
- Final draft approval and live test recommended due to original source inconsistencies.

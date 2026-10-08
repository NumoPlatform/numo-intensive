-- EL098 Quiz 2: validated, source-locked per-wrong-choice feedback cache.
-- An administrative content-review gate is still required before exams leave DRAFT.
create table if not exists public.intensive_el098_wrong_feedback (
  question_id uuid not null references public.intensive_questions(id) on delete cascade,
  selected_option_id uuid not null references public.intensive_question_options(id) on delete cascade,
  correct_option_id uuid not null references public.intensive_question_options(id) on delete cascade,
  why_incorrect text not null,
  why_correct text not null,
  academic_explanation text not null,
  supporting_quote text,
  model_id text not null,
  created_at timestamptz not null default now(),
  primary key (question_id, selected_option_id)
);

alter table public.intensive_el098_wrong_feedback enable row level security;
revoke all on public.intensive_el098_wrong_feedback from public, anon, authenticated;
grant select, insert, update on public.intensive_el098_wrong_feedback to service_role;

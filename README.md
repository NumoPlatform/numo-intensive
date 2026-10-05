# NUMO INTENSIVE

Independent English Intensive Courses platform for NUMO.

## Standalone architecture

This source tree is self-contained and is deployed independently.

- Next.js application at repository root
- Dedicated Supabase project
- Dedicated Auth, PostgreSQL database, Storage, RLS, RPCs and Edge Functions
- Dedicated Vercel project: `numo-intensive`
- Production domain target: `intensive.numo.academy`
- No imports from Advisor, Observatory, Planner, Track or any previous NUMO/AOU application
- No legacy `NUMO_SUPABASE_*` environment variables

## Student assessments

The intensive-course assessment experience is section based:

- Grammar
- Vocabulary
- Reading

Each assessment can be configured by the administrator. Current EL111 defaults are 30 minutes, 4 attempts and immediate result release.

## Security

- Admin/student role separation
- Row Level Security
- One trusted device per student
- Server-side session cookies
- Supabase Edge Function for privileged Auth administration
- Isolated course-cover storage policies

Run:

```bash
npm run verify
npm run build
```

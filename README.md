# مُحاكي نُمو | NUMO ACADEMIC SIMULATOR

Academic training and assessment environment for NUMO. The English intensive courses remain supported as academic course content, but they are no longer the platform identity.

## Standalone architecture

This source tree is self-contained and is deployed independently.

- Next.js application at repository root
- Dedicated Supabase project
- Dedicated Auth, PostgreSQL database, Storage, RLS, RPCs and Edge Functions
- Dedicated Vercel project: `numo-intensive`
- Production domain target: `intensive.numo.academy`
- No imports from Advisor, Observatory, Planner, Track or any previous NUMO/AOU application
- No legacy `NUMO_SUPABASE_*` environment variables

## Academic assessments

English-course assessments can remain section based:

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

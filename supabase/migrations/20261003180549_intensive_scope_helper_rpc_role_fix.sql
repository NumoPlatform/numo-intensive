create or replace function public.intensive_student_access_active(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    (
      p_student_id = auth.uid()
      or public.intensive_is_admin()
      or auth.role() = 'service_role'
    )
    and exists(
      select 1
      from public.intensive_profiles p
      where
        p.id = p_student_id
        and p.role = 'STUDENT'
        and p.status = 'ACTIVE'
        and (p.start_date is null or p.start_date <= current_date)
        and (p.expiration_date is null or p.expiration_date >= current_date)
    );
$function$;

create or replace function public.intensive_is_assigned(p_exam_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    (
      p_student_id = auth.uid()
      or public.intensive_is_admin()
      or auth.role() = 'service_role'
    )
    and public.intensive_student_access_active(p_student_id)
    and exists(
      select 1
      from public.intensive_exams ex
      join public.intensive_enrollments en
        on en.course_id = ex.course_id
       and en.student_id = p_student_id
       and en.is_active
       and en.start_date <= current_date
       and (en.expiration_date is null or en.expiration_date >= current_date)
      where
        ex.id = p_exam_id
        and exists(
          select 1
          from public.intensive_exam_assignments a
          where
            a.exam_id = p_exam_id
            and (
              a.student_id = p_student_id
              or (
                a.group_id is not null
                and exists(
                  select 1
                  from public.intensive_group_members gm
                  where gm.group_id = a.group_id
                    and gm.student_id = p_student_id
                )
              )
              or a.all_course_students
            )
        )
    );
$function$;

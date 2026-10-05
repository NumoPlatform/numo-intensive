create index if not exists intensive_access_logs_student_fk_idx
  on public.intensive_access_logs(student_id);
create index if not exists intensive_audit_logs_admin_fk_idx
  on public.intensive_audit_logs(admin_id);
create index if not exists intensive_courses_created_by_fk_idx
  on public.intensive_courses(created_by);
create index if not exists intensive_assignments_student_fk_idx
  on public.intensive_exam_assignments(student_id);
create index if not exists intensive_assignments_group_fk_idx
  on public.intensive_exam_assignments(group_id);
create index if not exists intensive_assignments_created_by_fk_idx
  on public.intensive_exam_assignments(created_by);
create index if not exists intensive_pool_rules_exam_fk_idx
  on public.intensive_exam_pool_rules(exam_id);
create index if not exists intensive_pool_rules_section_fk_idx
  on public.intensive_exam_pool_rules(section_id);
create index if not exists intensive_exam_questions_question_fk_idx
  on public.intensive_exam_questions(question_id);
create index if not exists intensive_exams_created_by_fk_idx
  on public.intensive_exams(created_by);
create index if not exists intensive_group_members_student_fk_idx
  on public.intensive_group_members(student_id);
create index if not exists intensive_passages_course_fk_idx
  on public.intensive_passages(course_id);
create index if not exists intensive_passages_created_by_fk_idx
  on public.intensive_passages(created_by);
create index if not exists intensive_profiles_created_by_fk_idx
  on public.intensive_profiles(created_by);
create index if not exists intensive_questions_passage_fk_idx
  on public.intensive_questions(passage_id);
create index if not exists intensive_questions_created_by_fk_idx
  on public.intensive_questions(created_by);
create index if not exists intensive_results_exam_fk_idx
  on public.intensive_results(exam_id);
create index if not exists intensive_settings_updated_by_fk_idx
  on public.intensive_settings(updated_by);
create index if not exists intensive_answers_graded_by_fk_idx
  on public.intensive_student_answers(graded_by);
create index if not exists intensive_groups_course_fk_idx
  on public.intensive_student_groups(course_id);
create index if not exists intensive_groups_created_by_fk_idx
  on public.intensive_student_groups(created_by);

drop policy if exists courses_admin_write on public.intensive_courses;
create policy courses_admin_insert on public.intensive_courses
  for insert to authenticated with check (public.intensive_is_admin());
create policy courses_admin_update on public.intensive_courses
  for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy courses_admin_delete on public.intensive_courses
  for delete to authenticated using (public.intensive_is_admin());

drop policy if exists enrollments_admin_write on public.intensive_enrollments;
create policy enrollments_admin_insert on public.intensive_enrollments
  for insert to authenticated with check (public.intensive_is_admin());
create policy enrollments_admin_update on public.intensive_enrollments
  for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy enrollments_admin_delete on public.intensive_enrollments
  for delete to authenticated using (public.intensive_is_admin());

drop policy if exists assignments_admin_write on public.intensive_exam_assignments;
create policy assignments_admin_insert on public.intensive_exam_assignments
  for insert to authenticated with check (public.intensive_is_admin());
create policy assignments_admin_update on public.intensive_exam_assignments
  for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy assignments_admin_delete on public.intensive_exam_assignments
  for delete to authenticated using (public.intensive_is_admin());

drop policy if exists sections_admin_write on public.intensive_exam_sections;
create policy sections_admin_insert on public.intensive_exam_sections
  for insert to authenticated with check (public.intensive_is_admin());
create policy sections_admin_update on public.intensive_exam_sections
  for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy sections_admin_delete on public.intensive_exam_sections
  for delete to authenticated using (public.intensive_is_admin());

drop policy if exists exams_admin_write on public.intensive_exams;
create policy exams_admin_insert on public.intensive_exams
  for insert to authenticated with check (public.intensive_is_admin());
create policy exams_admin_update on public.intensive_exams
  for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy exams_admin_delete on public.intensive_exams
  for delete to authenticated using (public.intensive_is_admin());

drop policy if exists profiles_admin_write on public.intensive_profiles;
create policy profiles_admin_insert on public.intensive_profiles
  for insert to authenticated with check (public.intensive_is_admin());
create policy profiles_admin_update on public.intensive_profiles
  for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy profiles_admin_delete on public.intensive_profiles
  for delete to authenticated using (public.intensive_is_admin());

drop policy if exists settings_admin_write on public.intensive_settings;
create policy settings_admin_insert on public.intensive_settings
  for insert to authenticated with check (public.intensive_is_admin());
create policy settings_admin_update on public.intensive_settings
  for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy settings_admin_delete on public.intensive_settings
  for delete to authenticated using (public.intensive_is_admin());

drop policy if exists devices_admin_write on public.intensive_trusted_devices;
create policy devices_admin_insert on public.intensive_trusted_devices
  for insert to authenticated with check (public.intensive_is_admin());
create policy devices_admin_update on public.intensive_trusted_devices
  for update to authenticated using (public.intensive_is_admin()) with check (public.intensive_is_admin());
create policy devices_admin_delete on public.intensive_trusted_devices
  for delete to authenticated using (public.intensive_is_admin());

drop policy if exists profiles_select on public.intensive_profiles;
create policy profiles_select on public.intensive_profiles
  for select to authenticated
  using ((id = (select auth.uid())) or public.intensive_is_admin());

drop policy if exists enrollments_select on public.intensive_enrollments;
create policy enrollments_select on public.intensive_enrollments
  for select to authenticated
  using ((student_id = (select auth.uid()) and public.intensive_has_active_device()) or public.intensive_is_admin());

drop policy if exists courses_select on public.intensive_courses;
create policy courses_select on public.intensive_courses
  for select to authenticated
  using (
    public.intensive_is_admin()
    or (
      public.intensive_has_active_device()
      and exists(
        select 1 from public.intensive_enrollments e
        where e.course_id = intensive_courses.id
          and e.student_id = (select auth.uid())
          and e.is_active
          and e.start_date <= current_date
          and (e.expiration_date is null or e.expiration_date >= current_date)
      )
    )
  );

drop policy if exists assignments_select on public.intensive_exam_assignments;
create policy assignments_select on public.intensive_exam_assignments
  for select to authenticated
  using (
    public.intensive_is_admin()
    or (
      public.intensive_has_active_device()
      and (
        student_id = (select auth.uid())
        or public.intensive_is_assigned(exam_id, (select auth.uid()))
      )
    )
  );

drop policy if exists sections_select on public.intensive_exam_sections;
create policy sections_select on public.intensive_exam_sections
  for select to authenticated
  using (
    public.intensive_is_admin()
    or (
      public.intensive_has_active_device()
      and public.intensive_is_assigned(exam_id, (select auth.uid()))
    )
  );

drop policy if exists exams_select on public.intensive_exams;
create policy exams_select on public.intensive_exams
  for select to authenticated
  using (
    public.intensive_is_admin()
    or (
      public.intensive_has_active_device()
      and public.intensive_is_assigned(id, (select auth.uid()))
    )
  );

drop policy if exists results_select on public.intensive_results;
create policy results_select on public.intensive_results
  for select to authenticated
  using (
    public.intensive_is_admin()
    or (
      public.intensive_has_active_device()
      and student_id = (select auth.uid())
      and is_published
    )
  );

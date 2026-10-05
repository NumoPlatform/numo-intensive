drop policy if exists intensive_covers_admin_insert on storage.objects;
drop policy if exists intensive_covers_admin_update on storage.objects;
drop policy if exists intensive_covers_admin_delete on storage.objects;

create policy intensive_covers_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'intensive-covers'
  and public.intensive_is_admin()
);

create policy intensive_covers_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'intensive-covers'
  and public.intensive_is_admin()
)
with check (
  bucket_id = 'intensive-covers'
  and public.intensive_is_admin()
);

create policy intensive_covers_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'intensive-covers'
  and public.intensive_is_admin()
);

create or replace function public.intensive_public_health()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'database','ready',
    'courses',(select count(*) from public.intensive_courses where is_active),
    'timestamp',now()
  );
$function$;

revoke all on function public.intensive_public_health() from public;
grant execute on function public.intensive_public_health() to anon, authenticated;

revoke execute on function public.intensive_start_exam(uuid) from authenticated;
revoke execute on function public.intensive_save_answer(uuid,uuid,jsonb,boolean) from authenticated;
revoke execute on function public.intensive_submit_attempt(uuid) from authenticated;

grant execute on function public.intensive_start_exam(uuid) to service_role;
grant execute on function public.intensive_save_answer(uuid,uuid,jsonb,boolean) to service_role;
grant execute on function public.intensive_submit_attempt(uuid) to service_role;

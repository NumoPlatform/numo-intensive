revoke all on function public.intensive_audit_changes() from public, anon, authenticated;
    grant execute on function public.intensive_audit_changes() to service_role;

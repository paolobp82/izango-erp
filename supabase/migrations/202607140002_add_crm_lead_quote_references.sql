alter table public.crm_leads
add column if not exists referencias_cotizacion text;

notify pgrst, 'reload schema';

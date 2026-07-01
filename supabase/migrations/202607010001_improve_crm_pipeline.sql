alter table public.crm_leads
  add column if not exists cliente_id uuid references public.clientes(id),
  add column if not exists contacto_nombre text,
  add column if not exists fecha_proxima_accion date,
  add column if not exists responsable_id uuid references public.perfiles(id),
  add column if not exists periodo_pipeline text,
  add column if not exists archivado boolean default false,
  add column if not exists seguimiento text;

update public.crm_leads
set periodo_pipeline = to_char(coalesce(created_at, now()), 'YYYY-MM')
where periodo_pipeline is null;

update public.crm_leads
set contacto_nombre = nombre_contacto
where contacto_nombre is null and nombre_contacto is not null;

update public.crm_leads
set fecha_proxima_accion = fecha_proximo_contacto
where fecha_proxima_accion is null and fecha_proximo_contacto is not null;

update public.crm_leads
set archivado = false
where archivado is null;

create index if not exists idx_crm_leads_cliente_id on public.crm_leads(cliente_id);
create index if not exists idx_crm_leads_periodo_pipeline on public.crm_leads(periodo_pipeline);
create index if not exists idx_crm_leads_archivado on public.crm_leads(archivado);
create index if not exists idx_crm_leads_responsable_id on public.crm_leads(responsable_id);

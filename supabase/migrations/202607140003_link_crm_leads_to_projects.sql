alter table public.crm_leads
  add column if not exists proyecto_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crm_leads_proyecto_id_fkey'
      and conrelid = 'public.crm_leads'::regclass
  ) then
    alter table public.crm_leads
      add constraint crm_leads_proyecto_id_fkey
      foreign key (proyecto_id)
      references public.proyectos(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_crm_leads_proyecto_id
  on public.crm_leads(proyecto_id);

notify pgrst, 'reload schema';

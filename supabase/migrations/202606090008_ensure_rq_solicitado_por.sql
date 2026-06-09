alter table public.requerimientos_pago
  add column if not exists solicitado_por uuid references public.perfiles(id) on delete set null;

create index if not exists idx_requerimientos_pago_solicitado_por
  on public.requerimientos_pago(solicitado_por);

notify pgrst, 'reload schema';

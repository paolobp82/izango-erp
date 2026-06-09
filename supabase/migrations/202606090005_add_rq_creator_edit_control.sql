alter table public.requerimientos_pago
  add column if not exists solicitado_por uuid references public.perfiles(id) on delete set null,
  add column if not exists editado_por_creador boolean not null default false,
  add column if not exists fecha_primera_edicion timestamptz;

create index if not exists idx_requerimientos_pago_solicitado_por
  on public.requerimientos_pago(solicitado_por);

create index if not exists idx_requerimientos_pago_proyecto_id
  on public.requerimientos_pago(proyecto_id);

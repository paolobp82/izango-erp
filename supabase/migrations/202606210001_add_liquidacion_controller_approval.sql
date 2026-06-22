alter table public.liquidaciones
  add column if not exists aprobado_controller boolean default false,
  add column if not exists aprobado_controller_por uuid,
  add column if not exists aprobado_controller_at timestamptz;

alter table if exists public.audiovisual_requerimientos
  add column if not exists deleted_at timestamptz,
  add column if not exists cancelado_motivo text,
  add column if not exists cancelado_por uuid references public.perfiles(id) on delete set null,
  add column if not exists cancelado_at timestamptz;

create index if not exists idx_audiovisual_req_deleted_at
  on public.audiovisual_requerimientos(deleted_at);

create table if not exists public.audiovisual_requerimientos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  ubicacion text,
  productor_id uuid references public.perfiles(id) on delete set null,
  fecha_entrega_solicitada date,
  fecha_devolucion_audiovisual date,
  piezas text[] not null default '{}',
  prioridad text not null default 'media' check (prioridad in ('alta', 'media', 'baja')),
  avance integer not null default 10 check (avance between 10 and 100 and avance % 10 = 0),
  referencia_url text,
  documento_url text,
  artes_url text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_progreso', 'en_revision', 'completado', 'cancelado')),
  creado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audiovisual_requerimiento_comentarios (
  id uuid primary key default gen_random_uuid(),
  requerimiento_id uuid not null references public.audiovisual_requerimientos(id) on delete cascade,
  usuario_id uuid references public.perfiles(id) on delete set null,
  comentario text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audiovisual_req_proyecto on public.audiovisual_requerimientos(proyecto_id);
create index if not exists idx_audiovisual_req_cotizacion on public.audiovisual_requerimientos(cotizacion_id);
create index if not exists idx_audiovisual_req_productor on public.audiovisual_requerimientos(productor_id);
create index if not exists idx_audiovisual_req_estado on public.audiovisual_requerimientos(estado);
create index if not exists idx_audiovisual_req_entrega on public.audiovisual_requerimientos(fecha_entrega_solicitada);
create index if not exists idx_audiovisual_req_comentarios_req on public.audiovisual_requerimiento_comentarios(requerimiento_id, created_at);

alter table public.audiovisual_requerimientos enable row level security;
alter table public.audiovisual_requerimiento_comentarios enable row level security;

create policy "authenticated read audiovisual requerimientos"
  on public.audiovisual_requerimientos for select
  to authenticated
  using (true);

create policy "authenticated insert audiovisual requerimientos"
  on public.audiovisual_requerimientos for insert
  to authenticated
  with check (true);

create policy "authenticated update audiovisual requerimientos"
  on public.audiovisual_requerimientos for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated delete audiovisual requerimientos"
  on public.audiovisual_requerimientos for delete
  to authenticated
  using (true);

create policy "authenticated read audiovisual comentarios"
  on public.audiovisual_requerimiento_comentarios for select
  to authenticated
  using (true);

create policy "authenticated insert audiovisual comentarios"
  on public.audiovisual_requerimiento_comentarios for insert
  to authenticated
  with check (true);

create policy "authenticated delete own audiovisual comentarios"
  on public.audiovisual_requerimiento_comentarios for delete
  to authenticated
  using (usuario_id = auth.uid());

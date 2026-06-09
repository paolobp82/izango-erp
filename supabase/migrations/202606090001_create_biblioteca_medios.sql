create extension if not exists pg_trgm;

create table if not exists public.biblioteca_medios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'otro' check (tipo in (
    'presentacion_comercial',
    'presentacion_institucional',
    'video',
    'foto',
    'diseno',
    '3d',
    'caso_exito',
    'otro'
  )),
  categoria text,
  cliente_id uuid references public.clientes(id) on delete set null,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  descripcion text,
  link_url text,
  archivo_url text,
  fecha date,
  responsable_id uuid references public.perfiles(id) on delete set null,
  tags text[] not null default '{}',
  estado text not null default 'activo' check (estado in ('activo', 'archivado')),
  creado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_biblioteca_medios_tipo on public.biblioteca_medios(tipo);
create index if not exists idx_biblioteca_medios_estado on public.biblioteca_medios(estado);
create index if not exists idx_biblioteca_medios_cliente on public.biblioteca_medios(cliente_id);
create index if not exists idx_biblioteca_medios_proyecto on public.biblioteca_medios(proyecto_id);
create index if not exists idx_biblioteca_medios_responsable on public.biblioteca_medios(responsable_id);
create index if not exists idx_biblioteca_medios_fecha on public.biblioteca_medios(fecha);
create index if not exists idx_biblioteca_medios_tags on public.biblioteca_medios using gin(tags);
create index if not exists idx_biblioteca_medios_titulo_trgm
  on public.biblioteca_medios using gin(titulo gin_trgm_ops);

alter table public.biblioteca_medios enable row level security;

create policy "authenticated read biblioteca medios"
  on public.biblioteca_medios for select
  to authenticated
  using (true);

create policy "authenticated insert biblioteca medios"
  on public.biblioteca_medios for insert
  to authenticated
  with check (true);

create policy "authenticated update biblioteca medios"
  on public.biblioteca_medios for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated delete biblioteca medios"
  on public.biblioteca_medios for delete
  to authenticated
  using (true);

alter table public.tareas
  add column if not exists creado_por uuid references public.perfiles(id) on delete set null,
  add column if not exists asignado_a uuid references public.perfiles(id) on delete set null,
  add column if not exists estado text not null default 'pendiente',
  add column if not exists prioridad text not null default 'media',
  add column if not exists fecha_limite date,
  add column if not exists proyecto_id uuid references public.proyectos(id) on delete set null,
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists fecha_completada timestamptz;

create table if not exists public.tarea_comentarios (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  usuario_id uuid references public.perfiles(id) on delete set null,
  comentario text not null,
  tipo text not null default 'comentario',
  link_url text,
  created_at timestamptz not null default now()
);

alter table public.tarea_comentarios
  add column if not exists tipo text not null default 'comentario',
  add column if not exists link_url text;

create index if not exists idx_tarea_comentarios_tarea_id_created_at
  on public.tarea_comentarios(tarea_id, created_at);

create index if not exists idx_tareas_asignado_estado
  on public.tareas(asignado_a, estado);

create index if not exists idx_tareas_creado_por_estado
  on public.tareas(creado_por, estado);

alter table public.alertas_config
  add column if not exists tarea_nueva_email boolean not null default true,
  add column if not exists tarea_comentario_email boolean not null default true,
  add column if not exists tarea_estado_email boolean not null default true,
  add column if not exists tarea_resumen_diario_email boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tareas_estado_check'
  ) then
    alter table public.tareas
      add constraint tareas_estado_check
      check (estado in ('pendiente', 'en_progreso', 'en_revision', 'completada', 'cancelada'))
      not valid;
  end if;
end $$;

alter table public.tareas
  validate constraint tareas_estado_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tarea_comentarios_tipo_check'
  ) then
    alter table public.tarea_comentarios
      add constraint tarea_comentarios_tipo_check
      check (tipo in ('comentario', 'cambio_estado', 'adjunto', 'devolucion'))
      not valid;
  end if;
end $$;

alter table public.tarea_comentarios
  validate constraint tarea_comentarios_tipo_check;

notify pgrst, 'reload schema';

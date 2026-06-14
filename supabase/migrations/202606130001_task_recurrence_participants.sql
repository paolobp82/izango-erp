alter table public.tareas
  add column if not exists frecuencia text not null default 'no_repite',
  add column if not exists recurrencia_intervalo integer not null default 1,
  add column if not exists recurrencia_fecha_fin date,
  add column if not exists recurrencia_max_repeticiones integer,
  add column if not exists recurrencia_grupo_id uuid,
  add column if not exists recurrencia_tarea_anterior_id uuid references public.tareas(id) on delete set null,
  add column if not exists recurrencia_secuencia integer not null default 1,
  add column if not exists notificar_participantes boolean not null default true,
  add column if not exists mostrar_participantes_mi_trabajo boolean not null default true,
  add column if not exists permitir_comentarios boolean not null default true,
  add column if not exists recibir_correos_automaticos boolean not null default true;

update public.tareas
set recurrencia_grupo_id = id
where recurrencia_grupo_id is null;

create table if not exists public.tarea_participantes (
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tarea_id, usuario_id)
);

create index if not exists idx_tarea_participantes_usuario
  on public.tarea_participantes(usuario_id);

create index if not exists idx_tareas_recurrencia_grupo
  on public.tareas(recurrencia_grupo_id, recurrencia_secuencia);

create index if not exists idx_tareas_frecuencia_estado
  on public.tareas(frecuencia, estado);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tareas_frecuencia_check'
  ) then
    alter table public.tareas
      add constraint tareas_frecuencia_check
      check (frecuencia in ('no_repite', 'diario', 'semanal', 'mensual', 'anual', 'laborables', 'personalizado_dias', 'personalizado_semanas', 'personalizado_meses'))
      not valid;
  end if;
end $$;

alter table public.tareas
  validate constraint tareas_frecuencia_check;

notify pgrst, 'reload schema';

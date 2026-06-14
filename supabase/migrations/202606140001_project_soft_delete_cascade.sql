create index if not exists idx_proyectos_deleted_at
  on public.proyectos(deleted_at);

create index if not exists idx_tareas_proyecto_estado
  on public.tareas(proyecto_id, estado);

create index if not exists idx_proyecto_tareas_proyecto_estado
  on public.proyecto_tareas(proyecto_id, estado);

create index if not exists idx_rq_proyecto_estado
  on public.requerimientos_pago(proyecto_id, estado);

create or replace function public.soft_delete_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_at timestamptz := now();
begin
  update public.proyectos
     set deleted_at = coalesce(deleted_at, v_deleted_at)
   where id = p_project_id;

  update public.tareas
     set estado = 'cancelada'
   where proyecto_id = p_project_id
     and estado in ('pendiente', 'en_progreso', 'en_revision');

  update public.proyecto_tareas
     set estado = 'bloqueada'
   where proyecto_id = p_project_id
     and estado in ('pendiente', 'en_progreso');

  update public.audiovisual_requerimientos
     set estado = 'cancelado',
         deleted_at = coalesce(deleted_at, v_deleted_at),
         cancelado_at = coalesce(cancelado_at, v_deleted_at),
         cancelado_motivo = coalesce(cancelado_motivo, 'Proyecto eliminado')
   where proyecto_id = p_project_id
     and deleted_at is null
     and estado in ('pendiente', 'en_progreso', 'en_revision');

  update public.requerimientos_pago
     set estado = 'rechazado'
   where proyecto_id = p_project_id
     and estado in ('pendiente_aprobacion', 'aprobado_produccion');
end;
$$;

grant execute on function public.soft_delete_project(uuid) to authenticated;

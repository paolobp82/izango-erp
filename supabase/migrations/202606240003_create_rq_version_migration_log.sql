create table if not exists public.rq_version_migration_log (
    id uuid primary key default gen_random_uuid(),
    proyecto_id uuid references public.proyectos(id) on delete cascade,
    cotizacion_origen_id uuid references public.cotizaciones(id) on delete set null,
    cotizacion_destino_id uuid references public.cotizaciones(id) on delete set null,
    rq_id uuid references public.requerimientos_pago(id) on delete set null,
    rq_diferencia_id uuid references public.requerimientos_pago(id) on delete set null,
    cotizacion_item_origen_id uuid references public.cotizacion_items(id) on delete set null,
    cotizacion_item_destino_id uuid references public.cotizacion_items(id) on delete set null,
    accion text not null,
    estado_rq text,
    monto_v1 numeric(12,2) default 0,
    monto_v2 numeric(12,2) default 0,
    diferencia numeric(12,2) default 0,
    creado_por uuid references public.perfiles(id) on delete set null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_rq_version_log_proyecto
on public.rq_version_migration_log(proyecto_id);

create index if not exists idx_rq_version_log_rq
on public.rq_version_migration_log(rq_id);

create index if not exists idx_rq_version_log_origen
on public.rq_version_migration_log(cotizacion_origen_id);

create index if not exists idx_rq_version_log_destino
on public.rq_version_migration_log(cotizacion_destino_id);

notify pgrst, 'reload schema';

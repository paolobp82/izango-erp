alter table public.items_biblioteca
  add column if not exists origen_proyecto_id uuid references public.proyectos(id) on delete set null,
  add column if not exists origen_proyecto_nombre text,
  add column if not exists origen_proyecto_codigo text,
  add column if not exists origen_cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  add column if not exists origen_cotizacion_item_id uuid references public.cotizacion_items(id) on delete set null,
  add column if not exists origen_cotizacion_version integer,
  add column if not exists origen_fecha timestamptz,
  add column if not exists origen_usuario_id uuid references public.perfiles(id) on delete set null;

create unique index if not exists idx_items_biblioteca_origen_cotizacion_item
  on public.items_biblioteca(origen_cotizacion_id, origen_cotizacion_item_id)
  where origen_cotizacion_id is not null and origen_cotizacion_item_id is not null;

create index if not exists idx_items_biblioteca_origen_proyecto
  on public.items_biblioteca(origen_proyecto_id);

create index if not exists idx_items_biblioteca_origen_cotizacion
  on public.items_biblioteca(origen_cotizacion_id);

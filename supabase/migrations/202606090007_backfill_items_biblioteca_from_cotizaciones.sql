alter table public.items_biblioteca
  add column if not exists origen_proyecto_id uuid references public.proyectos(id) on delete set null,
  add column if not exists origen_proyecto_nombre text,
  add column if not exists origen_proyecto_codigo text,
  add column if not exists origen_cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  add column if not exists origen_cotizacion_item_id uuid references public.cotizacion_items(id) on delete set null,
  add column if not exists origen_cotizacion_version integer,
  add column if not exists origen_fecha timestamptz,
  add column if not exists origen_usuario_id uuid references public.perfiles(id) on delete set null,
  add column if not exists costo_otros numeric default 0;

create unique index if not exists idx_items_biblioteca_origen_cotizacion_item
  on public.items_biblioteca(origen_cotizacion_id, origen_cotizacion_item_id)
  where origen_cotizacion_id is not null and origen_cotizacion_item_id is not null;

insert into public.items_biblioteca (
  descripcion,
  categoria,
  notas,
  centro_costos,
  margen_pct,
  precio_cliente_manual,
  proveedor_id,
  proveedor_nombre,
  costo_almacenaje,
  costo_impresion,
  costo_permisos,
  costo_instalacion,
  costo_performer,
  costo_alquiler,
  costo_supervision,
  costo_movilidad,
  costo_otros,
  costo_total,
  precio_cliente,
  activo,
  origen_proyecto_id,
  origen_proyecto_nombre,
  origen_proyecto_codigo,
  origen_cotizacion_id,
  origen_cotizacion_item_id,
  origen_cotizacion_version,
  origen_fecha,
  origen_usuario_id
)
select
  ci.descripcion,
  'Proforma' as categoria,
  null as notas,
  cc.nombre as centro_costos,
  coalesce(ci.margen_pct, 0),
  ci.precio_cliente_manual,
  ci.proveedor_id,
  ci.proveedor_nombre,
  coalesce(ci.costo_almacenaje, 0),
  coalesce(ci.costo_impresion, 0),
  coalesce(ci.costo_permisos, 0),
  coalesce(ci.costo_instalacion, 0),
  coalesce(ci.costo_performer, 0),
  coalesce(ci.costo_alquiler, 0),
  coalesce(ci.costo_supervision, 0),
  coalesce(ci.costo_movilidad, 0),
  coalesce(ci.costo_otros, 0),
  coalesce(ci.costo_total, 0),
  coalesce(ci.precio_cliente, 0),
  true,
  p.id,
  p.nombre,
  p.codigo,
  c.id,
  ci.id,
  c.version,
  coalesce(ci.created_at, c.created_at, now()),
  null
from public.cotizacion_items ci
join public.cotizaciones c on c.id = ci.cotizacion_id
left join public.proyectos p on p.id = c.proyecto_id
left join public.centro_costos cc on cc.id = ci.centro_costo_id
where ci.descripcion is not null
  and btrim(ci.descripcion) <> ''
  and coalesce(ci.tipo, 'item') not in ('familia', 'celda_extra')
  and not exists (
    select 1
    from public.items_biblioteca ib
    where ib.origen_cotizacion_id = c.id
      and ib.origen_cotizacion_item_id = ci.id
  )
on conflict do nothing;

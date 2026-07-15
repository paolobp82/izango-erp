-- Auditorias operativas RQ / Cotizaciones / Gestor / Liquidaciones
-- Solo SELECT. No ejecutar cambios automaticos.

-- 1. Items del Gestor vinculados a cotizacion no vigente.
select
  pt.id as gestor_item_id,
  pt.proyecto_id,
  p.codigo as proyecto_codigo,
  pt.cotizacion_id,
  p.cotizacion_aprobada_id
from public.proyecto_tareas pt
join public.proyectos p on p.id = pt.proyecto_id
where pt.cotizacion_id is not null
  and p.cotizacion_aprobada_id is not null
  and pt.cotizacion_id <> p.cotizacion_aprobada_id;

-- 2. Items del Gestor sin cotizacion_item_id.
select
  pt.id as gestor_item_id,
  pt.proyecto_id,
  p.codigo as proyecto_codigo,
  pt.titulo,
  pt.cotizacion_id,
  pt.cotizacion_item_id
from public.proyecto_tareas pt
left join public.proyectos p on p.id = pt.proyecto_id
where pt.cotizacion_item_id is null;

-- 3. RQ duplicados por proyecto y cotizacion_item_id.
select
  proyecto_id,
  cotizacion_item_id,
  count(*) as total_rq,
  array_agg(id order by created_at) as rq_ids,
  array_agg(estado order by created_at) as estados
from public.requerimientos_pago
where cotizacion_item_id is not null
  and coalesce(es_adicional, false) = false
  and estado not in ('cancelado', 'rechazado')
group by proyecto_id, cotizacion_item_id
having count(*) > 1;

-- 4. RQ pagados cancelados o inconsistentes.
select
  id,
  codigo_rq,
  numero_rq,
  proyecto_id,
  estado,
  fecha_pago,
  monto_solicitado
from public.requerimientos_pago
where estado in ('cancelado', 'rechazado')
  and fecha_pago is not null;

-- 5. RQ con log migrado pero potencialmente marcados pendientes por falta de vinculo.
select
  rq.id,
  rq.codigo_rq,
  rq.numero_rq,
  rq.proyecto_id,
  rq.cotizacion_item_id,
  log.accion,
  log.created_at
from public.requerimientos_pago rq
join public.rq_version_migration_log log
  on log.rq_id = rq.id or log.rq_diferencia_id = rq.id
where rq.cotizacion_item_id is null
  and log.accion in (
    'MANTENER_HISTORICO_ITEM_ELIMINADO',
    'CANCELAR_ITEM_ELIMINADO',
    'MIGRAR',
    'MIGRAR_REFERENCIA_PAGADO',
    'MIGRAR_GENERAR_DIFERENCIA',
    'MIGRAR_AJUSTAR_MONTO_MENOR',
    'MANTENER_PAGADO_GENERAR_DIFERENCIA',
    'MANTENER_PAGADO_REGISTRAR_REEMBOLSO',
    'GENERAR_RQ_DIFERENCIA'
  );

-- 6. RQ V2 presupuestados sin cotizacion_item_id.
select
  id,
  codigo_rq,
  numero_rq,
  proyecto_id,
  estado,
  es_adicional,
  cotizacion_item_id,
  created_at
from public.requerimientos_pago
where coalesce(es_adicional, false) = false
  and cotizacion_item_id is null
  and estado not in ('cancelado', 'rechazado');

-- 7. Items presupuestados incluidos mas de una vez en liquidacion.
select
  liquidacion_id,
  cotizacion_item_id,
  count(*) as repeticiones,
  array_agg(id) as liquidacion_item_ids
from public.liquidacion_items
where cotizacion_item_id is not null
group by liquidacion_id, cotizacion_item_id
having count(*) > 1;

-- 8. Proyectos con cotizacion_aprobada_id inexistente.
select
  p.id,
  p.codigo,
  p.nombre,
  p.cotizacion_aprobada_id
from public.proyectos p
left join public.cotizaciones c on c.id = p.cotizacion_aprobada_id
where p.cotizacion_aprobada_id is not null
  and c.id is null;

-- 9. Mas de una cotizacion aprobada por proyecto.
select
  proyecto_id,
  count(*) as cotizaciones_aprobadas,
  array_agg(id order by version) as cotizacion_ids,
  array_agg(version order by version) as versiones
from public.cotizaciones
where estado = 'aprobada_cliente'
  and deleted_at is null
group by proyecto_id
having count(*) > 1;

-- 10. RQ de proyectos eliminados.
select
  rq.id,
  rq.codigo_rq,
  rq.numero_rq,
  rq.proyecto_id,
  p.codigo as proyecto_codigo,
  p.deleted_at
from public.requerimientos_pago rq
join public.proyectos p on p.id = rq.proyecto_id
where p.deleted_at is not null;

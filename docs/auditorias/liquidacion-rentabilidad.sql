-- Auditoria operativa de liquidacion y rentabilidad
-- Solo SELECT. No modifica datos.

-- 1. RQ duplicados por proyecto e item de cotizacion.
select
  proyecto_id,
  cotizacion_item_id,
  count(*) as cantidad_rq,
  array_agg(coalesce(codigo_rq, 'RQ-' || lpad(numero_rq::text, 5, '0'))) as rqs
from public.requerimientos_pago
where cotizacion_item_id is not null
  and estado not in ('cancelado', 'rechazado')
group by proyecto_id, cotizacion_item_id
having count(*) > 1;

-- 2. RQ cancelados que podrian haber sido considerados en liquidacion por item.
select
  rp.id,
  rp.proyecto_id,
  rp.cotizacion_item_id,
  rp.estado,
  rp.monto_solicitado
from public.requerimientos_pago rp
where rp.estado = 'cancelado'
  and rp.cotizacion_item_id is not null;

-- 3. RQ rechazados que podrian haber sido considerados en liquidacion por item.
select
  rp.id,
  rp.proyecto_id,
  rp.cotizacion_item_id,
  rp.estado,
  rp.monto_solicitado
from public.requerimientos_pago rp
where rp.estado = 'rechazado'
  and rp.cotizacion_item_id is not null;

-- 4. Caja chica duplicada o con posible doble conteo por rq_id.
select
  cc.proyecto_id,
  cc.rq_id,
  count(*) as movimientos_caja,
  sum(coalesce(cc.monto_debe, 0)) as monto_caja,
  max(rp.estado) as estado_rq,
  max(rp.monto_solicitado) as monto_rq
from public.caja_chica cc
left join public.requerimientos_pago rp on rp.id = cc.rq_id
where cc.estado = 'aprobado'
  and cc.rq_id is not null
group by cc.proyecto_id, cc.rq_id
having count(*) > 0;

-- 5. Traslados sin afecta_rentabilidad o cancelados que no deben sumar.
select
  id,
  proyecto_id,
  codigo,
  titulo,
  estado,
  costo_real,
  afecta_rentabilidad
from public.logistica_traslados
where proyecto_id is not null
  and coalesce(costo_real, 0) > 0
  and (afecta_rentabilidad = false or estado in ('cancelado', 'rechazado', 'anulado'));

-- 6. Costos internos ejecutados con proyecto_id.
-- Actualmente no existe una tabla operativa dedicada de costos internos ejecutados.
-- Esta consulta revisa items de biblioteca originados por proyecto solo como referencia presupuestaria.
select
  origen_proyecto_id as proyecto_id,
  count(*) as items_biblioteca,
  sum(coalesce(costo_total, 0)) as costo_total_referencial
from public.items_biblioteca
where origen_proyecto_id is not null
group by origen_proyecto_id;

-- 7. Liquidaciones cerradas sin aprobacion Controller.
select
  id,
  proyecto_id,
  cerrada,
  aprobado_controller,
  aprobado_controller_por,
  aprobado_controller_at,
  fecha_cierre
from public.liquidaciones
where cerrada = true
  and coalesce(aprobado_controller, false) = false;

-- 8. Proyectos con margen negativo en liquidacion.
select
  l.id as liquidacion_id,
  l.proyecto_id,
  p.codigo,
  p.nombre,
  l.precio_cliente_real,
  l.costo_real,
  l.margen_real_pct
from public.liquidaciones l
join public.proyectos p on p.id = l.proyecto_id
where coalesce(l.margen_real_pct, 0) < 0
  and p.deleted_at is null;

-- 9. Proyectos terminados/liquidados/facturados sin liquidacion.
select
  p.id,
  p.codigo,
  p.nombre,
  p.estado
from public.proyectos p
left join public.liquidaciones l on l.proyecto_id = p.id
where p.deleted_at is null
  and p.estado in ('terminado', 'liquidado', 'pendiente_facturacion', 'facturado', 'cerrado_financiero')
  and l.id is null;

-- 10. Diferencias entre costo_real guardado y suma de liquidacion_items.
select
  l.id as liquidacion_id,
  l.proyecto_id,
  l.costo_real as costo_real_liquidacion,
  coalesce(sum(li.costo_real), 0) as costo_real_items_persistidos,
  l.costo_real - coalesce(sum(li.costo_real), 0) as diferencia
from public.liquidaciones l
left join public.liquidacion_items li on li.liquidacion_id = l.id
group by l.id, l.proyecto_id, l.costo_real
having abs(l.costo_real - coalesce(sum(li.costo_real), 0)) > 0.01;

-- 11. Proyectos sin liquidacion con costos reales potenciales.
select
  p.id,
  p.codigo,
  p.nombre,
  coalesce(sum(rp.monto_solicitado) filter (where rp.estado not in ('cancelado', 'rechazado', 'anulado')), 0) as rqs_validos,
  coalesce(sum(cc.monto_debe) filter (where cc.estado = 'aprobado'), 0) as caja_chica_aprobada,
  coalesce(sum(lt.costo_real) filter (where lt.afecta_rentabilidad is distinct from false and lt.estado not in ('cancelado', 'rechazado', 'anulado')), 0) as traslados_validos
from public.proyectos p
left join public.liquidaciones l on l.proyecto_id = p.id
left join public.requerimientos_pago rp on rp.proyecto_id = p.id
left join public.caja_chica cc on cc.proyecto_id = p.id
left join public.logistica_traslados lt on lt.proyecto_id = p.id
where p.deleted_at is null
  and l.id is null
group by p.id, p.codigo, p.nombre
having coalesce(sum(rp.monto_solicitado) filter (where rp.estado not in ('cancelado', 'rechazado', 'anulado')), 0)
     + coalesce(sum(cc.monto_debe) filter (where cc.estado = 'aprobado'), 0)
     + coalesce(sum(lt.costo_real) filter (where lt.afecta_rentabilidad is distinct from false and lt.estado not in ('cancelado', 'rechazado', 'anulado')), 0) > 0;

-- 12. Proyectos con liquidacion abierta o sin aprobacion Controller.
select
  l.id as liquidacion_id,
  l.proyecto_id,
  p.codigo,
  p.nombre,
  l.cerrada,
  l.aprobado_controller,
  l.costo_real
from public.liquidaciones l
join public.proyectos p on p.id = l.proyecto_id
where p.deleted_at is null
  and (coalesce(l.cerrada, false) = false or coalesce(l.aprobado_controller, false) = false);

-- 13. Proyectos con liquidacion cerrada y aprobada por Controller.
select
  l.id as liquidacion_id,
  l.proyecto_id,
  p.codigo,
  p.nombre,
  l.cerrada,
  l.aprobado_controller,
  l.costo_real,
  l.margen_real_pct
from public.liquidaciones l
join public.proyectos p on p.id = l.proyecto_id
where p.deleted_at is null
  and l.cerrada = true
  and l.aprobado_controller = true;

-- 14. Traslados validos que deben sumar al costo real consolidado.
select
  id,
  proyecto_id,
  codigo,
  titulo,
  estado,
  costo_real,
  afecta_rentabilidad
from public.logistica_traslados
where proyecto_id is not null
  and coalesce(costo_real, 0) > 0
  and afecta_rentabilidad is distinct from false
  and estado not in ('cancelado', 'rechazado', 'anulado');

-- 15. RQ adicionales que deben mostrarse separados.
select
  id,
  proyecto_id,
  codigo_rq,
  numero_rq,
  estado,
  es_adicional,
  cotizacion_item_id,
  monto_solicitado
from public.requerimientos_pago
where proyecto_id is not null
  and estado not in ('cancelado', 'rechazado', 'anulado')
  and (es_adicional = true or cotizacion_item_id is null);

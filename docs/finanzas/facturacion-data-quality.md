# Calidad de datos de Facturacion y Cuentas por Cobrar

Este documento lista consultas de control para detectar inconsistencias antes de hacer backfills o correcciones manuales. No ejecutar cambios automaticos sin validacion de Controller.

## Proyecto facturado sin factura valida

Detecta proyectos activos en estado `facturado` sin una factura activa, emitida y con total mayor a cero.

```sql
select p.id, p.codigo, p.nombre, p.estado
from public.proyectos p
where p.deleted_at is null
  and p.estado = 'facturado'
  and not exists (
    select 1
    from public.facturas f
    where f.proyecto_id = p.id
      and coalesce(f.estado, '') not in ('anulada', 'cancelada')
      and nullif(trim(coalesce(f.numero_factura, '')), '') is not null
      and f.fecha_emision is not null
      and coalesce(f.subtotal, 0) + coalesce(f.igv, 0) > 0
  );
```

Caso detectado en la validacion de solo lectura:

- `IZ-26477` - Lanzamiento Motokar + Test Ride Credivargas Iquitos - Honda (`61d65df3-5241-47e1-a090-676ea5e513d6`)

## Facturas sin proyecto

```sql
select id, numero_factura, estado, fecha_emision, subtotal, igv
from public.facturas
where proyecto_id is null
  and coalesce(estado, '') not in ('anulada', 'cancelada');
```

## Facturas cobradas sin fecha de abono

```sql
select id, numero_factura, proyecto_id, estado, monto_final_abonado, fecha_abono
from public.facturas
where estado in ('cobrada', 'pagada')
  and fecha_abono is null;
```

## Facturas cobradas sin monto abonado

```sql
select id, numero_factura, proyecto_id, estado, monto_final_abonado, fecha_abono
from public.facturas
where estado in ('cobrada', 'pagada')
  and coalesce(monto_final_abonado, 0) <= 0;
```

## Facturas pendientes con saldo cero

Saldo pendiente = `subtotal + igv - monto_final_abonado` solo cuando la factura esta cobrada/pagada. En estados pendientes, el monto cobrado contable debe ser cero.

```sql
select id, numero_factura, proyecto_id, estado, subtotal, igv, monto_final_abonado
from public.facturas
where estado in ('pendiente', 'emitida', 'pendiente_cobro')
  and coalesce(subtotal, 0) + coalesce(igv, 0) <= 0;
```

## Facturas anuladas con monto cobrado

```sql
select id, numero_factura, proyecto_id, estado, monto_final_abonado, fecha_abono
from public.facturas
where estado in ('anulada', 'cancelada')
  and coalesce(monto_final_abonado, 0) > 0;
```

## Facturas cobradas con monto parcial

Mientras no exista modelo de pagos parciales, una factura cobrada/pagada debe cerrar el total de la factura.

```sql
select id, numero_factura, proyecto_id, estado, subtotal, igv, monto_final_abonado
from public.facturas
where estado in ('cobrada', 'pagada')
  and abs((coalesce(subtotal, 0) + coalesce(igv, 0)) - coalesce(monto_final_abonado, 0)) > 0.01;
```

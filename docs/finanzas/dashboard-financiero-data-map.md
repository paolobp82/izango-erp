# Dashboard Financiero - Mapa de datos validado

Fuente funcional: `Izango_Tablero_Tesoreria Validado .xlsx` (`GRUPO IZANGO - TABLERO DE CONTROL DE TESORERIA`, `Parametros`, hojas por empresa, `Consolidado`, `Historial`).

Fecha de contraste: 2026-07-13.

## Resumen

El Excel validado modela tesoreria diaria por empresa y grupo. La regla central es separar flujo confirmado de flujo esperado: los ingresos esperados se informan, pero no entran a la caja proyectada hasta quedar confirmados/cobrados.

Las fuentes reales disponibles en el ERP son parciales:

- Ingresos: `facturas` con `fecha_vencimiento`, `fecha_abono`, `estado`, `monto_final_abonado`.
- Pagos: bandeja consolidada de Tesoreria desde RQP, Caja Chica, Gastos de Oficina/RPA y Obligaciones Financieras.
- Caja inicial, parametros de seguridad e historial de cierre: faltaban como datos persistentes y requieren migracion minima.

## Matriz por indicador

| Indicador exacto | Definicion funcional | Formula | Fuente real disponible | Tabla | Campos | Filtros de fecha | Filtros de entidad | Estado | Riesgo de doble conteo | Accion tecnica propuesta |
|---|---|---|---|---|---|---|---|---|---|---|
| Caja inicial total | Suma de saldos iniciales del dia para las entidades del grupo. | sum(caja_inicial por empresa) | Faltante como dato persistente. Caja Chica tiene movimientos, pero no saldo diario formal por empresa. | `tesoreria_saldos_diarios` nueva | `fecha`, `empresa`, `cuenta`, `saldo_inicial` | `fecha = fecha seleccionada` | `empresa in Izango 360, Izango Selva, Caja Chica` | faltante | Bajo si se usa una sola tabla de saldos diarios. | Crear tabla idempotente de saldos diarios y usar el ultimo saldo por empresa/cuenta del dia. |
| Ingresos esperados hoy | Cobros esperados por vencer o vencer hoy, todavia no confirmados. | sum(facturas pendientes con vencimiento en fecha) | Disponible parcial en Facturacion/CxC. | `facturas` | `estado`, `fecha_vencimiento`, `fecha_emision`, `monto_final_abonado`, `subtotal`, `igv`, `entidad_factoring` | `coalesce(fecha_vencimiento, fecha_emision) = fecha seleccionada` | Entidad no esta normalizada; fallback Izango 360. | parcial | Medio si se mezclan facturas finales/parciales sin regla de negocio clara. | Usar estados pendientes y `monto_final_abonado`; documentar entidad como parcial hasta normalizar cuenta/empresa de cobro. |
| Ingresos confirmados hoy | Cobros realmente abonados/cobrados en la fecha. | sum(facturas cobradas/pagadas con fecha_abono en fecha) | Disponible. | `facturas` | `estado`, `fecha_abono`, `monto_final_abonado`, `subtotal`, `igv`, `entidad_factoring` | `fecha_abono = fecha seleccionada` | Entidad no esta normalizada; fallback Izango 360. | parcial | Bajo si se excluye de ingresos esperados al estar cobrada/pagada. | Usar `monto_final_abonado` y estados `cobrada/pagada`. |
| Pagos programados hoy | Pagos no ejecutados con fecha de programacion o necesidad en la fecha. | sum(items Tesoreria no pagados/anulados con fecha = fecha) | Disponible via servicios de Tesoreria. | `requerimientos_pago`, `caja_chica`, `gastos_oficina`, `prestamo_cuotas`, `prestamos` | Fechas, monto, estado, empresa/entidad. | `fecha_programada_pago` fallback `fecha_necesidad_pago` = fecha | `empresa` normalizada por mapper. | disponible | Alto si se consulta RQP/Caja/Gastos/Obligaciones por separado y ademas el servicio consolidado. | Usar una sola fuente consolidada y deduplicar por `origen:id`. |
| Pagos ejecutados hoy | Pagos con fecha real de pago/desembolso en la fecha. | sum(items Tesoreria pagados con fecha_pago = fecha) | Parcial: RQP tiene `fecha_pago`; gastos pueden no tener fecha real; caja chica no debe usar `aprobado_at` como pago. | `requerimientos_pago`, `caja_chica`, `gastos_oficina`, `prestamo_cuotas` | `fecha_pago`, `fecha_desembolso`, `pagado_at`, `monto` | `fecha_pago = fecha seleccionada` | `empresa` normalizada por mapper. | parcial | Medio si se interpreta aprobado como pagado. | Solo computar como ejecutado cuando exista fecha real; no usar `aprobado_at` automaticamente. |
| Produccion del dia | Pagos de categoria Produccion programados/comprometidos en la fecha. | sum(pagos categoria Produccion con fecha del dia) | Parcial: RQP operativo normalmente es produccion; Caja/Gastos tienen categoria/tipo. | Fuentes de Tesoreria | `categoria`, `origen`, `tipo`, `monto`, fechas | fecha programada/necesidad = fecha | `empresa` | parcial | Medio por falta de categoria estructurada en RQP. | Clasificar RQP como Produccion por defecto; Caja/Gastos por categoria/tipo. |
| Caja disponible ahora | Caja disponible con movimientos confirmados. | Caja inicial + ingresos confirmados - pagos ejecutados | Requiere saldos + facturas + pagos ejecutados. | Mixta | ver fuentes previas | fecha seleccionada | empresa/grupo | parcial | Bajo si no se suman ingresos esperados. | Calcular en servicio, no en UI. |
| Caja final proyectada | Proyeccion conservadora al final del dia. | Caja inicial + ingresos confirmados - pagos programados | Requiere saldos + ingresos confirmados + pagos programados. | Mixta | ver fuentes previas | fecha seleccionada | empresa/grupo | parcial | Bajo si se mantiene regla de no sumar ingresos esperados. | Calcular en servicio, no en UI. |
| Necesidad de fondeo | Deficit requerido para cubrir caja final negativa. | max(0, abs(caja_final_proyectada negativa)) | Calculable. | Servicio | totales calculados | fecha seleccionada | empresa/grupo | disponible | Bajo. | Calcular por empresa y grupo. |
| Transferencia recomendada | Monto sugerido desde empresa con excedente hacia mayor deficit. | min(excedente mayor, deficit mayor) | Calculable. | Servicio | totales calculados + nivel seguridad | fecha seleccionada | empresas | disponible | Bajo. | Calcular rebalanceo sobre excedente despues de nivel de seguridad. |
| Liquidez del grupo | Estado consolidado del grupo. | Caja final proyectada total comparada contra niveles de seguridad. | Calculable. | Servicio + parametros | `nivel_minimo`, `nivel_seguridad` | fecha seleccionada | grupo | parcial | Bajo. | Crear parametros minimos por empresa. |
| Pagos vencidos | Pagos pendientes con fecha anterior a la fecha seleccionada. | count/sum(items no pagados con fecha < fecha) | Disponible via Tesoreria. | Fuentes Tesoreria | estado, fecha programada/necesidad, monto | `< fecha seleccionada` | empresa/grupo | disponible | Medio si se mezclan estados pagados sin fecha real. | Usar estado calculado del servicio y excluir pagado/anulado. |
| Consolidado por Izango 360 | Resumen de caja, ingresos, pagos, caja final y estado para la empresa. | Totales filtrados por empresa. | Parcial. | Mixta | empresa/entidad | fecha seleccionada | `empresa = Izango 360` | parcial | Medio por facturas sin entidad. | Fallback Izango 360 para facturas sin entidad hasta normalizacion. |
| Consolidado por Izango Selva | Resumen de caja, ingresos, pagos, caja final y estado para la empresa. | Totales filtrados por empresa. | Parcial. | Mixta | empresa/entidad | fecha seleccionada | `empresa = Izango Selva` | parcial | Medio por facturas sin entidad. | Usar entidad/factoring si existe; si no, mantener como sin datos configurados. |
| Consolidado Caja Chica | Resumen de caja chica independiente. | Saldo inicial caja chica + movimientos confirmados - pagos. | Parcial. | `tesoreria_saldos_diarios`, `caja_chica` | empresa, cuenta, montos | fecha seleccionada | `empresa = Caja Chica` | parcial | Medio si Caja Chica tambien se cuenta como gasto de RQP. | Deduplicar por origen y no cruzar contra RQP. |
| Total Grupo | Consolidado de las empresas. | sum(empresas) | Calculable. | Servicio | totales por empresa | fecha seleccionada | grupo | disponible | Bajo si dedupe por origen. | Calcular desde resumentes por empresa. |
| Estado de liquidez | Salud visual de caja por empresa/grupo. | Deficit si caja final < nivel minimo; Atencion si < nivel seguridad; Saludable si >= nivel seguridad. | Requiere parametros. | `tesoreria_parametros` nueva | `nivel_minimo`, `nivel_seguridad` | vigente | empresa | faltante | Bajo. | Crear parametros con defaults conservadores. |
| Excedente | Caja disponible sobre nivel de seguridad. | max(0, caja_final_proyectada - nivel_seguridad) | Calculable. | Servicio + parametros | totales + parametros | fecha seleccionada | empresa | disponible | Bajo. | Calcular en servicio. |
| Deficit | Caja necesaria para no quedar bajo minimo/seguridad. | max(0, nivel_minimo - caja_final_proyectada) | Calculable. | Servicio + parametros | totales + parametros | fecha seleccionada | empresa | disponible | Bajo. | Calcular en servicio. |
| Rebalanceo recomendado | Transferencia sugerida entre empresas. | empresa mayor deficit vs mayor excedente. | Calculable. | Servicio | resumen empresas | fecha seleccionada | grupo | disponible | Bajo. | Mostrar recomendacion textual y monto. |
| Fondeo externo restante | Deficit no cubierto por excedentes internos. | max(0, deficit_total - excedente_total) | Calculable. | Servicio | resumen empresas | fecha seleccionada | grupo | disponible | Bajo. | Calcular en servicio. |
| Alertas | Mensajes de riesgo de tesoreria. | Reglas: caja negativa, vencidos, bajo seguridad, fondeo, liquidez. | Calculable. | Servicio | resumen + pagos vencidos + parametros | fecha seleccionada | grupo | disponible | Bajo. | Generar alertas diferenciando OK/ADVERTENCIA/CRITICO. |
| Pagos por categoria | Distribucion de pagos del dia por categoria. | sum(pagos programados por categoria) | Parcial. | Fuentes Tesoreria | categoria/tipo/origen/monto | fecha seleccionada | grupo/empresa | parcial | Medio por categoria RQP faltante. | Normalizar categorias en mapper financiero. |
| Produccion versus otros gastos | Separacion Produccion vs resto. | Produccion = categoria Produccion; Otros = total pagos - produccion. | Parcial. | Fuentes Tesoreria | categoria, monto | fecha seleccionada | grupo | parcial | Medio. | Usar categoria normalizada. |
| Evolucion historica | Historial de caja final diaria por empresa y grupo. | filas guardadas por fecha. | Faltante persistente. | `tesoreria_cierres_diarios` nueva | `fecha`, `empresa`, `caja_final_proyectada` | rango historico | empresa/grupo | faltante | Bajo. | Crear cierre diario historico y graficar ultimos registros. |
| Guardado explicito del cierre diario | Snapshot manual del resultado del dia. | Insertar resumen calculado por empresa/grupo. | Faltante. | `tesoreria_cierres_diarios` nueva | snapshot y totales | fecha seleccionada | empresa/grupo | faltante | Bajo si se evita sobrescribir. | Crear boton de cierre diario con insercion idempotente por fecha/empresa. |
| Selector de fecha | Permite analizar/simular un dia distinto. | `fechaSeleccionada` controla filtros. | Disponible en UI a crear. | N/A | N/A | fecha seleccionada | N/A | faltante | Bajo. | Agregar input date y recargar calculos. |

## Supuestos controlados

- Facturas sin entidad/cuenta bancaria se asignan inicialmente a `Izango 360`. Esto es parcial y debe normalizarse en una fase posterior.
- RQP se clasifica como `Produccion` cuando no exista categoria explicita porque representa pagos operativos del flujo productivo.
- Caja Chica aprobada no equivale a pagada; solo cuenta como ejecutada si existe fecha real de pago/desembolso.
- Gastos de Oficina con `estado_pago = pagado` solo se consideran ejecutados si existe fecha real compatible. Si no existe, quedan como dato parcial.

## Acciones tecnicas

1. Crear tablas idempotentes para `tesoreria_saldos_diarios`, `tesoreria_parametros` y `tesoreria_cierres_diarios`.
2. Crear servicios separados de carga y calculo para Dashboard Financiero.
3. Reutilizar servicios de Tesoreria para pagos y evitar dobles conteos por origen.
4. Mantener el `page.tsx` como composicion visual compacta.
5. Mostrar estados diferenciados: cero real, sin datos, sin configurar y error de carga.

# Auditoría Financiera Integral - Izango ERP 360

Fecha: 22 de junio de 2026

Rama: `codex/auditoria-financiera-integral`

Alcance: Facturación, CxC, CxP, Flujo de Caja, Dashboard Financiero, Flujo Ejecutivo, Liquidaciones, Rentabilidad, Centro de Costos Financiero, Dashboard general, RQ, Caja Chica, Gastos de Oficina y reporte PDF de proyecto.

Esta fase es exclusivamente documental. No se modificó código funcional, fórmulas, permisos ni migraciones.

## A. Resumen ejecutivo

El ERP tiene constantes financieras compartidas para estados de factura y RQ, pero no todos los módulos las consumen. Como resultado, conceptos con el mismo nombre pueden representar importes distintos.

Las diferencias de mayor impacto son:

1. **Facturado** suele ser `subtotal + IGV`, pero Facturación excluye solo `anulada`, mientras Dashboard, Rentabilidad y Centro de Costos excluyen `anulada` y `cancelada`. El reporte PDF no excluye ninguna.
2. **Cobrado** usa `monto_final_abonado`, no el total de factura. Esto es correcto para caja, pero no es comparable directamente con venta bruta porque descuenta detracción, retención y pronto pago.
3. **Pendiente por cobrar** usa `monto_final_abonado` y estados compartidos en CxC, Dashboard y flujos; Facturación solo considera `emitida`.
4. **Costo real** tiene al menos tres significados:
   - `liquidaciones.costo_real`;
   - RQ pagados + Caja Chica aprobada;
   - RQ asociados a ítems, incluso si todavía no están pagados, más ajustes manuales.
5. **RQ con tratamiento “Más IGV”** se suma como `monto_solicitado` en CxP, flujos y Centro de Costos, mientras el reporte PDF usa `monto_solicitado + 18%`.
6. **Margen promedio** puede ser promedio simple de porcentajes o margen ponderado global.
7. **CxP** incluye Caja Chica aprobada como obligación; el Dashboard Financiero solo incluye Caja Chica pendiente.
8. Caja Chica permite `rq_id`; sumar el RQ y su desembolso de caja sin deduplicación puede duplicar costos o salidas.
9. Flujo de Caja y Flujo Ejecutivo no tienen la misma cobertura de fuentes ni usan las mismas fechas para RQ.

Conclusión: los números actuales pueden ser internamente correctos para el propósito local de cada pantalla, pero no existe todavía un contrato financiero único que permita comparar KPIs entre módulos sin contexto.

## B. Mapa de fuentes financieras

| Fuente | Campos principales usados | Significado actual observado | Módulos consumidores |
|---|---|---|---|
| `facturas` | `subtotal`, `igv`, `monto_final_abonado`, `estado`, `fecha_emision`, `fecha_vencimiento`, `fecha_abono` | Venta bruta, efectivo neto esperado/cobrado y calendario de cobranza | Facturación, Dashboard, CxC, Flujos, Liquidaciones, Rentabilidad, Centro de Costos, reporte PDF |
| `requerimientos_pago` | `monto_solicitado`, `tratamiento_igv`, `estado`, `fecha_pago`, `created_at`, `updated_at`, `proyecto_id` | Obligación operativa y pago a proveedor | RQ, CxP, Flujos, Dashboard Financiero, Liquidaciones, Centro de Costos |
| `liquidaciones` | `costo_presupuestado`, `costo_real`, `precio_cliente_presupuestado`, `precio_cliente_real`, `margen_real_pct`, `cerrada` | Consolidado de costo y margen del proyecto | Liquidaciones, Rentabilidad, Dashboard Financiero, reporte PDF |
| `liquidacion_items` | `costo_presupuestado`, `costo_real`, vínculo RQ | Detalle de costo presupuestado/real | Liquidaciones |
| `caja_chica` | `monto_debe`, `monto_haber`, `estado`, `proyecto_id`, `rq_id`, `fecha` | Egresos/ingresos de fondo operativo | Caja Chica, CxP, Dashboard Financiero, Centro de Costos |
| `gastos_oficina` | `monto`, `estado_pago`, `fecha`, `fecha_vencimiento` | Gasto administrativo real o pendiente | Gastos de Oficina, CxP, Dashboard Financiero, Flujo Ejecutivo |
| `prestamos` / cuotas / pagos | principal, cuotas, pagos, vencimientos | Deuda financiera y servicio de deuda | Dashboard Financiero, Flujo Ejecutivo |
| `cotizaciones` | `total_cliente`, `subtotal_costo`, `margen_pct` | Venta y costo presupuestados | Dashboard, Liquidaciones, Proyecto 360 |

### Relaciones que requieren control de duplicidad

- `caja_chica.rq_id` puede relacionar un egreso con un RQ.
- RQ y Caja Chica también pueden compartir `proyecto_id`.
- Gastos de Oficina no muestran vínculo explícito con RQ en los cálculos auditados.
- Liquidaciones pueden incorporar el monto de un RQ en `costo_real`, mientras Centro de Costos vuelve a sumar RQ pagados desde la tabla fuente.

## C. Tabla de fórmulas por módulo

| Módulo | Concepto | Fórmula actual |
|---|---|---|
| Facturación | Total factura | `subtotal + igv` |
| Facturación | Monto final abonado | `total - detracción - retención - pronto pago` |
| Facturación | Total emitido | Suma `subtotal + igv` donde estado `!= anulada` |
| Facturación | Cobrado | Suma `monto_final_abonado` donde estado `cobrada` |
| Facturación | Pendiente | Suma `monto_final_abonado` donde estado `emitida` |
| CxC | Total por cobrar | Suma `monto_final_abonado` en `pendiente`, `emitida`, `pendiente_cobro` |
| CxC | Vencido | CxC con `fecha_vencimiento || fecha_emision < hoy` |
| CxC | Por vencer | CxC con fecha de referencia `>= hoy` |
| CxP | Total por pagar | RQ pendientes + Caja Chica `pendiente/aprobado` + Gastos Oficina `pendiente/vencido` |
| Dashboard Financiero | Caja estimada | Cobrado + Caja Chica neta aprobada - RQ pagado - Gastos Oficina pagados - pagos de deuda |
| Dashboard Financiero | CxC | Facturas pendientes por `monto_final_abonado` |
| Dashboard Financiero | CxP | RQ por pagar + Caja Chica pendiente + Gastos Oficina pendiente/vencido |
| Dashboard Financiero | Margen promedio | Promedio simple de `margen_real_pct` de liquidaciones cerradas |
| Dashboard Financiero | Rentabilidad mes | `(facturación bruta no anulada/cancelada - RQ pagados) / facturación bruta` |
| Flujo de Caja | Ingreso real | `monto_final_abonado` de facturas cobradas/pagadas agrupado por `fecha_abono || fecha_emision` |
| Flujo de Caja | Ingreso proyectado | `monto_final_abonado` de facturas pendientes agrupado por vencimiento |
| Flujo de Caja | Egreso real | `monto_solicitado` de RQ pagados agrupado por `updated_at || created_at` |
| Flujo de Caja | Egreso proyectado | `monto_solicitado` de RQ en aprobado_producción/aprobado/programado agrupado por `created_at` |
| Flujo Ejecutivo | Ingreso real/proyectado | Igual base de factura que Flujo de Caja |
| Flujo Ejecutivo | Egreso real | RQ pagados + Gastos Oficina pagados |
| Flujo Ejecutivo | Egreso proyectado | RQ por pagar + Gastos Oficina pendiente/vencido + saldo de cuotas no pagadas |
| Liquidaciones | Facturado | `subtotal + igv` excluyendo solo `anulada` |
| Liquidaciones | Cobrado | `monto_final_abonado` donde estado `cobrada` |
| Liquidaciones | Pendiente | `monto_final_abonado` en `pendiente`, `emitida`, `pendiente_cobro` |
| Liquidaciones | Costo real del ítem | Costo manual existente; si es cero, monto del RQ asociado |
| Liquidaciones | Costo RQ adicional | `monto_solicitado` de RQ sin ítem, salvo cancelado/rechazado |
| Liquidaciones | Costo real total | Suma de costo real de ítems presupuestados + adicionales |
| Liquidaciones | Utilidad real | `precio_cliente_real - costo_real_total` |
| Liquidaciones | Margen real | `utilidad_real / precio_cliente_real` |
| Liquidaciones | Utilidad financiera | `(facturado si existe; si no precio_cliente_real) - costo_real_total` |
| Rentabilidad | Ingreso por proyecto | Facturación bruta válida; fallback `precio_cliente_real` |
| Rentabilidad | Costo | `liquidaciones.costo_real` |
| Rentabilidad | Utilidad | Ingreso - costo |
| Rentabilidad | Margen proyecto | Utilidad / ingreso; fallback `margen_real_pct` |
| Rentabilidad | Margen KPI | `(suma ingresos cerrados - suma costos cerrados) / suma ingresos cerrados` |
| Centro de Costos | Facturado | `subtotal + igv`, excluyendo anulada/cancelada |
| Centro de Costos | Cobrado | `monto_final_abonado` en cobrada/pagada |
| Centro de Costos | Costo real | RQ pagados + Caja Chica aprobada |
| Centro de Costos | Utilidad | Facturado - costo real |
| Centro de Costos | Margen proyecto | Utilidad / facturado |
| Centro de Costos | Margen promedio | Promedio simple de márgenes de proyectos facturados |
| Dashboard general | Facturado | `subtotal + igv`, excluyendo anulada/cancelada |
| Dashboard general | Cobrado | `monto_final_abonado` en cobrada/pagada |
| Dashboard general | Por cobrar | `monto_final_abonado` en emitida/pendiente/pendiente_cobro |
| Dashboard general | Margen promedio | Promedio simple de `margen_real_pct` de liquidaciones cerradas |
| Reporte PDF | Total facturado | Suma `subtotal + igv` de todas las facturas del proyecto |
| Reporte PDF | Total RQ mostrado | `rqIgvDetalle.total`, respetando tratamiento IGV |
| Reporte PDF | Costo/margen | Valores persistidos en liquidación |

## D. Estados usados por módulo

### Facturas

Definición compartida en `lib/finance.ts`:

| Categoría | Estados |
|---|---|
| Cobradas | `cobrada`, `pagada` |
| Pendientes | `pendiente`, `emitida`, `pendiente_cobro` |
| Anuladas | `anulada`, `cancelada` |

Uso real:

| Módulo | Cobrada | Pendiente | Excluida |
|---|---|---|---|
| Facturación | Solo `cobrada` | Solo `emitida` | Solo `anulada` |
| CxC | No aplica | Los 3 estados compartidos | La consulta no los incluye |
| Dashboard general | `cobrada`, `pagada` | Los 3 estados compartidos | `anulada`, `cancelada` |
| Dashboard Financiero | `cobrada`, `pagada` | Los 3 estados compartidos | Para ventas del mes: `anulada`, `cancelada` |
| Flujo de Caja | `cobrada`, `pagada` | Los 3 estados compartidos | Consulta excluye `anulada`; filtros posteriores excluyen otros no relevantes |
| Flujo Ejecutivo | `cobrada`, `pagada` | Los 3 estados compartidos | Implícito por categorías |
| Liquidaciones | Solo `cobrada` | Los 3 estados compartidos | Solo `anulada` |
| Rentabilidad | No aplica | No aplica | `anulada`, `cancelada` |
| Centro de Costos | `cobrada`, `pagada` | No se usa para costo | `anulada`, `cancelada` |
| Reporte PDF | No distingue | No distingue | No excluye |

### RQ

Definición compartida “por pagar”:

`pendiente_aprobacion`, `aprobado_produccion`, `aprobado`, `programado`.

Estados del flujo:

`pendiente_aprobacion → aprobado_produccion → aprobado → programado → pagado`

Estados fuera del flujo activo:

`cancelado`, `rechazado`, y referencias a `cerrado`.

Diferencias observadas:

- Flujo de Caja proyectado omite `pendiente_aprobacion`.
- Dashboard general considera pendiente cualquier estado que no sea `pagado/rechazado/cancelado/cerrado`.
- Liquidaciones puede usar el monto de RQ pendiente, aprobado o programado como costo real.
- Centro de Costos usa solo RQ `pagado` para costo real.
- Reporte PDF aplica tratamiento IGV a todos los RQ mostrados.

### Caja Chica

Estados: `pendiente`, `aprobado`, `rechazado`.

- Caja Chica considera real los `monto_debe` aprobados.
- CxP considera por pagar tanto pendiente como aprobado.
- Dashboard Financiero considera por pagar solo pendiente y usa aprobado dentro de caja neta.
- Centro de Costos considera costo real los egresos aprobados.

### Gastos de Oficina

Estados utilizados: `pendiente`, `vencido`, `pagado`.

- CxP y proyección usan pendiente/vencido.
- Flujo real y caja estimada usan pagado.
- No forman parte del costo real de Centro de Costos.

## E. Inconsistencias detectadas

### FIN-001 - Facturado no excluye los mismos estados

Facturación y Liquidaciones excluyen únicamente `anulada`; Dashboard, Rentabilidad y Centro de Costos excluyen `anulada` y `cancelada`; reporte PDF no excluye ninguna.

Riesgo: total facturado distinto para el mismo proyecto.

### FIN-002 - Cobrado no usa los mismos estados

Facturación y Liquidaciones solo usan `cobrada`. Los helpers y otros módulos también aceptan `pagada`.

Riesgo: facturas históricas/externas con estado `pagada` aparecen cobradas en Dashboard/Centro de Costos, pero no en Facturación/Liquidaciones.

### FIN-003 - Pendiente de Facturación es más estrecho

Facturación solo suma `emitida`; CxC, Dashboard, flujos y Liquidaciones suman `pendiente`, `emitida`, `pendiente_cobro`.

Riesgo: KPI pendiente menor en Facturación.

### FIN-004 - Venta bruta y efectivo neto se comparan como si fueran equivalentes

Facturado usa `subtotal + igv`. Cobrado y pendiente usan `monto_final_abonado`, que descuenta detracción, retención y pronto pago.

Riesgo: “Facturado - Cobrado” no representa necesariamente saldo por cobrar contable. Parte de la diferencia puede corresponder a detracciones/retenciones/descuentos.

### FIN-005 - Importación de facturas usa otra fórmula

La importación fija IGV en 18% del subtotal, pero guarda `monto_final_abonado = subtotal`, sin sumar IGV ni aplicar detracción/retención/pronto pago.

Evidencia: `app/facturacion/page.tsx:201`.

Riesgo: facturas importadas y creadas manualmente pueden tener bases de CxC distintas.

### FIN-006 - Tratamiento IGV de RQ no aplicado en módulos financieros

CxP, Dashboard, Flujos, Liquidaciones y Centro de Costos usan `monto_solicitado`. El reporte PDF usa `rqIgvDetalle.total`.

Ejemplo: RQ de S/ 1,000 con `mas_igv`:

- CxP/Flujo/Centro de Costos: S/ 1,000.
- Reporte PDF: S/ 1,180.

Riesgo: subestimación de obligaciones/costos si `monto_solicitado` es base sin IGV.

### FIN-007 - Costo real no tiene una definición única

- Liquidaciones: costo manual o monto RQ asociado, incluyendo RQ no pagados; adicionales salvo cancelados/rechazados.
- Rentabilidad: valor persistido `liquidaciones.costo_real`.
- Centro de Costos: RQ pagados + Caja Chica aprobada.
- Dashboard Financiero mensual: solo RQ pagados.

Riesgo: utilidad y margen distintos entre Liquidaciones, Rentabilidad, Centro de Costos y Dashboard.

### FIN-008 - Posible doble conteo RQ/Caja Chica

Caja Chica tiene `rq_id`. CxP suma RQ + Caja Chica; Centro de Costos suma RQ pagados + Caja Chica aprobada; Caja estimada resta RQ pagados y además incorpora caja neta aprobada.

Riesgo: si Caja Chica es el medio de pago del mismo RQ, la misma salida puede contarse dos veces.

No se puede afirmar duplicación para todos los registros: requiere revisar uso real de `rq_id`.

### FIN-009 - CxP no coincide entre página y Dashboard Financiero

- Página CxP: Caja Chica pendiente y aprobada.
- Dashboard: solo Caja Chica pendiente.
- Aging CxP del Dashboard: RQ + Gastos Oficina, sin Caja Chica.

Riesgo: total CxP, detalle y aging no reconcilian.

### FIN-010 - Flujo de Caja y Flujo Ejecutivo cubren fuentes distintas

- Flujo de Caja: facturas y RQ.
- Flujo Ejecutivo: facturas, RQ, Gastos Oficina y cuotas.
- Dashboard Financiero mensual: facturas, RQ y Gastos Oficina; no cuotas en histórico mensual.

Riesgo: neto mensual distinto con nombres similares.

### FIN-011 - Fechas de RQ no son uniformes

- Flujo de Caja real: `updated_at || created_at`.
- Flujo Ejecutivo real: `fecha_pago || updated_at`.
- Flujo de Caja proyectado: `created_at`.
- Flujo Ejecutivo proyectado: `fecha_pago || created_at`.

Riesgo: un mismo RQ cae en meses distintos.

### FIN-012 - Margen promedio tiene dos métodos

- Dashboard general/financiero: promedio simple de `margen_real_pct`.
- Centro de Costos: promedio simple de margen recalculado por proyecto.
- Rentabilidad: margen ponderado global `(ingresos - costos) / ingresos`.

Riesgo: “Margen promedio” y “Margen real” no son comparables.

### FIN-013 - Liquidaciones usa costos comprometidos como reales

El costo real puede tomar `monto_solicitado` de RQ pendiente, aprobado o programado. Los adicionales excluyen solo cancelado/rechazado.

Riesgo: margen de Liquidación refleja costo comprometido, no exclusivamente pagado. Esto puede ser válido operativamente, pero debe nombrarse.

### FIN-014 - Reporte PDF incluye facturas anuladas/canceladas

El total suma todas las facturas consultadas.

Riesgo: reporte de proyecto mayor que Dashboard, Rentabilidad o Centro de Costos.

### FIN-015 - Umbrales de salud financiera varían

- Centro de Costos: verde ≥20%, amarillo ≥10%, rojo <10%.
- Liquidaciones (estado financiero): pérdida <0, crítico <10, atención <20.
- Liquidaciones (KPI de estado): rentable ≥30, riesgo ≥15, pérdida <15.
- Liquidaciones colorea margen financiero como favorable desde 15%.
- Rentabilidad colorea margen favorable desde 30%.

Riesgo: un proyecto puede ser “Saludable”, “Riesgo” o visualmente favorable según pantalla.

## Matriz de hallazgos

| ID | Módulo | Concepto | Fórmula actual | Riesgo | Recomendación | Severidad | Requiere aprobación Controller |
|---|---|---|---|---|---|---|---|
| FIN-001 | Facturación/Liquidaciones/Reporte | Facturado | Exclusiones diferentes | Totales distintos | Definir estados válidos para venta emitida | Alta | Sí |
| FIN-002 | Facturación/Liquidaciones | Cobrado | Solo `cobrada`; otros aceptan `pagada` | Cobros omitidos | Catálogo único de estados | Media | Sí |
| FIN-003 | Facturación | Pendiente | Solo `emitida` | KPI menor que CxC | Definir ciclo completo de cobranza | Media | Sí |
| FIN-004 | Todos | Facturado vs cobrado | Venta bruta vs neto abonable | Saldo aparente incorrecto | Separar venta, neto abonable y efectivo | Alta | Sí |
| FIN-005 | Importación Facturación | Monto abonable | Importado = subtotal | Facturas heterogéneas | Definir regla de importación | Alta | Sí |
| FIN-006 | RQ/CxP/Flujos | IGV de RQ | Usa monto solicitado crudo | Obligación subestimada | Definir monto contable canónico RQ | Alta | Sí |
| FIN-007 | Liquidaciones/Rentabilidad/Centro Costos | Costo real | Tres definiciones | Márgenes distintos | Distinguir comprometido, devengado y pagado | Alta | Sí |
| FIN-008 | RQ/Caja Chica | Duplicación | Suma ambas fuentes sin usar `rq_id` | Doble costo/salida | Regla de deduplicación por origen | Alta | Sí |
| FIN-009 | CxP/Dashboard | CxP | Caja aprobada incluida solo en página | No reconcilia total/aging | Definir obligación pendiente | Media | Sí |
| FIN-010 | Flujos | Neto proyectado | Fuentes distintas | Números diferentes | Nombrar alcance o unificar fuentes | Alta | Sí |
| FIN-011 | Flujos | Fecha RQ | created/updated/fecha_pago | Mes distinto | Jerarquía de fechas financiera | Media | Sí |
| FIN-012 | Dashboards/Rentabilidad | Margen promedio | Simple vs ponderado | KPI no comparable | Exponer ambos con nombre explícito | Alta | Sí |
| FIN-013 | Liquidaciones | Costo real | Incluye RQ no pagados | Confusión real/comprometido | Renombrar o separar capas | Alta | Sí |
| FIN-014 | Reporte PDF | Facturado | Incluye todos los estados | Reporte inflado | Aplicar definición aprobada | Alta | Sí |
| FIN-015 | Liquidaciones/Centro Costos | Semáforo | Umbrales diferentes | Clasificación contradictoria | Tabla única de umbrales | Media | Sí |

## F. Riesgos contables y operativos

1. **Conciliación imposible sin contexto:** facturado bruto no debe reconciliar directamente contra `monto_final_abonado`.
2. **Subestimación de CxP:** RQ “Más IGV” puede no incluir el impuesto en KPIs.
3. **Duplicación de egresos:** RQ y Caja Chica pueden representar la misma salida.
4. **Costo real ambiguo:** comprometido, devengado y pagado están mezclados.
5. **Cortes mensuales inconsistentes:** diferentes fechas de RQ cambian resultados por periodo.
6. **Reportes no reproducibles:** PDF y pantallas no usan las mismas exclusiones.
7. **Importaciones heterogéneas:** factura importada no sigue la fórmula del formulario.
8. **Margen gerencial variable:** promedio simple puede sobreponderar proyectos pequeños.
9. **Gastos de Oficina fuera de rentabilidad por proyecto:** forman parte del flujo ejecutivo, pero no del Centro de Costos.
10. **Caja Chica aprobada en CxP:** puede representar gasto ya ejecutado y no obligación pendiente.

## G. Definiciones recomendadas

Estas definiciones son propuestas para discusión, no reglas aprobadas.

### Venta

- **Venta facturada bruta:** subtotal + IGV de facturas fiscalmente válidas.
- **Venta neta de descuentos comerciales:** total factura menos pronto pago si debe tratarse como descuento.
- **Monto abonable por cliente:** total factura menos detracción y retención.
- **Efectivo cobrado:** monto realmente conciliado/abonado, no solo estado.

### Cuentas por cobrar

- Incluir facturas emitidas y exigibles.
- Excluir borradores, anuladas y canceladas.
- Separar saldo comercial, detracción por recuperar y retención fiscal.

### Costos

- **Costo presupuestado:** costo aprobado de cotización.
- **Costo comprometido:** RQ aprobado/programado.
- **Costo devengado:** servicio recibido/documentado.
- **Costo pagado:** RQ pagado y gastos pagados.
- **Costo operativo directo:** costos atribuibles al proyecto.
- **Gasto administrativo:** Gastos de Oficina no atribuibles directamente.

### Margen

- **Margen por proyecto:** `(venta base - costo base) / venta base`.
- **Margen promedio simple:** promedio de porcentajes de proyectos.
- **Margen ponderado:** `(suma ventas - suma costos) / suma ventas`.

Los dos últimos deben mostrarse con nombres distintos.

### Flujo

- **Real:** movimientos efectivamente cobrados/pagados por fecha de movimiento.
- **Proyectado:** vencimientos futuros por fecha contractual.
- No mezclar real y proyectado dentro de un KPI sin etiqueta explícita.

## H. Diccionario financiero propuesto

| Término | Definición propuesta | Fuente sugerida |
|---|---|---|
| Factura válida | Factura no anulada ni cancelada | `facturas.estado` |
| Venta facturada | `subtotal + igv` de factura válida | `facturas` |
| Monto abonable | Total menos detracción, retención y descuento aprobado | `monto_final_abonado` |
| Cobrado | Monto conciliado; temporalmente factura cobrada/pagada | `facturas` + conciliación |
| Saldo por cobrar | Monto abonable menos cobros registrados | Facturas/conciliación |
| RQ base | `monto_solicitado` | `requerimientos_pago` |
| RQ total obligación | `rqIgvDetalle.total` | RQ + tratamiento IGV |
| Costo comprometido | RQ aprobado_producción/aprobado/programado | RQ |
| Costo pagado | RQ pagado, deduplicado de caja | RQ/Caja |
| Caja Chica proyecto | Egreso aprobado sin RQ duplicado | Caja Chica |
| Gasto de oficina | Gasto administrativo pagado | Gastos Oficina |
| Costo real proyecto | Definición aprobada: devengado o pagado | Liquidación/RQ/Caja |
| Utilidad | Venta base aprobada - costo base aprobado | Fuentes anteriores |
| Margen proyecto | Utilidad / venta base | Derivado |
| Margen simple | Promedio de márgenes de proyectos | Derivado |
| Margen ponderado | Utilidad total / venta total | Derivado |
| Flujo real | Cobros - pagos por fecha efectiva | Facturas/RQ/Gastos/Deuda/Caja |
| Flujo proyectado | Cobros esperados - pagos esperados por vencimiento | CxC/CxP/Deuda |

## I. Cambios sugeridos por fase

### Fase 1 - Aprobación conceptual

1. Controller define estados canónicos.
2. Controller decide si RQ “Más IGV” se reporta con o sin IGV.
3. Definir si costo real significa comprometido, devengado o pagado.
4. Definir tratamiento de detracción, retención y pronto pago.
5. Aprobar método de margen gerencial.

### Fase 2 - Casos de reconciliación

Preparar proyectos reales representativos:

- factura normal;
- factura con detracción;
- factura con retención;
- factura con pronto pago;
- factura anulada/cancelada;
- RQ incluye IGV;
- RQ más IGV;
- RQ pagado mediante Caja Chica;
- proyecto con Gastos de Oficina;
- proyecto parcialmente facturado/cobrado.

Registrar resultado esperado por módulo.

### Fase 3 - Centralización sin cambio visual

- Estados y fórmulas en helpers compartidos.
- Función única para total de factura.
- Función única para obligación total de RQ.
- Función de deduplicación RQ/Caja.
- Jerarquía única de fechas.

### Fase 4 - Alineación de módulos

Orden sugerido:

1. Reporte PDF.
2. Facturación y CxC.
3. CxP.
4. Flujo de Caja y Flujo Ejecutivo.
5. Liquidaciones.
6. Rentabilidad y Centro de Costos.
7. Dashboards.

### Fase 5 - Controles automáticos

- Pruebas unitarias de fórmulas.
- Pruebas de reconciliación por proyecto.
- Alertas cuando el mismo RQ tenga egreso de Caja Chica asociado.
- Validación de importación de facturas.
- Comparación automática entre detalle y KPI.

## J. Validaciones manuales para Controller y Gerencia

### Estados de factura

- [ ] Confirmar si `pagada` es estado vigente o legado.
- [ ] Confirmar si `pendiente` cuenta como CxC antes de emisión.
- [ ] Confirmar diferencia entre `anulada` y `cancelada`.
- [ ] Confirmar qué estados constituyen venta fiscal emitida.

### Facturación y cobranza

- [ ] Comparar total factura con `subtotal + IGV`.
- [ ] Revisar factura con detracción.
- [ ] Revisar factura con retención.
- [ ] Revisar pronto pago como descuento o costo financiero.
- [ ] Validar importación frente a creación manual.
- [ ] Conciliar `monto_final_abonado` contra depósito real.

### RQ y CxP

- [ ] Validar RQ “Incluye IGV”.
- [ ] Validar RQ “Más IGV”.
- [ ] Validar RQ “No aplica IGV”.
- [ ] Confirmar si CxP debe incluir pendiente_aprobación.
- [ ] Confirmar si Caja Chica aprobada sigue siendo cuenta por pagar.
- [ ] Revisar RQ pagado vinculado a Caja Chica.

### Liquidaciones y costos

- [ ] Confirmar si RQ pendiente debe entrar en costo real.
- [ ] Confirmar tratamiento de costos manuales.
- [ ] Confirmar RQ adicionales.
- [ ] Comparar costo de Liquidación contra RQ pagados.
- [ ] Comparar utilidad financiera con Centro de Costos.

### Margen

- [ ] Aprobar umbrales de semáforo.
- [ ] Aprobar margen simple o ponderado para gerencia.
- [ ] Confirmar base: venta presupuestada, facturada o neta.
- [ ] Validar proyectos sin factura y parcialmente facturados.

### Flujo

- [ ] Aprobar fecha efectiva de cobro.
- [ ] Aprobar fecha efectiva de pago RQ.
- [ ] Aprobar fecha proyectada de RQ.
- [ ] Confirmar inclusión de Caja Chica, Gastos Oficina y deuda.
- [ ] Reconciliar un mes completo contra bancos.

## Evidencias principales

| Archivo | Líneas relevantes |
|---|---|
| `lib/finance.ts` | 1-4, 30-49 |
| `lib/rq-igv.ts` | 23-34 |
| `app/facturacion/page.tsx` | 98-106, 122-140, 180-188, 201 |
| `app/finanzas/cuentas-por-cobrar/page.tsx` | 24-32 |
| `app/finanzas/cuentas-por-pagar/page.tsx` | 26-41 |
| `app/finanzas/dashboard/page.tsx` | 68-86, 95-123 |
| `app/finanzas/flujo-ejecutivo/page.tsx` | 34-46 |
| `app/finanzas/rentabilidad/page.tsx` | 26-47 |
| `app/finanzas/centro-costos/page.tsx` | 129-146, 188-195 |
| `app/flujo-caja/page.tsx` | 46-110, 128-132 |
| `app/liquidaciones/page.tsx` | 147-159, 190-239, 263-273, 314-334 |
| `app/api/reporte-pdf/route.ts` | 57-67, 94-99 |
| `app/dashboard/page.tsx` | 26-28, 133-149 |
| `app/caja-chica/page.tsx` | 119-152, 268-270 |
| `app/gastos-oficina/page.tsx` | 217-219 |
| `app/rq/page.tsx` | 13-33, 145-166, 526-529 |

## Validación técnica

| Validación | Resultado |
|---|---|
| Código funcional modificado | No |
| Fórmulas modificadas | No |
| Migraciones modificadas | No |
| Permisos modificados | No |
| Documento creado | Sí |

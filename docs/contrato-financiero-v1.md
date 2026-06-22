# Contrato Financiero V1 - Izango ERP 360

Fecha: 22 de junio de 2026

Estado: Propuesta para aprobación de Controller y Gerencia General

Base documental: Auditoría Financiera Integral de Izango ERP 360

Este documento define el lenguaje financiero común propuesto para el ERP. No modifica el comportamiento actual del sistema ni sustituye la validación contable, tributaria o gerencial correspondiente.

## 1. Objetivo

Establecer una única fuente de verdad para los conceptos financieros que aparecen en Facturación, Cuentas por Cobrar, Cuentas por Pagar, Flujo de Caja, Flujo Ejecutivo, Liquidaciones, Rentabilidad, Centro de Costos, Dashboard y reportes.

El contrato busca que un mismo concepto produzca el mismo resultado, independientemente del módulo que lo consulte.

Los conceptos cubiertos son:

- Facturado.
- Cobrado.
- Pendiente por cobrar.
- Costo presupuestado.
- Costo real operativo.
- Costo financiero ejecutado.
- Utilidad.
- Margen financiero.
- Margen promedio.
- Flujo proyectado.
- Rentabilidad por proyecto.
- Rentabilidad por cliente.

### Principios rectores

1. Cada indicador debe declarar su fuente, fórmula, estados incluidos y fecha de referencia.
2. Los estados anulados, cancelados o rechazados no deben producir movimientos activos.
3. Los importes brutos de venta no deben compararse directamente con importes netos de cobranza sin identificar la diferencia.
4. Un mismo desembolso no debe contabilizarse más de una vez por aparecer en RQ, Caja Chica, Gastos de Oficina o Liquidaciones.
5. Las métricas consolidadas deben reutilizar reglas centralizadas.
6. Toda excepción manual debe conservar trazabilidad.

## 2. Definiciones propuestas

### 2.1 Facturado

**Definición:** valor bruto emitido al cliente mediante facturas válidas.

**Fórmula propuesta:**

```text
Facturado = suma(subtotal + IGV)
```

**Incluye:** facturas en estados `pendiente`, `emitida`, `pendiente_cobro`, `cobrada` y `pagada`.

**Excluye:** facturas en estados `anulada` y `cancelada`.

**Fuente principal:** `facturas`.

**Observación:** la definición usa venta con IGV. Controller/Gerencia debe decidir si los indicadores de margen usarán esta misma base o venta neta sin IGV.

### 2.2 Cobrado

**Definición:** efectivo neto reconocido como abonado por el cliente.

**Fórmula propuesta:**

```text
Cobrado = suma(monto_final_abonado)
```

**Incluye:** facturas en estados `cobrada` y `pagada`.

**Excluye:** cualquier otro estado.

**Fuente principal:** `facturas`.

**Fecha de reconocimiento:** `fecha_abono`. Si falta, el registro debe señalarse como dato incompleto y no inferirse silenciosamente desde `fecha_emision`.

**Observación:** `monto_final_abonado` puede ser menor al total facturado por detracción, retención o pronto pago.

### 2.3 Pendiente por cobrar

**Definición:** importe neto esperado de facturas todavía no cobradas.

**Fórmula propuesta:**

```text
Pendiente por cobrar = suma(monto_final_abonado)
```

**Incluye:** facturas en estados `pendiente`, `emitida` y `pendiente_cobro`.

**Excluye:** `cobrada`, `pagada`, `anulada` y `cancelada`.

**Fuente principal:** `facturas`.

**Fecha de referencia:** `fecha_vencimiento`; si no existe, usar `fecha_emision` como fallback explícito.

### 2.4 Costo presupuestado

**Definición:** costo operativo aprobado antes de la ejecución del proyecto.

**Fuente prioritaria propuesta:**

1. Costo de la cotización aprobada.
2. `liquidaciones.costo_presupuestado`, cuando la liquidación sea el consolidado vigente.

**Regla:** no sumar ambas fuentes. La liquidación debe conservar o referenciar la base aprobada utilizada.

### 2.5 Costo real operativo

**Definición:** costo final consolidado de ejecutar un proyecto, validado en su liquidación.

**Fórmula propuesta:**

```text
Costo real operativo = liquidaciones.costo_real
```

**Fuente principal:** liquidación del proyecto.

**Condición para valor definitivo:** liquidación en estado `cerrada`.

**Antes del cierre:** el importe debe identificarse como costo provisional, no como costo real final.

### 2.6 Costo financiero ejecutado

**Definición:** desembolsos financieros asociados al proyecto que ya alcanzaron un estado de ejecución reconocido.

**Fórmula propuesta:**

```text
Costo financiero ejecutado =
  RQ pagados
  + Caja Chica aprobada
  + Gastos de Oficina asociados al proyecto, cuando corresponda
  - movimientos duplicados entre fuentes
```

**Fuentes:** `requerimientos_pago`, `caja_chica` y `gastos_oficina`.

**Control obligatorio:** si un movimiento de Caja Chica referencia un RQ mediante `rq_id`, no debe sumarse nuevamente como un costo independiente.

**Observación:** este concepto representa ejecución financiera. No reemplaza el costo real operativo consolidado por Liquidaciones.

### 2.7 Utilidad

**Definición:** resultado económico del proyecto después de descontar el costo real aprobado.

**Fórmula propuesta:**

```text
Utilidad = Venta base - Costo real operativo
```

**Venta base:** debe definirse institucionalmente como venta neta sin IGV o venta total con IGV. Se recomienda venta neta sin IGV para medir desempeño operativo.

**Costo válido para cierre:** costo real de liquidación cerrada.

### 2.8 Margen financiero

**Definición:** proporción de utilidad respecto de la venta base.

**Fórmula propuesta:**

```text
Margen financiero (%) = Utilidad / Venta base * 100
```

Si `Venta base = 0`, el margen debe mostrarse como no calculable, nunca como cero automático.

### 2.9 Margen promedio

Existen dos alternativas:

- **Promedio simple:** promedio aritmético de los porcentajes de margen de cada proyecto.
- **Promedio ponderado:** utilidad total dividida entre venta base total.

**Recomendación:**

```text
Margen promedio ponderado (%) =
  suma(Utilidad) / suma(Venta base) * 100
```

El promedio ponderado por facturación representa mejor el desempeño financiero consolidado porque evita que proyectos pequeños tengan el mismo peso que proyectos de mayor venta.

### 2.10 Flujo proyectado

**Definición:** calendario esperado de entradas y salidas financieras futuras.

**Ingresos proyectados:**

```text
Facturas pendientes agrupadas por fecha_vencimiento
```

Usar `fecha_emision` únicamente como fallback cuando no exista vencimiento.

**Egresos proyectados:**

```text
RQ aprobados/programados
+ Gastos de Oficina pendientes
+ obligaciones financieras pendientes
```

Agrupar por fecha programada, fecha de pago prevista o vencimiento. La fecha de creación no debe ser la fecha principal cuando exista una fecha financiera más precisa.

### 2.11 Rentabilidad por proyecto

**Definición:** resultado financiero individual de un proyecto.

**Fórmula propuesta:**

```text
Rentabilidad del proyecto =
  Venta base del proyecto
  - Costo real operativo de su liquidación cerrada
```

Debe mostrar por separado:

- Venta facturada.
- Venta cobrada.
- Pendiente por cobrar.
- Costo real operativo.
- Costo financiero ejecutado.
- Utilidad.
- Margen financiero.
- Estado de cierre financiero.

### 2.12 Rentabilidad por cliente

**Definición:** consolidado de rentabilidad de los proyectos de un cliente dentro de un periodo.

**Fórmula propuesta:**

```text
Utilidad del cliente = suma(Utilidad de proyectos incluidos)

Margen del cliente (%) =
  suma(Utilidad de proyectos incluidos)
  / suma(Venta base de proyectos incluidos)
  * 100
```

Debe ser ponderada y considerar solo proyectos con información comparable. Los proyectos sin liquidación cerrada deben mostrarse como provisionales o excluirse del margen final, según decisión gerencial.

## 3. Estados oficiales

### 3.1 Facturas

| Estado | Significado financiero propuesto | ¿Suma facturado? | ¿Suma cobrado? | ¿Suma pendiente? |
|---|---|---:|---:|---:|
| `pendiente` | Registro pendiente de emisión o gestión | Sí | No | Sí |
| `emitida` | Factura emitida y no cobrada | Sí | No | Sí |
| `pendiente_cobro` | Factura emitida en gestión de cobranza | Sí | No | Sí |
| `cobrada` | Abono confirmado | Sí | Sí | No |
| `pagada` | Pago confirmado; equivalente operativo pendiente de aprobación | Sí | Sí | No |
| `anulada` | Documento anulado | No | No | No |
| `cancelada` | Documento cancelado sin efecto financiero activo | No | No | No |

### 3.2 Requerimientos de Pago

| Estado | Significado financiero propuesto | Tratamiento |
|---|---|---|
| `pendiente_aprobacion` | Solicitud sin aprobación final | CxP potencial |
| `aprobado_produccion` | Validación operativa | CxP proyectada |
| `aprobado` | Obligación aprobada | CxP proyectada |
| `programado` | Pago con programación | Flujo proyectado |
| `pagado` | Desembolso ejecutado | Costo financiero ejecutado |
| `cancelado` | Solicitud anulada con trazabilidad | Excluir de activos |
| `rechazado` | Solicitud no autorizada | Excluir de activos |

### 3.3 Caja Chica

| Estado | Significado financiero propuesto | Tratamiento |
|---|---|---|
| `pendiente` | Movimiento por validar | No definitivo |
| `aprobado` | Movimiento reconocido | Costo financiero ejecutado |
| `rechazado` | Movimiento descartado | Excluir |

### 3.4 Liquidaciones

| Estado | Significado financiero propuesto | Tratamiento |
|---|---|---|
| `abierta` | Consolidación en proceso | Costo y margen provisionales |
| `aprobado_produccion` | Validación operativa completada | Provisional |
| `aprobado_controller` | Validación financiera completada | Pendiente de cierre |
| `cerrada` | Resultado financiero final | Fuente oficial de costo y margen |

## 4. Reglas por módulo

### Facturación

- Debe ser la fuente principal de facturado, cobrado y pendiente por cobrar.
- Debe excluir `anulada` y `cancelada` de todos los totales activos.
- Debe distinguir total facturado de monto neto abonado.
- Debe conservar fecha de emisión, vencimiento y abono como eventos diferentes.

### Cuentas por Cobrar

- Debe consumir únicamente facturas pendientes.
- Debe calcular aging con `fecha_vencimiento`.
- Si no existe vencimiento, debe usar `fecha_emision` como fallback visible.
- No debe incluir facturas cobradas, pagadas, anuladas ni canceladas.

### Cuentas por Pagar

- Debe separar obligaciones potenciales, aprobadas, programadas y pagadas.
- Debe evitar duplicidad entre RQ y Caja Chica.
- Debe identificar si un Gasto de Oficina corresponde a proyecto o a gasto corporativo.

### Liquidaciones

- Debe ser la fuente principal del costo real operativo y del margen financiero final.
- Solo una liquidación `cerrada` debe considerarse definitiva.
- Debe conservar trazabilidad entre costo presupuestado, ajustes y costo real.

### Centro de Costos

- Debe mostrar el costo financiero ejecutado por proyecto.
- Debe mostrar por separado el costo real operativo de Liquidaciones.
- Debe advertir cuando no exista liquidación cerrada.
- No debe presentar un margen provisional como resultado financiero definitivo.

### Rentabilidad

- Debe priorizar liquidaciones cerradas.
- Debe declarar la venta base utilizada.
- Debe usar margen ponderado en consolidaciones, sujeto a aprobación.
- Debe diferenciar proyectos definitivos de proyectos provisionales.

### Flujo de Caja y Flujo Ejecutivo

- Deben usar `fecha_vencimiento` para ingresos proyectados.
- Deben usar fecha programada, vencimiento o pago previsto para egresos proyectados.
- No deben usar fecha de emisión o creación como referencia principal cuando exista una fecha financiera específica.
- Deben declarar las fuentes incluidas en cada saldo.

### Dashboard

- Debe consumir helpers financieros centralizados desde `lib/finance.ts`.
- No debe mantener listas locales divergentes de estados.
- Cada KPI debe indicar periodo y base de cálculo.
- Los totales deben ser conciliables con el módulo fuente.

### Reporte PDF

- Debe aplicar las mismas exclusiones y fórmulas que los módulos financieros.
- No debe sumar facturas anuladas o canceladas.
- Debe aplicar el tratamiento de IGV aprobado para RQ y costos.

## 5. Riesgos actuales

| ID | Riesgo | Impacto posible | Prioridad |
|---|---|---|---|
| RF-01 | Facturas anuladas o canceladas no se excluyen en todos los módulos | Sobreestimación de ventas, facturación o rentabilidad | Alta |
| RF-02 | `costo_real` tiene significados diferentes según la pantalla | Utilidad y margen distintos para el mismo proyecto | Alta |
| RF-03 | Margen promedio simple y ponderado conviven | Lecturas gerenciales no comparables | Alta |
| RF-04 | RQ y Caja Chica pueden representar el mismo desembolso | Duplicación de costos o egresos | Alta |
| RF-05 | El IGV de facturas y RQ se trata de forma distinta entre módulos | Diferencias en CxP, reportes y rentabilidad | Alta |
| RF-06 | Gastos de Oficina no siempre están relacionados con un proyecto | Asignación incompleta o arbitraria de costos | Media |
| RF-07 | Cobrado neto se compara con facturado bruto | Brechas aparentes por detracción, retención o pronto pago | Media |
| RF-08 | Fechas de creación se usan como sustituto de fechas financieras | Flujo proyectado ubicado en periodos incorrectos | Media |
| RF-09 | Proyectos sin liquidación cerrada pueden mostrar margen definitivo | Decisiones basadas en costos incompletos | Alta |
| RF-10 | Estados equivalentes se interpretan de forma local | KPIs distintos entre Dashboard y módulos fuente | Alta |

## 6. Decisiones pendientes para Controller y Gerencia

Estas decisiones deben aprobarse antes de modificar fórmulas o centralizar helpers:

- [ ] ¿El margen debe calcularse con venta sin IGV o con el total de factura?
- [ ] ¿El costo real incluye IGV o se analiza sin IGV recuperable?
- [ ] ¿Caja Chica siempre constituye costo de proyecto?
- [ ] ¿Cómo se identifica que una Caja Chica ya está representada por un RQ?
- [ ] ¿Los Gastos de Oficina se asignan a proyectos o se mantienen como gasto corporativo?
- [ ] ¿El margen promedio oficial será ponderado por facturación?
- [ ] ¿Los estados `pagada` y `cobrada` son equivalentes?
- [ ] ¿Cuándo se considera un proyecto financieramente cerrado?
- [ ] ¿Los proyectos sin liquidación cerrada participan en KPIs de rentabilidad?
- [ ] ¿El costo presupuestado oficial nace de la cotización aprobada o de la liquidación?
- [ ] ¿Qué fecha se utilizará para RQ aprobados que todavía no tienen programación?
- [ ] ¿Cómo debe tratarse el RQ marcado como “Más IGV” en CxP y costo de proyecto?

### Registro de aprobación

| Decisión | Responsable | Resolución | Fecha |
|---|---|---|---|
| Base de venta para margen | Controller / Gerencia General | Pendiente | |
| Tratamiento de IGV en costos | Controller | Pendiente | |
| Margen promedio oficial | Gerencia General | Pendiente | |
| Equivalencia `pagada` / `cobrada` | Controller | Pendiente | |
| Regla de cierre financiero | Controller / Gerencia General | Pendiente | |
| Deduplicación RQ / Caja Chica | Controller | Pendiente | |
| Asignación de Gastos de Oficina | Controller / Gerencia General | Pendiente | |

## 7. Plan de implementación

### Fase 1 - Aprobar definiciones

- Revisar este contrato con Controller y Gerencia General.
- Resolver la checklist de decisiones pendientes.
- Definir ejemplos numéricos de aceptación.
- Aprobar versión y fecha de entrada en vigencia.

### Fase 2 - Centralizar reglas

- Actualizar `lib/finance.ts`.
- Centralizar estados, exclusiones, fechas y fórmulas.
- Agregar pruebas unitarias para escenarios financieros aprobados.
- No alterar módulos hasta validar los helpers contra datos reales.

### Fase 3 - Alinear módulos

Aplicar las definiciones aprobadas, en este orden:

1. Facturación.
2. Cuentas por Cobrar.
3. Flujo Ejecutivo.
4. Flujo de Caja.
5. Liquidaciones.
6. Centro de Costos.
7. Rentabilidad.
8. Dashboard.
9. Reporte PDF.

Cada módulo debe mostrar el mismo resultado para una misma fuente, periodo y conjunto de estados.

### Fase 4 - Validar con tres proyectos reales

Seleccionar:

- Un proyecto cerrado y totalmente cobrado.
- Un proyecto activo con facturas pendientes.
- Un proyecto con RQ, Caja Chica, Gastos de Oficina y liquidación.

Para cada proyecto, conciliar manualmente:

- Facturado.
- Cobrado.
- Pendiente.
- Costos presupuestados.
- Costos ejecutados.
- Costo real operativo.
- Utilidad.
- Margen.
- Flujo realizado y proyectado.

### Fase 5 - Congelar reglas para IA futura

- Versionar el contrato financiero aprobado.
- Exponer las definiciones como contexto obligatorio para automatizaciones e IA.
- Prohibir que asistentes o módulos creen fórmulas financieras fuera de los helpers oficiales.
- Registrar cambios posteriores mediante una nueva versión del contrato.

## 8. Criterios de aceptación del contrato

El Contrato Financiero V1 estará aprobado cuando:

- [ ] Todas las decisiones de la sección 6 tengan resolución.
- [ ] Controller confirme estados y tratamiento de IGV.
- [ ] Gerencia General confirme venta base y margen promedio.
- [ ] Los tres proyectos reales hayan sido conciliados.
- [ ] Exista una definición inequívoca de cierre financiero.
- [ ] Se apruebe el plan de implementación técnica.

## 9. Control de cambios

| Versión | Estado | Descripción |
|---|---|---|
| V1 propuesta | Pendiente de aprobación | Primera definición unificada basada en la auditoría financiera integral |

## 10. Alcance de esta entrega

| Validación | Resultado |
|---|---|
| Código funcional modificado | No |
| Fórmulas del sistema modificadas | No |
| Migraciones modificadas | No |
| Permisos modificados | No |
| Documento creado | Sí |

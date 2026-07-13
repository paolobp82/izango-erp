# IZANGO 360 – Domain Model V2

## Regla base

Izango 360 debe evolucionar como ERP por dominios, no como pantallas aisladas.

Antes de modificar cualquier módulo:

1. Revisar GitHub: `paolobp82/izango-erp`
2. Revisar `lib/core`
3. Revisar dependencias del módulo
4. Entregar cambios solo en PowerShell
5. Ejecutar build:
   `npm run build -- --webpack`
6. Hacer commits pequeños y descriptivos

---

## Dominios principales

### Comercial
- CRM
- Clientes
- Presupuestos
- Proyectos

### Operaciones
- Producción
- Audiovisual
- Logística
- Inventario
- RQP

### Finanzas
- Dashboard Financiero
- Tesorería
- Cuentas por Pagar
- Cuentas por Cobrar
- Rentabilidad
- Administración
- Caja Chica
- Obligaciones Financieras

### RRHH
- Trabajadores
- Planilla
- Permisos
- Vacaciones
- Faltas médicas
- Horas extras

---

## RQP

RQP significa:

**Requerimiento de Pago de Proyecto**

Es el origen operativo de pagos relacionados a proyectos.

Campos financieros base:

- `condicion_comercial`
- `medio_pago`
- `fecha_necesidad_pago`
- `fecha_programada_pago`
- `fecha_pago`
- `estado_documentario`

### Condición comercial

- Contado
- Crédito
- Adelanto

### Medio de pago

- Transferencia
- Efectivo

---

## Tesorería

Tesorería será el centro operativo del Controller.

Debe tener:

- Bandeja de Pagos
- Programación
- Pagos Ejecutados
- Transferencias
- Flujo Ejecutivo
- Historial de Caja

Tesorería no duplica documentos. Consume orígenes.

Orígenes de Cuentas por Pagar:

- RQP
- Administración
- Caja Chica
- Obligaciones Financieras

---

## Administración

El módulo actual `Gastos de Oficina` evolucionará conceptualmente a **Administración**.

Será responsable de pagos administrativos:

- Internet
- Alquiler
- Limpieza
- Licencias
- Servicios
- Tributos
- Seguros
- RRHH

---

## Caja Chica

Caja Chica se mantiene como módulo independiente.

No debe desaparecer ni fusionarse con RQP o Administración.

Debe alimentar Tesorería como origen independiente.

---

## Obligaciones Financieras

Nuevo módulo para:

- Préstamos
- Leasing
- Tarjetas
- Intereses
- Cronogramas
- Deuda financiera

---

## Documentos Tributarios

Todo pago debe poder asociarse a un comprobante.

Datos mínimos:

- Tipo de comprobante
- Serie
- Número
- RUC
- Razón Social
- Dirección
- Fecha de emisión
- Fecha de vencimiento
- Moneda
- Valor venta
- IGV
- Total
- Detracción
- Retención
- Detalle
- PDF
- XML
- CDR

---

## Roadmap técnico

### Sprint 2 – Refactor RQP

Objetivo: reducir `app/rq/page.tsx`.

Estructura propuesta:

app/rq/
- page.tsx
- components/
- hooks/
- services/
- types.ts

No cambiar comportamiento. Solo extraer responsabilidades.

### Sprint 3 – Motor financiero

Crear:

lib/domain/finance/

Mover fuera de UI:

- cálculo de estado de pago
- fechas financieras
- estado documentario
- validaciones financieras

### Sprint 4 – Tesorería

Crear:

app/finanzas/tesoreria/

Primera vista:

- Bandeja de Pagos

### Sprint 5 – Administración

Evolucionar `Gastos de Oficina`.

### Sprint 6 – Caja Chica integrada

Caja Chica alimenta Tesorería.

### Sprint 7 – Obligaciones Financieras

Nuevo módulo.

### Sprint 8 – Dashboard Financiero

Replicar Excel de Finanzas.

### Sprint 9 – Documentos Tributarios

Crear dominio tributario reutilizable.

# Matriz de Migración UX/UI V2

Este documento clasifica las rutas del **Izango SIG** y define el programa estratégico de migración visual agrupado en olas, lotes y fases controladas.

---

## FASE 7 — CERRADA

### 7.1 Piloto Proveedores
* **Ruta**: `/proveedores`
* **Módulo**: Comercial
* **Arquetipo**: Listado estándar
* **Estado**: CERRADO
* **Template**: `V2ListPageTemplate`
* **Archivo Principal**: `app/proveedores/page.tsx`
* **Riesgo**: BAJO

### 7.2 Piloto Admin / Usuarios
* **Ruta**: `/admin/usuarios`
* **Módulo**: Cuenta
* **Arquetipo**: Listado estándar
* **Estado**: CERRADO
* **Template**: `V2ListPageTemplate`
* **Archivo Principal**: `app/admin/usuarios/page.tsx`
* **Riesgo**: BAJO

### 7.3 Congelamiento
* **Ruta**: `docs/design/UX_UI_FREEZE_V2.md`
* **Módulo**: Documental / Baseline
* **Arquetipo**: Documentación de gobernanza
* **Estado**: CONGELADO
* **Template**: No aplica
* **Archivo Principal**: `docs/design/UX_UI_FREEZE_V2.md`
* **Riesgo**: BAJO
* **Observaciones**: Cierre formal de Fase 7 y congelamiento de componentes.

### Biblioteca (Ajuste de convergencia de Fase 7)
* **Ruta**: `/biblioteca`
* **Módulo**: Comercial
* **Arquetipo**: Listado estándar
* **Estado**: CERRADO
* **Template**: `V2ListPageTemplate`
* **Archivo Principal**: `app/biblioteca/page.tsx`
* **Riesgo**: BAJO
* **Observaciones**: Módulo piloto complementario cerrado antes del freeze.

---

## FASE 8 — PENDIENTE

### 8.1 Listados Operativos
* **`/buscar-items`** | Comercial | Listado estándar | PENDIENTE | `app/buscar-items/page.tsx` | BAJO
* **`/inventario`** | Operación | Listado estándar | PENDIENTE | `app/inventario/page.tsx` | BAJO
* **`/inventario/ordenes`** | Operación | Listado estándar | PENDIENTE | `app/inventario/ordenes/page.tsx` | BAJO
* **`/inventario/ubicaciones`** | Operación | Listado estándar | PENDIENTE | `app/inventario/ubicaciones/page.tsx` | BAJO
* **`/logistica/mi-trabajo`** | Logística | Listado estándar | PENDIENTE | `app/logistica/mi-trabajo/page.tsx` | MEDIA
* **`/logistica/traslados`** | Logística | Listado estándar | PENDIENTE | `app/logistica/traslados/page.tsx` | MEDIA
* **`/alertas`** | Inicio | Listado estándar | PENDIENTE | `app/alertas/page.tsx` | BAJO
* **`/envios-materiales`** | Inicio | Listado estándar | PENDIENTE | `app/envios-materiales/page.tsx` | BAJO

### 8.2 Listados Financieros
* **`/caja-chica`** | Finanzas | Listado estándar | PENDIENTE | `app/caja-chica/page.tsx` | MEDIA
* **`/rq`** | Finanzas | Listado estándar | PENDIENTE | `app/rq/page.tsx` | ALTO
* **`/liquidaciones`** | Finanzas | Listado estándar | PENDIENTE | `app/liquidaciones/page.tsx` | MEDIA
* **`/facturacion`** | Finanzas | Listado estándar | PENDIENTE | `app/facturacion/page.tsx` | MEDIA
* **`/centro-costos`** | Finanzas | Listado estándar | PENDIENTE | `app/centro-costos/page.tsx` | BAJO
* **`/rrhh/planilla`** | RRHH | Listado estándar | PENDIENTE | `app/rrhh/planilla/page.tsx` | ALTO
* **`/rrhh/horas-extras`** | RRHH | Listado estándar | PENDIENTE | `app/rrhh/horas-extras/page.tsx` | MEDIA
* **`/rrhh/permisos`** | RRHH | Listado estándar | PENDIENTE | `app/rrhh/permisos/page.tsx` | BAJO
* **`/rrhh/faltas-medicas`** | RRHH | Listado estándar | PENDIENTE | `app/rrhh/faltas-medicas/page.tsx` | BAJO

### 8.3 Detalles
* **`/clientes/[id]`** | Comercial | Detalle / Ficha | PENDIENTE | `app/clientes/[id]/page.tsx` | MEDIA | `V2DetailPageTemplate`
* **`/biblioteca-medios`** | Comercial | Detalle / Ficha | PENDIENTE | `app/biblioteca-medios/page.tsx` | MEDIA | `V2DetailPageTemplate`
* **`/ia`** | Cuenta | Detalle / Ficha | PENDIENTE | `app/ia/page.tsx` | BAJO | `V2DetailPageTemplate`
* **`/proyectos/[id]`** | Operación | Detalle (360) | PENDIENTE | `app/proyectos/[id]/page.tsx` | ALTO | `V2DetailPageTemplate`

### 8.4 Formularios
* **`/clientes/nuevo`** | Comercial | Formulario | PENDIENTE | `app/clientes/nuevo/page.tsx` | MEDIA | `V2FormPageTemplate`
* **`/proyectos/nuevo`** | Operación | Formulario | PENDIENTE | `app/proyectos/nuevo/page.tsx` | MEDIA | `V2FormPageTemplate`

### 8.5 Dashboards
* **`/dashboard`** | Inicio | Dashboard | PENDIENTE | `app/dashboard/page.tsx` | ALTO | `V2DashboardPageTemplate`
* **`/reporteria`** | Inicio | Dashboard | PENDIENTE | `app/reporteria/page.tsx` | ALTO | `V2DashboardPageTemplate`
* **`/gestor`** | Operación | Dashboard | PENDIENTE | `app/gestor/page.tsx` | MEDIA | `V2DashboardPageTemplate`

---

## FASE 9 — PENDIENTE

### 9.1 Auditoría
* **Objetivo**: Verificación del cumplimiento del contrato visual en todas las rutas migradas.
* **Estado**: PENDIENTE

### 9.2 Bloqueos
* **Objetivo**: Resolución de loops de recarga, RLS e inconsistencias en Dark Mode.
* **Estado**: PENDIENTE

### 9.3 Cierre
* **Objetivo**: Merge a main, congelamiento final del repositorio y entrega.
* **Estado**: PENDIENTE

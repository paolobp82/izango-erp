# Auditoría Funcional del Módulo CRM y Plan de Migración V2

Este documento recopila el análisis de la arquitectura técnica y funcional del módulo CRM para guiar su migración visual al SIG Design Language V2.

---

## 1. Arquitectura Encontrada y Ruta del Módulo
* **Ruta de la vista**: `app/crm/page.tsx`
* **Definiciones y lógica de negocio**:
  - `lib/core/business-rules/crm.ts` (Motor de reglas comerciales)
  - `lib/core/lifecycle/crm.ts` (Ciclo de vida y transiciones)
  - `lib/core/configuration/crm.ts` (Estados, orígenes e industrias visuales)
* **Permisos**:
  - `lib/permisos/` (Funciones `puedeVerModulo`, `puedeEjecutarAccion` y `filtrarPorAlcance`)

---

## 2. Mapa Funcional del Módulo

### 2.1. Estados del Pipeline (Kanban)
El pipeline del CRM maneja 7 estados oficiales provistos por `getCRMEstadosPipeline()`:
1. `nuevo` (Lead ingresado)
2. `contactado` (Contacto establecido)
3. `reunion` (Reunión agendada)
4. `propuesta` (Propuesta enviada)
5. `negociacion` (En negociación)
6. `ganado` (Negocio cerrado con éxito)
7. `perdido` (Oportunidad descartada)

### 2.2. KPIs Existentes y Cálculos
El resumen métrico calcula:
* **Pipeline Comercial**: Suma de presupuestos estimados de todos los leads que no están en estado `ganado` ni `perdido`.
* **Cierre Esperado**: Sumatoria ponderada de `presupuesto_estimado * (probabilidad_cierre / 100)` de todos los leads activos.
* **Propuestas Abiertas**: Cantidad de leads en estados `propuesta` o `negociacion` y la suma de sus presupuestos.
* **Negocios Ganados**: Suma de los presupuestos estimados de los leads en estado `ganado`.
* **Tasa de Conversión**: Porcentaje de leads en estado `ganado` sobre el total de leads del período.

### 2.3. Filtros y Búsqueda
* **Búsqueda global**: Filtra filas por texto normalizado en Razón Social, RUC, contacto, correo, teléfono, dirección, código/nombre del proyecto asociado y referencia de cotización externa.
* **Filtros por select**:
  - Período Pipeline (`filtroPeriodo`): Por defecto el periodo actual ("YYYY-MM"), o un periodo histórico específico, o "todos".
  - Estado del Lead (`filtroEstado`).
  - Temperatura del Lead (`filtroTemp`): `caliente`, `templado`, `frio`.

### 2.4. Drawer y Seguimiento
* Un panel lateral (`Drawer`) muestra el detalle completo del lead seleccionado, permitiendo realizar transiciones manuales de estado, ver y navegar a entidades vinculadas (Proyecto, Cotización, Facturas, Clientes) y agregar notas rápidas en la tabla `crm_notas`.

---

## 3. Tablas y Operaciones de Base de Datos (Supabase)

### 3.1. Tablas Reales y Columnas
* **`crm_leads`**:
  - `id` (uuid, PK)
  - `razon_social` (text, obligatorio)
  - `ruc` (text)
  - `nombre_contacto` / `contacto_nombre` (text)
  - `email_contacto` (text)
  - `telefono_contacto` (text)
  - `direccion` (text)
  - `cargo_contacto` (text)
  - `origen` (text)
  - `estado` (text)
  - `temperatura` (text)
  - `industria` (text)
  - `presupuesto_estimado` (numeric)
  - `probabilidad_cierre` (integer)
  - `fecha_proxima_accion` / `fecha_proximo_contacto` (date)
  - `responsable_id` (uuid)
  - `cliente_id` (uuid, FK)
  - `proyecto_id` (uuid, FK)
  - `periodo_pipeline` (text)
  - `referencias_cotizacion` (text)
  - `archivado` (boolean)
  - `notas` (text)
  - `entidad` (text, por defecto "peru")
* **`crm_notas`**:
  - `id` (uuid, PK)
  - `lead_id` (uuid, FK)
  - `contenido` (text)
  - `created_by` (uuid)
  - `created_at` (timestamptz)

---

## 4. Riesgos de Regresión y Elementos que NO deben tocarse
* **Lógica del motor de reglas (`businessRuleEngine`)**: No se debe desactivar ni eludir ninguna regla para la creación, edición o eliminación de leads.
* **Transiciones de ciclo de vida (`lifecycleEngine`)**: El cambio de estado debe respetar estrictamente la restricción de transiciones permitidas.
* **Sincronización de Leads**: Al asociar un proyecto, se invoca `sincronizarLeadPorProyecto` en la base de datos Supabase; este comportamiento asíncrono debe preservarse intacto.
* **Creación automática de Clientes**: Al pasar a "ganado", si no tiene `cliente_id`, llama a `buscarOCrearCliente` para crear el registro en la tabla `clientes` antes de asociar el lead. Esta lógica funcional debe mantenerse idéntica.
* **Import/Export**: El componente `<ImportExport>` maneja internamente parseo CSV y mutaciones por lotes validando reglas por cada fila. Debe continuar integrándose al flujo visual sin alterar sus parámetros funcionales.

---

## 5. Equivalencias de Componentes V1 ➔ V2

| Componente V1 | Equivalencia V2 | Justificación |
|---|---|---|
| `MasterPage` | `V2PageHeader` + `V2AppShell` | El envoltorio de la cabecera ejecutivo y barra del shell. |
| `ExecutiveSummary` | `V2KpiCard` / `V2MetricCard` | KPIs semánticos rediseñados e interactivos. |
| `FiltersBar` | `V2Toolbar` + `V2Input` + `V2Select` | Barra de controles unificada. |
| `StatusBadge` | `V2StatusBadge` / `V2Badge` | Píldoras de estado y de temperatura del lead. |
| `Drawer` | `V2Drawer` | Panel deslizable con overlays que responden a teclado y Escape. |
| `EmptyState` | `V2EmptyState` | Contenedores para columnas Kanban vacías. |

---

## 6. Propuesta de Migración Visual
Se utilizará la plantilla estructural de alto nivel **`V2KanbanPageTemplate`** de la V2. El layout Kanban de 7 columnas se renderizará de forma horizontal responsiva con scroll interno para evitar deformar el shell general, inyectando el buscador, periodos, estados y temperaturas dentro de la prop `toolbar`. El formulario de edición/creación se maquetará utilizando overlays o el cajón de acuerdo al diseño establecido.

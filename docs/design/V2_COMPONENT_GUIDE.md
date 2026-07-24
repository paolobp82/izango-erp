# Guía de Componentes y Patrones V2 (IZANGO SIG V2)

Esta guía documenta la infraestructura visual del **SIG Design Language V2** (Release Candidate 1), el patrón de arquitectura implementado en el módulo **CRM V2** y los criterios de reutilización para la migración del módulo **Clientes V2**.

---

## Regla Visual Global de Contenedores V2 (Borderless Design System)

> **Criterio Estándar de Diseño V2**: Los contenedores principales no utilizan bordes exteriores visibles. La separación se resuelve con superficie, espacio y sombra sutil. Solo se mantienen bordes funcionales o divisores internos.
>
> * **KPI Cards (`V2KpiCard`)**: Sin marco ni filo exterior.
> * **Barra de Filtros (`V2FilterBar`)**: Sin recuadro ni contorno.
> * **Contenedor de Tabla (`V2DataTable` / `.tableShell`)**: Sin caja exterior, manteniendo solo las líneas horizontales internas entre filas.
> * **Encabezado de Página (`V2PageHeader`)**: Sin línea inferior decorativa ni separador con borde visible.
> * **Paneles y Secciones (`V2SectionCard`, `.card`)**: Separación visual basada en contraste de superficie, relleno y box-shadow sutil.

---

## 1. Catálogo de Componentes V2 Reutilizables

### A. V2KpiCard (Métricas y KPIs)
Ubicación: [V2KpiCard.tsx](file:///C:/Users/user/Desktop/izango-erp/components/v2/system/V2KpiCard.tsx)
* **Propósito**: Muestra indicadores métricos clave de forma uniforme en la sección superior de los módulos.
* **Propiedades**:
  * `title: string` (Etiqueta o descripción de la métrica)
  * `value: string | number` (Monto o cantidad)
  * `icon?: ReactNode` (Ícono de Lucide, e.g., Wallet, FileText, etc.)
  * `trend?: { value: number; label: string; isPositive: boolean }` (Variación y porcentaje)
  * `badge?: { text: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }` (Badge de estado)
  * `density?: "compact" | "normal"` (Por defecto `"normal"`. La variante `"compact"` reduce la altura mínima a 56px, ideal para grillas de 6 metrics).

### B. Barra de Filtros y Búsqueda (V2FilterBar)
Ubicación: [V2FilterBar.tsx](file:///C:/Users/user/Desktop/izango-erp/components/v2/filters/V2FilterBar.tsx)
* **Propósito**: Encapsula el campo de búsqueda rápida, el botón para abrir filtros avanzados y los selectores rápidos en una sola línea horizontal de 32px de altura.
* **Propiedades**:
  * `searchValue: string`
  * `onSearchChange: (value: string) => void`
  * `activeFiltersCount: number`
  * `onToggleDrawer: () => void`
  * `quickFilters?: ReactNode` (Selectores rápidos compactos envueltos en clases flex proporcionales)
  * `showClearButton?: boolean`
  * `onClearFilters?: () => void`

### C. Cajón de Filtros Avanzados (V2FilterDrawer)
Ubicación: [V2FilterDrawer.tsx](file:///C:/Users/user/Desktop/izango-erp/components/v2/filters/V2FilterDrawer.tsx)
* **Propósito**: Drawer lateral deslizable de 420px de ancho para configurar filtros complejos que requieren aplicar/descartar estado.
* **Propiedades**:
  * `isOpen: boolean`
  * `onClose: () => void`
  * `onApply: () => void`
  * `onClear: () => void`
  * `children: ReactNode` (Contenido de selectores y campos `V2FormField`)

### D. Chips de Filtros Activos (V2ActiveFilterChip)
Ubicación: [V2ActiveFilterChip.tsx](file:///C:/Users/user/Desktop/izango-erp/components/v2/filters/V2ActiveFilterChip.tsx)
* **Propósito**: Muestra visualmente las condiciones de filtrado activas arriba de las tablas o tableros con opción de eliminar el filtro individualmente.
* **Propiedades**:
  * `label: string` (Categoría del filtro, e.g., "Estado")
  * `valueLabel: string` (Valor seleccionado, e.g., "Ganado")
  * `onRemove: () => void`

### E. Importador y Exportador V2 (ImportExport)
Ubicación: [ImportExport.tsx](file:///C:/Users/user/Desktop/izango-erp/components/ImportExport.tsx)
* **Propósito**: Importa y exporta CSV/Excel con estilos compatibles V2.
* **Propiedades**:
  * `variant="v2"`: Inyecta estilos oscuros e interactivos con una altura estandarizada de 32px para alineación perfecta.

---

## 2. Criterios de Clasificación y Diseño

Para mantener el sistema mantenible y escalable, se definen dos categorías de componentes:

### Criterio A: Componentes Genéricos (Reutilizables en todo el ERP)
* **Regla**: Todo elemento visual atómico o contenedor común debe estar centralizado en `components/v2/system/` o `components/v2/filters/`.
* **Ejemplos**: `V2Button`, `V2Input`, `V2Select`, `V2DataTable`, `V2FilterBar`, `V2PageHeader`.
* **Prohibido**: Modificar props o estilos base de estos componentes sin realizar análisis cruzado de impacto transversal.

### Criterio B: Componentes Específicos (Acoplados a un Dominio o Módulo)
* **Regla**: Si un componente procesa lógica exclusiva de negocio, contiene datos particulares de un objeto de dominio (como CRM o Proyectos) o requiere renderizar variantes locales, debe guardarse en la carpeta local del módulo (`app/[modulo]/components/`).
* **Ejemplos**: `CRMLeadCard` (Kanban card), `CRMFilterSection` (Coorindador de filtros rápidos).

---

## 1.1 Componentes de Proyectos V2 (`components/v2/projects/`)

Añadidos durante la reconexión del detalle de Proyecto con la capa madre. Son presentacionales: la lógica de negocio, permisos y mutaciones Supabase permanecen en `app/proyectos/[id]/page.tsx`, que las pasa via props/callbacks.

* **`ProjectDetailShellV2` / `ProjectDetailHeaderV2` / `ProjectDetailTabsV2` / `ProjectDetailContentV2`**: Shell del detalle (Lote 1), envuelve `V2DetailPageTemplate`.
* **`ProjectActionToolbarV2`**: Clasifica la botonera de "Acciones del proyecto" en `primary` (un único CTA, `V2Button variant="primary"`) y `secondary[]`, evitando que el CTA principal compita visualmente con el resto.
* **`ProjectWorkflowCardV2`**: Presenta el stepper de 10 estados (`FLUJO`) y la "siguiente acción disponible". Recibe los pasos ya resueltos (color, completado, clickable) y los callbacks (`primaryAction`, `secondaryAction`, `dangerAction`) — nunca calcula permisos ni ejecuta mutaciones por sí mismo. Preserva la paleta semántica de `FLUJO`, no la sustituye por `--v2-primary`.
* **`ProjectInfoCardV2`**: Tarjeta genérica de hechos label/value sobre `V2SectionCard`. Reutilizada para "Datos base del proyecto" e "Información económica" en Resumen; candidata para la ficha rápida de Cliente en un lote posterior.

**Deliberadamente NO creados** (para no duplicar primitives ya existentes en `components/v2/system`, ver Criterio A): `ProjectAlertsCardV2` (se usa `V2AlertCard` directamente), `ProjectActivityCardV2` (se usa `V2ActivityTimeline`), `ProjectSummaryGridV2` (grid de composición pura, resuelta como clase CSS `.summaryGrid` en `ProjectDetailV2.module.css`, no amerita un componente).

`ProjectDetailV2.module.css` contiene únicamente composición (grid, spacing, layout) — cero colores de botón, texto global, radios o sombras redefinidos; todo eso se lee de `var(--v2-...)`.

---

## 3. Patrón CRM V2 y su Aplicación en Clientes V2

### Patrón CRM Aplicado
1. **Layout**: Se utiliza `V2AppShell` y `V2PageHeader` para la estructura y el título de la cabecera.
2. **KPIs**: Grilla de KPI cards con `density="compact"` para albergar métricas en desktop de forma limpia.
3. **Filtros**:
   * Barra de filtros (`V2FilterBar`) que recibe selectores rápidos envueltos en clases flex (`responsableWrapper`, `clienteWrapper`, `estadoWrapper`).
   * Drawer deslizable (`V2FilterDrawer`) para búsquedas detalladas (e.g. rango de montos).
   * Contenedor de chips activos (`V2ActiveFilterChip`) para retroalimentación instantánea de remoción de filtros.
4. **Separación de Responsabilidades**:
   * `page.tsx`: Coordinador limpio de estado de Supabase.
   * `components/`: Fichas, Kanban board y sección de filtros aislados.

### Cómo Reutilizar el Patrón en Clientes V2
Para el módulo **Clientes**, el patrón es directo pero adaptado a una estructura de listado tabular:
1. **Layout**: Consumir `V2ListPageTemplate` en `app/clientes/page.tsx`.
2. **KPIs**: Utilizar `V2KpiCard` normal o compacta en la cabecera.
3. **Filtros**:
   * Implementar `V2FilterBar` con búsqueda rápida y un selector rápido de "Estado" (Activo / Inactivo) envuelto en un wrapper compacto.
   * Si es necesario, `V2FilterDrawer` para filtros avanzados como "RUC", "Banco" o "Tipo de pago".
4. **Formularios**:
   * Utilizar `V2FullFormTemplate` en `app/clientes/nuevo/page.tsx` y `app/clientes/[id]/page.tsx` estructurando las secciones dentro de `V2SectionCard` con `V2FormField`, `V2Input` y `V2Select` para lograr consistencia de bordes y enfoque visual.

---

## 4. Ejemplos de Implementación de Referencia (Listado + Formulario)

A continuación se muestran ejemplos reales de código del patrón implementado en **Clientes V2** para servir de guía a futuros agentes.

### A. Estructura de Listado con `V2ListPageTemplate` y `V2DataTable`
Ubicado en [page.tsx](file:///C:/Users/user/Desktop/izango-erp/app/clientes/page.tsx):
```tsx
import { V2ListPageTemplate } from "@/components/v2/templates"
import { V2PageHeader, V2KpiCard, V2DataTable, V2Pagination } from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

export default function ClientesPage() {
  // ... estados y carga ...
  
  const columns: V2TableColumn<Cliente>[] = [
    {
      key: "razon_social",
      header: "Razón social",
      render: (cliente) => <strong>{cliente.razon_social || "—"}</strong>,
    },
    { key: "ruc", header: "RUC", render: (cliente) => <span className="iz-mono">{cliente.ruc || "—"}</span> },
    // ...
  ]

  return (
    <V2ListPageTemplate
      header={
        <V2PageHeader
          title="Clientes"
          description={`${clientes.length} registrados`}
          actions={[{ label: "+ Nuevo cliente", href: "/clientes/nuevo" }]}
        />
      }
      summary={
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <V2KpiCard title="Total clientes" value={clientes.length} density="compact" />
          <V2KpiCard title="Activos" value={activos} density="compact" />
          <V2KpiCard title="Inactivos" value={inactivos} density="compact" />
        </div>
      }
      toolbar={
        <V2FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          quickFilters={/* selectores de estado y proveedor */}
        />
      }
      table={
        <>
          <V2DataTable
            columns={columns}
            rows={paginados}
            getRowKey={(c) => c.id}
          />
          <V2Pagination
            currentPage={pagina}
            totalPages={totalPaginas}
            onPageChange={setPagina}
          />
        </>
      }
    />
  )
}
```

### B. Formulario de Secciones con `V2FullFormTemplate`
Ubicado en [page.tsx](file:///C:/Users/user/Desktop/izango-erp/app/clientes/[id]/page.tsx):
```tsx
import { V2FullFormTemplate } from "@/components/v2/templates"
import { V2SectionCard, V2FormField, V2Input, V2Select, V2Button } from "@/components/v2/system"

export default function EditarClientePage() {
  // ...

  return (
    <V2AppShell>
      <V2FullFormTemplate
        header={
          <V2PageHeader
            title={form.razon_social}
            eyebrow="Clientes / Editar cliente"
          />
        }
        actions={
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <V2Button variant="secondary" onClick={cancelar}>Cancelar</V2Button>
            <V2Button onClick={guardar} loading={saving}>Guardar cambios</V2Button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <V2SectionCard title="Datos de la empresa">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <V2FormField label="Razón Social *">
                <V2Input value={form.razon_social} onChange={...} />
              </V2FormField>
              
              <V2FormField label="RUC">
                <V2Input value={form.ruc} onChange={...} />
              </V2FormField>
            </div>
          </V2SectionCard>
          
          {/* Otras secciones (Cuentas, Contactos) */}
        </div>
      </V2FullFormTemplate>
    </V2AppShell>
  )
}
```

---

## 5. Hardening Transversal V2 (Sprint 3)

### 5.1 `V2QuickActions` — API `layout` semántica

Antes de este sprint, pantallas distintas escribían `grid-template-columns` a mano (`minmax(...)`, `repeat(auto-fit, ...)`) cada vez que `cols` (columnas iguales) no encajaba. Ahora `V2QuickActions` acepta `layout?: "equal" | "auto" | "weighted"`:

* `"equal"` (default): `cols` columnas de igual ancho. Uso: toolbars donde todas las acciones pesan igual.
* `"auto"`: cada acción ocupa solo el ancho de su propio contenido — usado en "Acciones rápidas" de Resumen (1-3 botones cortos en una card ancha; forzar columnas iguales dejaba espacio vacío flotando).
* `"weighted"`: columnas con `min-width` creciente, más peso hacia el final — usado en "Acciones del cliente" (4 acciones, la última es el CTA primario con texto más largo).

`cols` y `columnTemplate` (escape hatch de plantilla literal) se mantienen — `layout` es azúcar sobre el mismo mecanismo (`--v2-quick-template`), no lo reemplaza. No se agregó `"compact"` (mencionado como candidato) porque no hay hoy un consumidor real que lo necesite distinto de `"auto"`.

### 5.2 `ProjectInfoCardV2` — API `columns`/`density`

`columns?: number` fija el número de columnas de escritorio vía una custom property (`--v2-info-cols`), sin afectar el `auto-fit` por defecto que usa Resumen. `density?: "default" | "compact"` (usado por Cliente) amplía el `gap` para paneles de columnas fijas con valores largos — Resumen sigue sin pasar ninguna de las dos props y no cambia.

### 5.3 Duplicación confirmada: dos `V2FilterBar` distintos (no resuelta este sprint)

Existen **dos componentes con el mismo nombre exportado `V2FilterBar`**, con APIs completamente distintas:
* `components/v2/filters/V2FilterBar.tsx` (`searchValue`, `onSearchChange`, `quickFilters`, `onToggleDrawer`...) — el realmente usado: 14+ pantallas lo importan desde `@/components/v2/filters` (Proveedores, Clientes, Proyectos, RQ-adyacentes, RRHH, etc.).
* `components/v2/system/V2FilterBar.tsx` (`children`/`primary`, `actions`/`secondary`, `activeCount`) — exportado también desde `@/components/v2/system`, con el alias `V2Toolbar`. Ningún consumidor real lo importa como `V2FilterBar`; sí se usa vía su alias `V2Toolbar` (Dashboard, `/admin/ui-v2-shell`).

Riesgo: cualquiera que escriba `import { V2FilterBar } from "@/components/v2/system"` obtiene silenciosamente el componente equivocado (TS lo detectaría por props faltantes, pero es una trampa de arquitectura). Además, `components/v2/system/V2Toolbar.tsx` es un **archivo huérfano**: define su propia función `V2Toolbar`, pero `system/index.ts` reexporta el nombre `V2Toolbar` desde `V2FilterBar.tsx` (que soporta `primary`/`secondary` como alias retrocompatibles), así que el archivo `V2Toolbar.tsx` nunca se ejecuta en la práctica. No se resolvió en este sprint (requiere decidir un rename/merge que toca imports en múltiples módulos — fuera del criterio de "cambio mínimo justificado"). Registrado en `UX_UI_BACKLOG.md` (DSV2-DUP-01).

### 5.4 Familia `--v2-indigo`

Ver `UX_UI_BASELINE_V2.md` §7.2 — token oficializado con valor indigo real (antes heredaba un verde de marca por un `:root` sin sincronizar). `V2AlertCard`, KPIs con `indicatorColor`, y el estado "Adicional" de RQs en Proyecto ahora son consistentes entre sí y entre Light/Dark.

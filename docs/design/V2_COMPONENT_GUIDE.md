# Guía de Componentes y Patrones V2 (IZANGO SIG V2)

Esta guía documenta la infraestructura visual del **SIG Design Language V2** (Release Candidate 1), el patrón de arquitectura implementado en el módulo **CRM V2** y los criterios de reutilización para la migración del módulo **Clientes V2**.

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

# Mapeo Visual V1 ➔ V2 para Módulo CRM

Este documento define la traducción detallada de elementos de interfaz y estilos del módulo CRM comercial hacia el sistema de diseño **SIG V2**.

---

## 1. Mapeo de Estructuras Visuales

### 1.1. Cabecera (Page Header)
* **V1**: `<MasterPage title="CRM Comercial" subtitle="..." actions={...}>`
* **V2**:
  ```tsx
  <V2PageHeader
    eyebrow="CRM Comercial"
    title="Gestión de Oportunidades"
    subtitle={`Gestión de oportunidades comerciales · ${leadsPeriodo.length} leads`}
    actions={...}
  />
  ```

### 1.2. Resumen Métrico (KPIs)
* **V1**: `<ExecutiveSummary columns={5} items={[...]} />`
* **V2**: Una fila flex/grid responsiva de `<V2KpiCard>`:
  - KPI 1: Pipeline Comercial (Icono: `CircleDollarSign`, color: `success`)
  - KPI 2: Cierre esperado (Icono: `TrendingUp`, color: `info`)
  - KPI 3: Propuestas abiertas (Icono: `Clock3`, color: `warning`)
  - KPI 4: Negocios Ganados (Icono: `BriefcaseBusiness`, color: `success`)
  - KPI 5: Conversión (Icono: `Percent` o `UsersRound`, color: `danger`)

### 1.3. Barra de Controles (Toolbar, Filtros y Búsqueda)
* **V1**: `<FiltersBar> ... </FiltersBar>`
* **V2**:
  ```tsx
  <V2Toolbar
    primary={
      <V2Input
        compact
        icon={<Search size={14} />}
        placeholder="Buscar lead..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />
    }
    secondary={
      <>
        <V2Select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}>
          <option value="actual">Pipeline actual</option>
          <option value="todos">Todos</option>
          {periodos.map(p => <option key={p} value={p}>{p}</option>)}
        </V2Select>
        <V2Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_PIPELINE.map(k => <option key={k} value={k}>{ESTADOS[k].label}</option>)}
        </V2Select>
        <V2Select value={filtroTemp} onChange={e => setFiltroTemp(e.target.value)}>
          <option value="">Todas las temp.</option>
          {Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </V2Select>
        {limpiarFiltrosVisible && <V2Button variant="ghost" size="compact" onClick={limpiar}>Limpiar</V2Button>}
      </>
    }
  />
  ```

### 1.4. Tablero Kanban (Columnas y Tarjetas)
* **V1**: Grilla CSS nativa con `gridTemplateColumns: repeat(7, 280px)` y `overflowX: "auto"`.
* **V2**: Se inyecta en el contenedor principal de la plantilla `V2KanbanPageTemplate`.
* **Columnas V2**: Tarjetas de columna estilizadas con fondo muted, bordes suaves, títulos en negrita y un círculo de color semántico indicando la etapa. En la cabecera de la columna se usa `V2StatusBadge` para la cantidad de leads.
* **Tarjetas de Lead V2**:
  - Caja con bordes redondeados (`var(--v2-radius)`), sombras finas, fondo blanco e interacciones hover de elevación.
  - Al estar seleccionado, se resalta con un borde verde de acento y fondo sutil.
  - Contiene información bien estructurada con tipografías legibles y espaciados pequeños (`gap: var(--v2-space-2)`).
  - Badge de temperatura (`V2StatusBadge`) a la izquierda de la fecha de próxima acción.

### 1.5. Drawer (Detalles de Lead)
* **V1**: `<Drawer open={...} onClose={...} width={420}>`
* **V2**:
  ```tsx
  <V2Drawer open={...} onClose={...} title={...} subtitle={...}>
    {/* Contenido con layouts V2 y V2FormField */}
  </V2Drawer>
  ```

### 1.6. Formulario de Creación / Edición (Modal)
* **V1**: Overlay de pantalla completo implementado a mano (`fixed inset-0 bg-black/50`).
* **V2**: Se traduce a un componente **`V2Modal`** estructurado y centrado:
  ```tsx
  <V2Modal open={showForm} onClose={() => setShowForm(false)} title={editando ? "Editar lead" : "Nuevo lead"}>
    {/* Formulario estructurado en cuadrículas responsivas usando V2FormField, V2Input y V2Select */}
  </V2Modal>
  ```

### 1.7. Loading, Empty y Error States
* **Loading**: Skeletons estructurados (`V2Skeleton`) que imitan las columnas Kanban mientras se realiza la consulta asíncrona.
* **Empty**: Uso de `V2EmptyState` con un título claro y descripción cuando una etapa no tiene registros.
* **Alertas**: Bloques de error con fondos suaves rojizos (`rgba(220, 38, 38, 0.1)`) y textos rojos.

"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  Filter,
  HelpCircle,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { V2AppShell } from "@/components/v2/layout"
import {
  V2Button,
  V2Dropdown,
  V2EmptyState,
  V2ErrorState,
  V2FilterBar,
  V2IconButton,
  V2Input,
  V2KpiCard,
  V2LoadingState,
  V2Modal,
  V2PageHeader,
  V2Pagination,
  V2SectionCard,
  V2Select,
  V2Skeleton,
  V2StatusDot,
  V2Tabs,
  type V2TableColumn,
  // Nuevos V2 Design Language
  V2ExecutiveHeader,
  V2TrendIndicator,
  V2AlertCard,
  V2ChartCard,
  V2StatusBreakdown,
  V2ActivityTimeline,
  V2IntelligencePanel,
  V2FinancialSummary,
  V2QuickActions,
  V2Drawer,
  V2FormField,
  V2StatusBadge,
  V2DataTable,
} from "@/components/v2/system"
import styles from "@/components/v2/system/V2System.module.css"

type DemoRow = {
  id: string
  cliente: string
  modulo: string
  estado: "Activo" | "En revision" | "Riesgo"
  responsable: string
  importe: string
  vencimiento: string
}

const rows: DemoRow[] = [
  {
    id: "DS-201",
    cliente: "Auna",
    modulo: "Proyecto 360",
    estado: "Activo",
    responsable: "Paolo Rossi",
    importe: "S/ 24,800",
    vencimiento: "18 Jul",
  },
  {
    id: "DS-202",
    cliente: "BCP",
    modulo: "Requerimiento audiovisual",
    estado: "En revision",
    responsable: "Giancarlo Veliz",
    importe: "S/ 9,450",
    vencimiento: "22 Jul",
  },
  {
    id: "DS-203",
    cliente: "Rimac",
    modulo: "Liquidacion",
    estado: "Riesgo",
    responsable: "Micaela Leon",
    importe: "S/ 16,300",
    vencimiento: "25 Jul",
  },
]

const columns: V2TableColumn<DemoRow>[] = [
  {
    key: "id",
    header: "Codigo",
    render: (row) => <span className={styles.strongCell}>{row.id}</span>,
  },
  { key: "cliente", header: "Cliente", render: (row) => row.cliente },
  { key: "modulo", header: "Modulo", render: (row) => row.modulo },
  {
    key: "estado",
    header: "Estado",
    render: (row) => (
      <V2StatusBadge tone={row.estado === "Activo" ? "success" : row.estado === "Riesgo" ? "danger" : "warning"}>
        {row.estado}
      </V2StatusBadge>
    ),
  },
  { key: "responsable", header: "Responsable", render: (row) => row.responsable },
  { key: "importe", header: "Importe", align: "right", render: (row) => row.importe },
  { key: "vencimiento", header: "Vence", align: "right", render: (row) => row.vencimiento },
]

const colorTokens = [
  { name: "Canvas Dark", value: "#051424" },
  { name: "Surface Dark", value: "#122131" },
  { name: "Accent (Brand Highlight)", value: "#03E373" },
  { name: "Brand Main", value: "#0F6E56" },
  { name: "Canvas Light", value: "#f8fafc" },
  { name: "Surface Light", value: "#ffffff" },
  { name: "Border Light", value: "#e2e8f0" },
]


export default function DesignSystemV2Page() {
  const [activeTab, setActiveTab] = useState("components")
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todos")

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesQuery = [row.id, row.cliente, row.modulo, row.responsable]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase())
      const matchesStatus = status === "todos" || row.estado === status

      return matchesQuery && matchesStatus
    })
  }, [query, status])

  return (
    <V2AppShell>
      <div className={styles.systemRoot}>
        <V2PageHeader
          actions={
            <>
              <V2Button icon={<Download size={15} />} variant="secondary">
                Exportar
              </V2Button>
              <V2Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>
                Nuevo modal
              </V2Button>
              <V2Button icon={<SlidersHorizontal size={15} />} onClick={() => setDrawerOpen(true)} variant="secondary">
                Abrir filtros
              </V2Button>
            </>
          }
          eyebrow="SIG v2.0"
          subtitle="Showcase oficial y laboratorio visual para aprobar tokens, componentes y patrones del IZANGO SIG."
          title="SIG Design Language V2"
        />

        <V2Tabs
          activeId={activeTab}
          items={[
            { id: "fundamentals", label: "Fundamentos" },
            { id: "components", label: "Componentes base" },
            { id: "patterns", label: "Patrones V2" },
          ]}
          onChange={setActiveTab}
        />

        {/* TAB 1: FUNDAMENTOS */}
        {activeTab === "fundamentals" && (
          <>
            <V2SectionCard
              description="Escala tipográfica, paleta de colores y variables globales de Izango SIG."
              title="Fundamentos visuales"
            >
              <div className={styles.sectionGrid}>
                <div className={styles.section}>
                  <p className={styles.label}>Tipografia Hanken Grotesk</p>
                  <p className={styles.heading1}>Heading 1 (26px, 950)</p>
                  <p className={styles.heading2}>Heading 2 (18px, 900)</p>
                  <p className={styles.heading3}>Heading 3 (14px, 900)</p>
                  <p className={styles.body}>Cuerpo base (12.5px, 650) para interfaces densas de administración.</p>
                  <p className={styles.caption}>Caption / metadato (10.5px, 700)</p>
                </div>
                <div className={styles.section}>
                  <p className={styles.label}>Paleta Semántica SIG V2</p>
                  <div className={styles.componentGrid}>
                    {colorTokens.map((token) => (
                      <div className={styles.card} key={token.name} style={{ minWidth: 128, padding: 12 }}>
                        <div style={{ background: token.value, borderRadius: 8, height: 44, marginBottom: 8, border: "1px solid var(--v2-border)" }} />
                        <p className={styles.caption}>{token.name}</p>
                        <p className={styles.tableBody}>{token.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </V2SectionCard>

            <V2SectionCard
              description="Radios de curvatura estándar y estilos de bordes para delimitar superficies y estados."
              title="Bordes y Radios"
            >
              <div className={styles.sectionGrid}>
                <div className={styles.section}>
                  <p className={styles.label}>Border radius (Curvatura)</p>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
                    {[
                      { label: "2px", val: "2px" },
                      { label: "4px", val: "4px" },
                      { label: "sm (6px)", val: "var(--v2-radius-sm)" },
                      { label: "default (8px)", val: "var(--v2-radius)" },
                      { label: "lg (12px)", val: "var(--v2-radius-lg)" },
                      { label: "16px", val: "16px" },
                    ].map((r) => (
                      <div
                        key={r.label}
                        style={{
                          width: "80px",
                          height: "50px",
                          background: "var(--v2-surface-soft)",
                          border: "1px solid var(--v2-border)",
                          borderRadius: r.val,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10.5px",
                          fontWeight: "800",
                          color: "var(--v2-muted)",
                        }}
                      >
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.section}>
                  <p className={styles.label}>Estilos de Bordes</p>
                  <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
                    {[
                      { label: "Borde estándar", style: { border: "1px solid var(--v2-border)" } },
                      { label: "Borde sutil", style: { border: "1px solid var(--v2-border-soft)" } },
                      { label: "Borde semántico (Success)", style: { border: "1px solid var(--v2-success)" } },
                      { label: "Borde de foco", style: { border: "1.5px solid var(--v2-indigo)", boxShadow: "0 0 0 3px var(--v2-focus-ring)" } },
                      { label: "Borde de error", style: { border: "1px solid var(--v2-danger)" } },
                    ].map((b) => (
                      <div
                        key={b.label}
                        style={{
                          padding: "8px 12px",
                          background: "var(--v2-surface)",
                          borderRadius: "var(--v2-radius-sm)",
                          fontSize: "11px",
                          fontWeight: "750",
                          color: "var(--v2-text)",
                          ...b.style,
                        }}
                      >
                        {b.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </V2SectionCard>

            <V2SectionCard
              description="Sombras discretas y elevaciones para la superposición de elementos interactivos."
              title="Elevaciones y Sombras"
            >
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "8px" }}>
                {[
                  { label: "None (Sin sombra)", val: "none" },
                  { label: "Subtle (sm)", val: "var(--v2-shadow-sm)" },
                  { label: "Medium (md)", val: "var(--v2-shadow-md)" },
                  { label: "Floating (lg)", val: "var(--v2-shadow-lg)" },
                ].map((sh) => (
                  <div
                    key={sh.label}
                    style={{
                      flex: "1 1 180px",
                      height: "80px",
                      background: "var(--v2-surface)",
                      border: "1px solid var(--v2-border-soft)",
                      borderRadius: "var(--v2-radius)",
                      boxShadow: sh.val,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: "900", color: "var(--v2-text)" }}>{sh.label}</span>
                    <span style={{ fontSize: "9px", color: "var(--v2-subtle)", textTransform: "uppercase" }}>{sh.val === "none" ? "Flat" : sh.val}</span>
                  </div>
                ))}
              </div>
            </V2SectionCard>

            <V2SectionCard
              description="Grilla de espaciado modular y breakpoints responsivos propuestos para el SIG."
              title="Grid, Espaciado y Breakpoints"
            >
              <div className={styles.sectionGrid}>
                <div className={styles.section}>
                  <p className={styles.label}>Grid base y Espaciados</p>
                  <p className={styles.caption} style={{ marginBottom: "8px" }}>Múltiplos de 4px para preservar consistencia vertical y horizontal:</p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {[
                      { label: "Space 1 (4px) - Separación micro", val: 4 },
                      { label: "Space 2 (8px) - Brecha en botones", val: 8 },
                      { label: "Space 3 (12px) - Padding de cards", val: 12 },
                      { label: "Space 4 (16px) - Brecha entre cards", val: 16 },
                      { label: "Space 5 (20px) - Padding de páginas", val: 20 },
                      { label: "Space 6 (24px) - Margen inferior", val: 24 },
                    ].map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: `${s.val * 3}px`, height: "8px", background: "var(--v2-indigo)", borderRadius: "2px" }} />
                        <span style={{ fontSize: "11px", fontWeight: "750", color: "var(--v2-text)" }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={styles.section}>
                  <p className={styles.label}>Breakpoints responsivos</p>
                  <div style={{ display: "grid", gap: "8px", marginTop: "8px" }}>
                    {[
                      { name: "Mobile (Celular)", size: "< 560px", desc: "1 columna, cabeceras en columna simple, menús colapsados." },
                      { name: "Tablet", size: "768px - 1024px", desc: "Menú lateral fijo o colapsable, KPIs en 2 o 3 columnas." },
                      { name: "Desktop (Laptop)", size: "1366px - 1440px", desc: "Layout principal de 2 columnas, KPIs en 3-4 columnas." },
                      { name: "Wide (Monitor)", size: "1920px+", desc: "Bento completo: KPIs en 6 columnas, alertas superiores a 4 columnas." },
                    ].map((bp) => (
                      <div key={bp.name} style={{ background: "var(--v2-surface-soft)", padding: "8px 12px", borderRadius: "var(--v2-radius-sm)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                          <strong style={{ fontSize: "11.5px", color: "var(--v2-text)" }}>{bp.name}</strong>
                          <span style={{ fontSize: "10.5px", fontWeight: "900", color: "var(--v2-indigo)" }}>{bp.size}</span>
                        </div>
                        <p style={{ fontSize: "10.5px", color: "var(--v2-muted)", margin: 0 }}>{bp.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </V2SectionCard>
          </>
        )}

        {/* TAB 2: COMPONENTES BASE */}
        {activeTab === "components" && (
          <>
            <V2SectionCard description="Variantes y estados funcionales de botones principales e interactivos." title="Botones e Iconos">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <V2Button icon={<Plus size={15} />}>Default (Primario)</V2Button>
                  <V2Button icon={<Plus size={15} />} style={{ background: "var(--v2-accent-hover)", color: "var(--v2-accent-ink)" }}>Hover (Forzado)</V2Button>
                  <V2Button icon={<Plus size={15} />} style={{ boxShadow: "0 0 0 3px var(--v2-focus-ring)" }}>Focus (Forzado)</V2Button>
                  <V2Button icon={<Plus size={15} />} style={{ transform: "scale(0.96)", opacity: 0.9 }}>Pressed (Forzado)</V2Button>
                  <V2Button disabled>Disabled</V2Button>
                  <V2Button loading>Loading</V2Button>
                  <V2Button variant="destructive">Destructive</V2Button>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <V2Button icon={<Filter size={15} />} variant="secondary">Secundario</V2Button>
                  <V2Button icon={<SlidersHorizontal size={15} />} variant="ghost">Ghost</V2Button>
                  <V2IconButton label="Foco / Info">
                    <HelpCircle size={16} />
                  </V2IconButton>
                  <V2Dropdown
                    items={[
                      { icon: <Check size={14} />, label: "Aprobar", onSelect: () => undefined },
                      { icon: <CalendarDays size={14} />, label: "Programar", onSelect: () => undefined },
                    ]}
                    trigger={
                      <>
                        <span>Desplegable</span>
                        <ChevronDown size={14} />
                      </>
                    }
                  />
                </div>
              </div>
            </V2SectionCard>

            <V2SectionCard description="Estados interactivos y validaciones de campos de entrada." title="Formularios y Entradas">
              <div className={styles.sectionGrid}>
                <div className={styles.section} style={{ display: "grid", gap: "12px" }}>
                  <V2FormField label="Input Default">
                    <V2Input placeholder="Default input..." />
                  </V2FormField>
                  <V2FormField label="Input Focus (Forzado)">
                    <V2Input style={{ borderColor: "var(--v2-accent)", boxShadow: "0 0 0 3px var(--v2-focus-ring)" }} placeholder="Focus input..." />
                  </V2FormField>
                  <V2FormField label="Input Filled">
                    <V2Input value="Valor ingresado por el usuario" onChange={() => undefined} />
                  </V2FormField>
                  <V2FormField label="Input Disabled">
                    <V2Input disabled placeholder="Disabled input..." />
                  </V2FormField>
                </div>
                <div className={styles.section} style={{ display: "grid", gap: "12px" }}>
                  <V2FormField label="Input con Error" error="El valor ingresado no corresponde a un formato válido.">
                    <V2Input error="Verifique su formato" placeholder="Input con error..." />
                  </V2FormField>
                  <V2FormField label="Input con Éxito">
                    <V2Input style={{ borderColor: "var(--v2-success)" }} placeholder="Input exitoso..." />
                  </V2FormField>
                  <V2FormField label="Input con Helper text" help="Este es un texto de ayuda sutil abajo del campo.">
                    <V2Input placeholder="Escribe aquí..." />
                  </V2FormField>
                </div>
              </div>
            </V2SectionCard>

            <V2SectionCard description="Selectores y listados desplegables." title="Selectores (V2Select)">
              <div className={styles.sectionGrid}>
                <V2FormField label="Select Default">
                  <V2Select
                    options={[
                      { label: "Seleccione una opción", value: "" },
                      { label: "Activo", value: "Activo" },
                      { label: "Riesgo", value: "Riesgo" },
                    ]}
                  />
                </V2FormField>
                <V2FormField label="Select Valor Seleccionado">
                  <V2Select
                    value="Riesgo"
                    onChange={() => undefined}
                    options={[
                      { label: "Activo", value: "Activo" },
                      { label: "Riesgo", value: "Riesgo" },
                    ]}
                  />
                </V2FormField>
                <V2FormField label="Select Disabled">
                  <V2Select
                    disabled
                    options={[{ label: "Deshabilitado", value: "1" }]}
                  />
                </V2FormField>
                <V2FormField label="Select con Error" error="Seleccione un estado.">
                  <V2Select
                    style={{ borderColor: "var(--v2-danger)" }}
                    options={[{ label: "Seleccione...", value: "" }]}
                  />
                </V2FormField>
              </div>
            </V2SectionCard>

            <V2SectionCard description="Etiquetas de negocio y píldoras circulares de servidores." title="Badges y Estados">
              <div className={styles.componentGrid}>
                <V2StatusBadge tone="success">Success</V2StatusBadge>
                <V2StatusBadge tone="warning">Warning</V2StatusBadge>
                <V2StatusBadge tone="danger">Critical</V2StatusBadge>
                <V2StatusBadge tone="info">Info</V2StatusBadge>
                <V2StatusBadge tone="neutral">Neutral</V2StatusBadge>
                <V2StatusBadge tone="outlined">Outlined</V2StatusBadge>
                <span style={{ opacity: 0.5 }}>
                  <V2StatusBadge tone="neutral">Disabled / Inactivo</V2StatusBadge>
                </span>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginLeft: 24 }}>
                  <V2StatusDot tone="success" /> <span className={styles.tableBody}>En línea</span>
                  <V2StatusDot tone="warning" /> <span className={styles.tableBody}>En espera</span>
                  <V2StatusDot tone="danger" /> <span className={styles.tableBody}>Desconectado</span>
                </div>
              </div>
            </V2SectionCard>

            <V2SectionCard description="Tabla de datos mostrando fila seleccionada, hover y vacía." title="Tabla y toolbar (V2DataTable)">
              <div style={{ display: "grid", gap: "24px" }}>
                <div>
                  <p className={styles.label} style={{ marginBottom: "8px" }}>A. Tabla en estado normal (Fila BCP seleccionada)</p>
                  <V2FilterBar
                    activeCount={query || status !== "todos" ? 1 : 0}
                    actions={
                      <V2Button icon={<Plus size={14} />} size="sm" variant="primary">
                        Nuevo registro
                      </V2Button>
                    }
                    onClear={() => {
                      setQuery("")
                      setStatus("todos")
                    }}
                  >
                    <V2Input
                      compact
                      icon={<Search size={14} />}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Filtrar por codigo o cliente..."
                      value={query}
                    />
                    <V2Select
                      compact
                      onChange={(e) => setStatus(e.target.value)}
                      options={[
                        { label: "Todos los estados", value: "todos" },
                        { label: "Activo", value: "Activo" },
                        { label: "En revision", value: "En revision" },
                        { label: "Riesgo", value: "Riesgo" },
                      ]}
                      value={status}
                    />
                  </V2FilterBar>

                  <p className={styles.label} style={{ marginTop: "12px", marginBottom: "4px" }}>A. Tabla con Filas y Paginacion</p>
                  <V2DataTable columns={columns} getRowId={(row) => row.id} rows={filteredRows} selectedRowId="DS-202" />
                  <div style={{ marginTop: 12 }}>
                    <V2Pagination page={1} pageCount={3} pageSize={10} totalItems={28} onPageChange={() => undefined} />
                  </div>
                </div>

                <div className={styles.sectionGrid}>
                  <div>
                    <p className={styles.label} style={{ marginBottom: "8px" }}>B. Tabla en estado Loading</p>
                    <V2DataTable columns={columns} getRowId={(row) => row.id} rows={[]} loading />
                  </div>
                  <div>
                    <p className={styles.label} style={{ marginBottom: "8px" }}>C. Tabla vacia (Empty State)</p>
                    <V2DataTable
                      columns={columns}
                      getRowId={(row) => row.id}
                      rows={[]}
                      emptyState={<V2EmptyState title="Sin registros coincidentes" description="Pruebe ajustando los filtros aplicados arriba." />}
                    />
                  </div>
                </div>

                <div>
                  <p className={styles.label} style={{ marginBottom: "8px" }}>D. Tabla en estado de Error (Error State)</p>
                  <V2DataTable
                    columns={columns}
                    errorState={
                      <V2ErrorState
                        action={<V2Button size="sm" variant="secondary">Reintentar consulta</V2Button>}
                        errorCode="500-DB"
                        title="Error al cargar tabla de datos"
                      />
                    }
                    getRowId={(row) => row.id}
                    rows={[]}
                  />
                </div>
              </div>
            </V2SectionCard>

            <V2SectionCard description="Estados de datos: Carga, Vacio, Error y Paginacion controlada." title="Estados de Datos V2">
              <div className={styles.sectionGrid}>
                <div style={{ display: "grid", gap: "12px" }}>
                  <p className={styles.label}>V2LoadingState (Variantes Table y Card)</p>
                  <V2LoadingState rows={2} variant="table" />
                </div>
                <div style={{ display: "grid", gap: "12px" }}>
                  <p className={styles.label}>V2ErrorState y V2EmptyState con Acciones</p>
                  <V2ErrorState compact errorCode="403-AUTH" title="Acceso denegado a este recurso" />
                  <V2EmptyState
                    compact
                    description="No hay proyectos finalizados en esta vista."
                    primaryAction={<V2Button size="sm">Crear proyecto</V2Button>}
                    title="Sin datos"
                  />
                </div>
              </div>
            </V2SectionCard>
          </>
        )}

        {/* TAB 3: PATRONES V2 */}
        {activeTab === "patterns" && (
          <>
            <V2SectionCard description="Componente: V2ExecutiveHeader. Cabeceras ejecutivas con saludo contextual, reloj dinámico y resúmenes." title="Encabezado Ejecutivo">
              <V2ExecutiveHeader
                title="Buenos días, Administrador"
                dateStr="Jueves 16 de Julio de 2026"
                timeStr="10:42 AM"
                syncText="Hace un momento"
                summaryText="Este es el resumen ejecutivo del SIG. Muestra las alertas en tiempo real y el flujo financiero acumulado."
              />
            </V2SectionCard>

            <V2SectionCard description="Componente: V2KpiCard. Tarjetas para métricas con tendencias, descripciones e indicadores dot de color." title="Indicadores Clave">
              <div className={styles.kpiGrid}>
                <V2KpiCard
                  icon={<CircleDollarSign size={16} />}
                  label="Efectivo Cobrado"
                  value="S/ 245K"
                  meta="SLA de conciliación del 98%"
                  trend="positive"
                  trendLabel="+8.4%"
                  indicatorColor="var(--v2-success)"
                />
                <V2KpiCard
                  icon={<BriefcaseBusiness size={16} />}
                  label="Proyectos Activos"
                  value="38"
                  meta="4 asignados esta semana"
                  trend="neutral"
                  trendLabel="Estable"
                  indicatorColor="var(--v2-indigo)"
                />
                <V2KpiCard
                  icon={<AlertCircle size={16} />}
                  label="Riesgos detectados"
                  value="3"
                  meta="Requieren atención"
                  trend="negative"
                  trendLabel="Alto"
                  indicatorColor="var(--v2-danger)"
                />
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
                <span className={styles.caption}>Tendencias sueltas (Componente: V2TrendIndicator):</span>
                <V2TrendIndicator trend="positive" value="+15.3%" />
                <V2TrendIndicator trend="neutral" value="0.0%" />
                <V2TrendIndicator trend="negative" value="-4.8%" />
              </div>
            </V2SectionCard>

            <V2SectionCard description="Componente: V2AlertCard. Notificaciones urgentes compactas con color semántico." title="Alertas Operativas">
              <div style={{ display: "grid", gap: 12 }}>
                <V2AlertCard tipo="hot" message="1 lead caliente desatendido hace 3 días" href="#" />
                <V2AlertCard tipo="warning" message="38 cotizaciones esperando aprobación" href="#" />
                <V2AlertCard tipo="info" message="Sincronización del SIG completada" href="#" />
              </div>
            </V2SectionCard>

            <V2SectionCard description="Componente: V2ActivityTimeline. Líneas de actividad interconectadas cronológicamente." title="Cronograma Operacional">
              <V2ActivityTimeline
                items={[
                  {
                    id: 1,
                    date: "16/07/2026",
                    title: "PROY-001",
                    badge: <V2StatusBadge tone="success">Curso</V2StatusBadge>,
                    subtitle: "Activación de campaña BTL - Saga Falabella",
                    meta: <span className={styles.caption}>Responsable: Paolo Rossi</span>,
                  },
                  {
                    id: 2,
                    date: "15/07/2026",
                    title: "RQ-942",
                    badge: <V2StatusBadge tone="warning">Pendiente</V2StatusBadge>,
                    subtitle: "Aprobación de viáticos para producción Selva",
                    meta: <span className={styles.caption}>Monto: S/ 4,200</span>,
                  },
                ]}
              />
            </V2SectionCard>

            <V2SectionCard description="Componente: V2IntelligencePanel. Insights estratégicos estructurados en riesgos, oportunidades y recomendaciones." title="Asistente Inteligente">
              <V2IntelligencePanel
                summary="La analítica predictiva del SIG detecta desviaciones en el margen comercial de operaciones de la Selva."
                items={[
                  { type: "risk", label: "Desviación técnica", content: "2 proyectos en curso exceden el presupuesto estimado de movilidad." },
                  { type: "opportunity", label: "Crecimiento comercial", content: "Lead caliente de Alicorp tiene una alta probabilidad de cierre." },
                  { type: "recommendation", label: "Ajuste de procesos", content: "Cerrar la liquidación final del proyecto Auna para liberar caja." },
                ]}
              />
            </V2SectionCard>

            <V2SectionCard description="Componente: V2FinancialSummary. Resúmenes de flujos comparativos con barras semánticas." title="Resumen Financiero">
              <V2FinancialSummary
                items={[
                  { label: "Efectivo Cobrado", value: "S/ 140,000", percentage: 65, type: "inflows" },
                  { label: "Cuentas por Cobrar", value: "S/ 84,000", percentage: 35, type: "receivables" },
                  { label: "Total Emitido", value: "S/ 224,000", percentage: 100, type: "total" },
                ]}
              />
            </V2SectionCard>

            <V2SectionCard description="Componente: V2StatusBreakdown. Distribución de portafolios mediante porcentajes y barras." title="Distribución de Estados">
              <V2StatusBreakdown
                items={[
                  { name: "En producción BTL", value: 12, color: "#03E373", percentage: 80 },
                  { name: "Espera de firmas", value: 4, color: "#f59e0b", percentage: 25 },
                  { name: "Cerrado", value: 2, color: "#64748B", percentage: 15 },
                ]}
              />
            </V2SectionCard>

            <V2SectionCard description="Componente: V2ChartCard. Contenedores de visualización analítica." title="Contenedores de Gráficos">
              <div className={styles.sectionGrid}>
                <V2ChartCard title="Gráfico financiero ordinario" description="Gráfico simulado de laboratorio.">
                  <div style={{ background: "rgba(0,0,0,0.05)", height: 180, borderRadius: 8, display: "grid", placeItems: "center" }}>
                    <span className={styles.bodyCompact}>[ Canvas del Gráfico ]</span>
                  </div>
                </V2ChartCard>
                <V2ChartCard title="Gráfico en estado de carga (Skeleton)" description="Simula una demora de consulta a Supabase.">
                  <V2Skeleton height={24} width="80%" />
                  <V2Skeleton height={120} width="100%" />
                  <V2Skeleton height={14} width="40%" />
                </V2ChartCard>
              </div>
            </V2SectionCard>
          </>
        )}
      </div>

      {/* MODAL MUESTRA DESIGN SYSTEM */}
      <V2Modal onClose={() => setModalOpen(false)} open={modalOpen} title="Modal V2 Showcase">
        <div style={{ display: "grid", gap: 16 }}>
          <p className={styles.bodyCompact}>Este modal es parte del Design System y no realiza modificaciones en el backend.</p>
          <V2FormField label="Ingrese datos de muestra" required>
            <V2Input placeholder="Ej. Patron" />
          </V2FormField>
          <V2QuickActions cols={2}>
            <V2Button onClick={() => setModalOpen(false)}>Confirmar</V2Button>
            <V2Button onClick={() => setModalOpen(false)} variant="ghost">Cancelar</V2Button>
          </V2QuickActions>
        </div>
      </V2Modal>

      {/* DRAWER MUESTRA DESIGN SYSTEM */}
      <V2Drawer onClose={() => setDrawerOpen(false)} open={drawerOpen} title="Filtros del Sistema V2">
        <div style={{ display: "grid", gap: 16 }}>
          <p className={styles.bodyCompact}>Este panel deslizable (420px) se utiliza para configurar filtros y formularios densos.</p>
          <V2FormField label="Filtro por Razón Social">
            <V2Input placeholder="Ej. Auna SAC" />
          </V2FormField>
          <V2FormField label="Filtro por Responsable">
            <V2Select
              options={[
                { label: "Paolo Rossi", value: "paolo" },
                { label: "Giancarlo Veliz", value: "giancarlo" },
              ]}
            />
          </V2FormField>
          <V2QuickActions cols={2}>
            <V2Button onClick={() => setDrawerOpen(false)}>Aplicar filtros</V2Button>
            <V2Button onClick={() => setDrawerOpen(false)} variant="ghost">Limpiar</V2Button>
          </V2QuickActions>
        </div>
      </V2Drawer>
    </V2AppShell>
  )
}

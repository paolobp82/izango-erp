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
  V2Drawer,
  V2PageHeader,
  V2Pagination,
  V2SectionCard,
  V2Select,
  V2Skeleton,
  V2StatusDot,
  V2StatusBadge,
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
  V2ConfirmDialog,
  V2FormField,
  V2Popover,
  V2Tooltip,
  V2Toast,
  V2ToastViewport,
  V2DataTable,
} from "@/components/v2/system"
import { V2ListPageTemplate, V2DetailPageTemplate, V2FormPageTemplate } from "@/components/v2/templates"
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
  const [modalSize, setModalSize] = useState<"sm" | "md" | "lg" | "xl" | "full">("md")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerSide, setDrawerSide] = useState<"right" | "left" | "bottom">("right")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTone, setConfirmTone] = useState<"neutral" | "warning" | "danger">("danger")
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastTone, setToastTone] = useState<"info" | "success" | "warning" | "error">("info")
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
            { id: "templates", label: "Template Listado V2" },
            { id: "detail-templates", label: "Template Detalle V2" },
            { id: "form-templates", label: "Template Formulario V2" },
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

            <V2SectionCard description="Overlays V2: Modales, Drawers, Diálogos de confirmación, Popovers, Tooltips y Toasts." title="Overlays V2">
              <div className={styles.sectionGrid}>
                <div style={{ display: "grid", gap: "12px" }}>
                  <p className={styles.label}>1. Modales y Paneles (V2Modal / V2Drawer)</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <V2Button size="sm" onClick={() => { setModalSize("sm"); setModalOpen(true); }}>Modal Pequeño (sm)</V2Button>
                    <V2Button size="sm" onClick={() => { setModalSize("md"); setModalOpen(true); }}>Modal Mediano (md)</V2Button>
                    <V2Button size="sm" onClick={() => { setModalSize("lg"); setModalOpen(true); }}>Modal Grande (lg)</V2Button>
                    <V2Button size="sm" variant="secondary" onClick={() => { setDrawerSide("right"); setDrawerOpen(true); }}>Drawer Derecha</V2Button>
                    <V2Button size="sm" variant="secondary" onClick={() => { setDrawerSide("left"); setDrawerOpen(true); }}>Drawer Izquierda</V2Button>
                    <V2Button size="sm" variant="secondary" onClick={() => { setDrawerSide("bottom"); setDrawerOpen(true); }}>Drawer Inferior</V2Button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  <p className={styles.label}>2. Diálogos de Confirmación (V2ConfirmDialog)</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <V2Button size="sm" variant="secondary" onClick={() => { setConfirmTone("neutral"); setConfirmOpen(true); }}>Confirmar Neutral</V2Button>
                    <V2Button size="sm" variant="secondary" onClick={() => { setConfirmTone("warning"); setConfirmOpen(true); }}>Confirmar Warning</V2Button>
                    <V2Button size="sm" variant="danger" onClick={() => { setConfirmTone("danger"); setConfirmOpen(true); }}>Eliminar (Danger)</V2Button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  <p className={styles.label}>3. Popovers y Tooltips (V2Popover / V2Tooltip)</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <V2Popover
                      placement="bottom"
                      trigger={<V2Button size="sm" variant="secondary">Abrir Popover</V2Button>}
                    >
                      <div style={{ display: "grid", gap: "8px", width: "180px" }}>
                        <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>Opciones Rápidas</p>
                        <V2Button size="sm" variant="ghost">Ver detalles</V2Button>
                        <V2Button size="sm" variant="ghost">Exportar datos</V2Button>
                      </div>
                    </V2Popover>

                    <V2Tooltip content="Tooltip de ayuda posicionado arriba" placement="top">
                      <V2Button size="sm" variant="ghost">Hover me (Top)</V2Button>
                    </V2Tooltip>

                    <V2Tooltip content="Tooltip deshabilitado" disabled placement="bottom">
                      <V2Button disabled size="sm" variant="ghost">Disabled Tooltip</V2Button>
                    </V2Tooltip>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "12px" }}>
                  <p className={styles.label}>4. Notificaciones Toasts (V2Toast)</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <V2Button size="sm" variant="secondary" onClick={() => { setToastTone("info"); setToastOpen(true); }}>Toast Info</V2Button>
                    <V2Button size="sm" variant="secondary" onClick={() => { setToastTone("success"); setToastOpen(true); }}>Toast Success</V2Button>
                    <V2Button size="sm" variant="secondary" onClick={() => { setToastTone("warning"); setToastOpen(true); }}>Toast Warning</V2Button>
                    <V2Button size="sm" variant="danger" onClick={() => { setToastTone("error"); setToastOpen(true); }}>Toast Error</V2Button>
                  </div>
                </div>
              </div>
            </V2SectionCard>
          </>
        )}

        {/* TAB TEMPLATES: TEMPLATE DE LISTADO V2 (SPRINT 6.1) */}
        {activeTab === "templates" && (
          <>
            <V2SectionCard
              description="Demostración composicional de V2ListPageTemplate demostrando los 6 escenarios normativos."
              title="V2ListPageTemplate — Escenarios de Presentación"
            >
              <div style={{ display: "grid", gap: "32px" }}>
                {/* ESCENARIO A: LISTADO COMPLETO */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario A — Listado Completo (Breadcrumb, 4 KPIs, Filtros, Tabla y Paginación)</p>
                  <V2ListPageTemplate
                    actions={
                      <V2Button icon={<Plus size={14} />} size="sm" variant="primary">
                        Nuevo Registro
                      </V2Button>
                    }
                    breadcrumb={<span>Inicio / Administración / Clientes</span>}
                    description="Gestión integral de clientes corporativos del ERP."
                    eyebrow="MÓDULO DE CLIENTES"
                    filters={
                      <V2FilterBar activeCount={1}>
                        <V2Input compact placeholder="Buscar cliente..." value={query} onChange={(e) => setQuery(e.target.value)} />
                        <V2Select compact value={status} onChange={(e) => setStatus(e.target.value)} options={[{ label: "Todos", value: "todos" }, { label: "Activo", value: "Activo" }]} />
                      </V2FilterBar>
                    }
                    kpis={
                      <>
                        <V2KpiCard label="Total Clientes" tone="neutral" value="128" />
                        <V2KpiCard label="Clientes Activos" tone="success" value="94" />
                        <V2KpiCard label="En Revisión" tone="warning" value="22" />
                        <V2KpiCard label="En Riesgo" tone="error" value="12" />
                      </>
                    }
                    pagination={
                      <V2Pagination page={1} pageCount={4} pageSize={10} totalItems={38} onPageChange={() => undefined} />
                    }
                    secondaryActions={
                      <V2Button icon={<Download size={14} />} size="sm" variant="secondary">
                        Exportar
                      </V2Button>
                    }
                    title="Listado de Clientes"
                  >
                    <V2DataTable columns={columns} getRowId={(row) => row.id} rows={filteredRows} />
                  </V2ListPageTemplate>
                </div>

                {/* ESCENARIO B: LISTADO COMPACTO SIN KPIS */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario B — Listado Compacto sin KPIs (density=&quot;compact&quot;, contentWidth=&quot;contained&quot;)</p>
                  <V2ListPageTemplate
                    actions={<V2Button size="sm">Crear Item</V2Button>}
                    contentWidth="contained"
                    density="compact"
                    description="Vista densa para administración rápida."
                    filters={
                      <V2FilterBar>
                        <V2Input compact placeholder="Filtrar..." />
                      </V2FilterBar>
                    }
                    pagination={<V2Pagination page={1} pageCount={2} onPageChange={() => undefined} />}
                    title="Listado Compacto"
                  >
                    <V2DataTable columns={columns} density="compact" getRowId={(row) => row.id} rows={filteredRows.slice(0, 2)} />
                  </V2ListPageTemplate>
                </div>

                {/* ESCENARIO C: LOADING STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario C — Estado de Carga (state=&quot;loading&quot;)</p>
                  <V2ListPageTemplate
                    description="Cargando información del servidor..."
                    state="loading"
                    title="Cargando Registros"
                  >
                    <div />
                  </V2ListPageTemplate>
                </div>

                {/* ESCENARIO D: EMPTY STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario D — Estado Vacío (state=&quot;empty&quot;)</p>
                  <V2ListPageTemplate
                    description="No se encontraron datos coincidentes."
                    emptyState={<V2EmptyState description="Intente ajustando los filtros." title="Sin Registros" />}
                    state="empty"
                    title="Consulta Sin Resultados"
                  >
                    <div />
                  </V2ListPageTemplate>
                </div>

                {/* ESCENARIO E: ERROR STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario E — Estado de Error (state=&quot;error&quot;)</p>
                  <V2ListPageTemplate
                    errorState={<V2ErrorState errorCode="500-SRV" title="Fallo en la comunicación con el servidor" />}
                    state="error"
                    title="Error de Carga"
                  >
                    <div />
                  </V2ListPageTemplate>
                </div>

                {/* ESCENARIO F: COLECCIÓN SIN TABLA */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario F — Colección sin Tabla (Grid de Tarjetas)</p>
                  <V2ListPageTemplate
                    description="Colección visual en cuadrícula de tarjetas."
                    title="Galería de Medios"
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
                      {[1, 2, 3, 4].map((item) => (
                        <div key={item} style={{ padding: "12px", border: "1px solid var(--v2-border)", borderRadius: "6px", background: "var(--v2-surface-container-low)" }}>
                          <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>Recurso #{item}</p>
                          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--v2-muted)" }}>Imagen HD (1920x1080)</p>
                        </div>
                      ))}
                    </div>
                  </V2ListPageTemplate>
                </div>
              </div>
            </V2SectionCard>
          </>
        )}

        {/* TAB DETAIL TEMPLATES: TEMPLATE DE DETALLE V2 (SPRINT 6.2) */}
        {activeTab === "detail-templates" && (
          <>
            <V2SectionCard
              description="Demostración composicional de V2DetailPageTemplate para los 8 escenarios normativos."
              title="V2DetailPageTemplate — Escenarios de Presentación"
            >
              <div style={{ display: "grid", gap: "32px" }}>
                {/* ESCENARIO A: DETALLE SIMPLE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario A — Detalle Simple (Header, StatusBadge, Summary y Footer)</p>
                  <V2DetailPageTemplate
                    actions={
                      <V2Button size="sm" variant="primary">
                        Editar Cliente
                      </V2Button>
                    }
                    breadcrumb={<span>Inicio / Clientes / CLI-2026-001</span>}
                    eyebrow="INFORMACIÓN GENERAL"
                    footer={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <span style={{ fontSize: "11px", color: "var(--v2-muted)" }}>Última actualización: hace 2 horas por Admin</span>
                        <V2Button size="sm" variant="secondary">Cerrar Ficha</V2Button>
                      </div>
                    }
                    statusBadge={<V2StatusBadge tone="success">Cliente Activo</V2StatusBadge>}
                    subtitle="Empresa dedicada al desarrollo audiovisual y producción corporativa."
                    summary={
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                        <V2KpiCard label="Facturación Anual" tone="success" value="S/ 450,000" />
                        <V2KpiCard label="Proyectos Totales" tone="neutral" value="18" />
                        <V2KpiCard label="Calificación" tone="warning" value="A+" />
                      </div>
                    }
                    title="Corporación Audiovisual Izango S.A.C."
                  >
                    <V2SectionCard title="Datos de Registro">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                        <div><strong>RUC:</strong> 20601234567</div>
                        <div><strong>Teléfono:</strong> +51 987 654 321</div>
                        <div><strong>Dirección:</strong> Av. Javier Prado Este 1234, San Isidro</div>
                        <div><strong>Contacto Principal:</strong> Juan Pérez (Gerente General)</div>
                      </div>
                    </V2SectionCard>
                  </V2DetailPageTemplate>
                </div>

                {/* ESCENARIO B: DETALLE CON SIDEBAR DERECHO */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario B — Detalle con Sidebar Derecho (Layout 2 Columnas)</p>
                  <V2DetailPageTemplate
                    breadcrumb={<span>Proyectos / PROY-2026-088</span>}
                    eyebrow="PROYECTO ACTIVO"
                    sidebar={
                      <V2SectionCard title="Información Clave">
                        <div style={{ display: "grid", gap: "8px", fontSize: "12px" }}>
                          <div><strong>Productor:</strong> Maria Gómez</div>
                          <div><strong>Fecha Inicio:</strong> 01/07/2026</div>
                          <div><strong>Fecha Fin:</strong> 15/08/2026</div>
                          <div><strong>Estado:</strong> En producción</div>
                        </div>
                      </V2SectionCard>
                    }
                    sidebarPosition="right"
                    title="Campaña Audiovisual Verano 2026"
                  >
                    <V2SectionCard title="Alcance del Proyecto">
                      <p style={{ fontSize: "13px", color: "var(--v2-text-base)", margin: 0 }}>
                        Producción de 3 spots de televisión de 30 segundos y material publicitario para redes sociales.
                      </p>
                    </V2SectionCard>
                  </V2DetailPageTemplate>
                </div>

                {/* ESCENARIO C: DETALLE CON SIDEBAR IZQUIERDO */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario C — Detalle con Sidebar Izquierdo (sidebarPosition=&quot;left&quot;)</p>
                  <V2DetailPageTemplate
                    breadcrumb={<span>RRHH / Trabajadores / EMP-042</span>}
                    eyebrow="FICHA TÉCNICA"
                    sidebar={
                      <div style={{ padding: "12px", border: "1px solid var(--v2-border)", borderRadius: "6px", background: "var(--v2-surface-container-low)" }}>
                        <p style={{ fontWeight: "bold", margin: "0 0 8px" }}>Navegación de Ficha</p>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px" }}>
                          <li>Datos Personales</li>
                          <li>Contrato y Sueldo</li>
                          <li>Permisos y Faltas</li>
                        </ul>
                      </div>
                    }
                    sidebarPosition="left"
                    title="Carlos Mendoza — Director Fotográfico"
                  >
                    <V2SectionCard title="Resumen Profesional">
                      <p style={{ fontSize: "13px", margin: 0 }}>Especialista en iluminación y cámara cinemática con 8 años de experiencia.</p>
                    </V2SectionCard>
                  </V2DetailPageTemplate>
                </div>

                {/* ESCENARIO D: DETALLE CON TABS */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario D — Detalle con Pestañas (tabs)</p>
                  <V2DetailPageTemplate
                    tabs={
                      <V2Tabs
                        activeId="resumen"
                        items={[
                          { id: "resumen", label: "Resumen General" },
                          { id: "presupuesto", label: "Presupuesto y RQs" },
                          { id: "equipo", label: "Equipo Técnico" },
                        ]}
                      />
                    }
                    title="Ficha con Pestañas Interactivas"
                  >
                    <V2SectionCard title="Contenido de la Pestaña Activa">
                      <p style={{ fontSize: "13px", margin: 0 }}>Contenido dinámico basado en la pestaña elegida.</p>
                    </V2SectionCard>
                  </V2DetailPageTemplate>
                </div>

                {/* ESCENARIO E: DETALLE CON TIMELINE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario E — Detalle con Cronograma (timeline)</p>
                  <V2DetailPageTemplate
                    timeline={
                      <V2SectionCard title="Cronograma de Actividad">
                        <div style={{ fontSize: "12px", color: "var(--v2-muted)" }}>
                          <p style={{ margin: "0 0 4px" }}>• 10/07/2026 10:00 AM — RQ-088 aprobado por Gerencia</p>
                          <p style={{ margin: 0 }}>• 05/07/2026 03:30 PM — Cotización V2 creada por Producción</p>
                        </div>
                      </V2SectionCard>
                    }
                    title="Proyecto con Línea de Tiempo"
                  >
                    <V2SectionCard title="Vista Principal">
                      <p style={{ fontSize: "13px", margin: 0 }}>Sección superior de detalles.</p>
                    </V2SectionCard>
                  </V2DetailPageTemplate>
                </div>

                {/* ESCENARIO F: LOADING STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario F — Estado de Carga (state=&quot;loading&quot;)</p>
                  <V2DetailPageTemplate
                    state="loading"
                    title="Cargando Ficha..."
                  />
                </div>

                {/* ESCENARIO G: EMPTY STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario G — Estado Vacío (state=&quot;empty&quot;)</p>
                  <V2DetailPageTemplate
                    emptyState={<V2EmptyState description="No existe el registro solicitado." title="Ficha Inexistente" />}
                    state="empty"
                    title="Registro No Encontrado"
                  />
                </div>

                {/* ESCENARIO H: ERROR STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario H — Estado de Error (state=&quot;error&quot;)</p>
                  <V2DetailPageTemplate
                    errorState={<V2ErrorState errorCode="404-NOT-FOUND" title="No se pudo cargar la información del servidor" />}
                    state="error"
                    title="Fallo de Conexión"
                  />
                </div>
              </div>
            </V2SectionCard>
          </>
        )}

        {/* TAB FORM TEMPLATES: TEMPLATE DE FORMULARIO V2 (SPRINT 6.3) */}
        {activeTab === "form-templates" && (
          <>
            <V2SectionCard
              description="Demostración composicional de V2FormPageTemplate para los 7 escenarios normativos de formulario."
              title="V2FormPageTemplate — Escenarios de Presentación"
            >
              <div style={{ display: "grid", gap: "32px" }}>
                {/* ESCENARIO A: FORMULARIO SIMPLE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario A — Formulario Simple (1 Columna, Header, Footer de Acciones)</p>
                  <V2FormPageTemplate
                    breadcrumb={<span>Inicio / Usuarios / Nuevo</span>}
                    eyebrow="CREACIÓN DE CUENTA"
                    footer={
                      <>
                        <V2Button size="sm" variant="secondary">Cancelar</V2Button>
                        <V2Button size="sm" variant="primary">Guardar Usuario</V2Button>
                      </>
                    }
                    subtitle="Registre los datos requeridos para la nueva cuenta del sistema."
                    title="Nuevo Usuario de Sistema"
                  >
                    <V2SectionCard title="Información Básica">
                      <div style={{ display: "grid", gap: "16px" }}>
                        <V2FormField label="Nombre Completo" required>
                          <V2Input placeholder="Ej. Juan Pérez" />
                        </V2FormField>
                        <V2FormField label="Correo Electrónico" required>
                          <V2Input placeholder="usuario@izango.pe" type="email" />
                        </V2FormField>
                        <V2FormField label="Rol Asignado" required>
                          <V2Select options={[{ value: "admin", label: "Administrador" }, { value: "productor", label: "Productor" }]} />
                        </V2FormField>
                      </div>
                    </V2SectionCard>
                  </V2FormPageTemplate>
                </div>

                {/* ESCENARIO B: FORMULARIO LARGO (MULTI-SECCIÓN) */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario B — Formulario Largo (Multi-sección de registro completo)</p>
                  <V2FormPageTemplate
                    breadcrumb={<span>CRM / Clientes / Nuevo</span>}
                    eyebrow="REGISTRO CORPORATIVO"
                    footer={
                      <>
                        <V2Button size="sm" variant="secondary">Guardar Borrador</V2Button>
                        <V2Button size="sm" variant="primary">Registrar Cliente</V2Button>
                      </>
                    }
                    subtitle="Complete todos los bloques corporativos y fiscales del nuevo cliente."
                    title="Registro de Cliente Corporativo"
                  >
                    <div style={{ display: "grid", gap: "20px" }}>
                      <V2SectionCard title="1. Datos de Identificación">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <V2FormField label="Razón Social" required><V2Input placeholder="Razón Social S.A.C." /></V2FormField>
                          <V2FormField label="RUC" required><V2Input placeholder="20600000000" /></V2FormField>
                        </div>
                      </V2SectionCard>

                      <V2SectionCard title="2. Ubicación Fiscal">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <V2FormField label="Dirección Fiscal" required><V2Input placeholder="Av. Javier Prado 100" /></V2FormField>
                          <V2FormField label="Departamento"><V2Select options={[{ value: "lima", label: "Lima" }]} /></V2FormField>
                        </div>
                      </V2SectionCard>

                      <V2SectionCard title="3. Contacto Principal">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <V2FormField label="Nombre de Contacto"><V2Input placeholder="Carlos Ruiz" /></V2FormField>
                          <V2FormField label="Teléfono"><V2Input placeholder="+51 900000000" /></V2FormField>
                        </div>
                      </V2SectionCard>
                    </div>
                  </V2FormPageTemplate>
                </div>

                {/* ESCENARIO C: FORMULARIO CON SIDEBAR */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario C — Formulario con Sidebar (Instrucciones y Ayuda)</p>
                  <V2FormPageTemplate
                    breadcrumb={<span>Proyectos / Nuevo</span>}
                    eyebrow="NUEVO PROYECTO"
                    footer={
                      <>
                        <V2Button size="sm" variant="secondary">Cancelar</V2Button>
                        <V2Button size="sm" variant="primary">Crear Proyecto</V2Button>
                      </>
                    }
                    sidebar={
                      <V2SectionCard title="Guía de Llenado">
                        <div style={{ fontSize: "12px", color: "var(--v2-muted)", display: "grid", gap: "8px" }}>
                          <p style={{ margin: 0 }}>• El código de proyecto se genera de forma autoincremental.</p>
                          <p style={{ margin: 0 }}>• Asigne obligatoriamente un Productor responsable titular.</p>
                          <p style={{ margin: 0 }}>• Las fechas de inicio y fin estimadas delimitan la asignación de RQs.</p>
                        </div>
                      </V2SectionCard>
                    }
                    subtitle="Defina los parámetros base del proyecto de producción."
                    title="Alta de Proyecto Audiovisual"
                  >
                    <V2SectionCard title="Parámetros del Proyecto">
                      <div style={{ display: "grid", gap: "16px" }}>
                        <V2FormField label="Nombre del Proyecto" required><V2Input placeholder="Campaña Verano 2026" /></V2FormField>
                        <V2FormField label="Presupuesto Referencial (S/)"><V2Input placeholder="50000.00" type="number" /></V2FormField>
                      </div>
                    </V2SectionCard>
                  </V2FormPageTemplate>
                </div>

                {/* ESCENARIO D: FORMULARIO CON RESUMEN */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario D — Formulario con Resumen (Indicadores superiores previa emisión)</p>
                  <V2FormPageTemplate
                    breadcrumb={<span>Finanzas / Facturación / Emitir</span>}
                    eyebrow="EMISIÓN DE COMPROBANTE"
                    footer={
                      <>
                        <V2Button size="sm" variant="secondary">Vista Previa</V2Button>
                        <V2Button size="sm" variant="primary">Emitir Factura</V2Button>
                      </>
                    }
                    summary={
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                        <V2KpiCard label="Subtotal" tone="neutral" value="S/ 10,000.00" />
                        <V2KpiCard label="IGV (18%)" tone="warning" value="S/ 1,800.00" />
                        <V2KpiCard label="Total Factura" tone="success" value="S/ 11,800.00" />
                      </div>
                    }
                    title="Emisión de Factura de Venta"
                  >
                    <V2SectionCard title="Detalle Tributario">
                      <V2FormField label="Moneda de Facturación">
                        <V2Select options={[{ value: "PEN", label: "Soles (S/)" }, { value: "USD", label: "Dólares ($)" }]} />
                      </V2FormField>
                    </V2SectionCard>
                  </V2FormPageTemplate>
                </div>

                {/* ESCENARIO E: LOADING STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario E — Estado de Carga (state=&quot;loading&quot;)</p>
                  <V2FormPageTemplate
                    state="loading"
                    title="Cargando Formulario..."
                  />
                </div>

                {/* ESCENARIO F: EMPTY STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario F — Estado Vacío (state=&quot;empty&quot;)</p>
                  <V2FormPageTemplate
                    emptyState={<V2EmptyState description="El formulario no se encuentra disponible." title="Formulario No Disponible" />}
                    state="empty"
                    title="Formulario Inexistente"
                  />
                </div>

                {/* ESCENARIO G: ERROR STATE */}
                <div style={{ padding: "16px", border: "1px solid var(--v2-border)", borderRadius: "8px", background: "var(--v2-surface)" }}>
                  <p className={styles.label} style={{ marginBottom: "12px" }}>Escenario G — Estado de Error (state=&quot;error&quot;)</p>
                  <V2FormPageTemplate
                    errorState={<V2ErrorState errorCode="500-FORM-ERROR" title="Ocurrió un problema al renderizar los campos" />}
                    state="error"
                    title="Error al Cargar Formulario"
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
      <V2Modal onClose={() => setModalOpen(false)} open={modalOpen} size={modalSize} title="Modal V2 Showcase">
        <div style={{ display: "grid", gap: 16 }}>
          <p className={styles.bodyCompact}>Este modal es parte del Design System V2 y no realiza modificaciones en el backend.</p>
          <V2Input placeholder="Ejemplo de campo dentro de modal V2" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <V2Button onClick={() => setModalOpen(false)} variant="secondary">Cancelar</V2Button>
            <V2Button onClick={() => setModalOpen(false)}>Aceptar</V2Button>
          </div>
        </div>
      </V2Modal>

      {/* DRAWER MUESTRA DESIGN SYSTEM */}
      <V2Drawer onClose={() => setDrawerOpen(false)} open={drawerOpen} side={drawerSide} title="Filtros del Sistema V2">
        <div style={{ display: "grid", gap: 16 }}>
          <p className={styles.bodyCompact}>Este panel deslizable ({drawerSide}) se utiliza para configurar filtros y formularios densos.</p>
          <V2Input placeholder="Ej. Auna SAC" />
          <V2Select
            options={[
              { label: "Paolo Rossi", value: "paolo" },
              { label: "Giancarlo Veliz", value: "giancarlo" },
            ]}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <V2Button onClick={() => setDrawerOpen(false)}>Aplicar filtros</V2Button>
            <V2Button onClick={() => setDrawerOpen(false)} variant="secondary">Limpiar</V2Button>
          </div>
        </div>
      </V2Drawer>

      {/* CONFIRM DIALOG MUESTRA */}
      <V2ConfirmDialog
        confirmLabel="Confirmar acción"
        description="Esta acción afectará los registros seleccionados en la demostración."
        loading={confirmLoading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmLoading(true)
          setTimeout(() => {
            setConfirmLoading(false)
            setConfirmOpen(false)
          }, 1000)
        }}
        open={confirmOpen}
        title="¿Desea proceder con esta operación?"
        tone={confirmTone}
      />

      {/* TOAST VIEWPORT MUESTRA */}
      <V2ToastViewport position="bottom-right">
        {toastOpen ? (
          <V2Toast
            action={{ label: "Deshacer", onClick: () => setToastOpen(false) }}
            description="La operación solicitada se ejecutó en el entorno de demostración V2."
            onDismiss={() => setToastOpen(false)}
            open={toastOpen}
            title="Notificación del Sistema"
            tone={toastTone}
          />
        ) : null}
      </V2ToastViewport>
    </V2AppShell>
  )
}

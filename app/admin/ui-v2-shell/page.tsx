"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  CircleDollarSign,
  Clock3,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react"

import {
  V2Button,
  V2DataTable,
  V2FormField,
  V2Input,
  V2KpiCard,
  V2Modal,
  V2PageHeader,
  V2Pagination,
  V2QuickActions,
  V2SectionCard,
  V2StatusBadge,
  V2Tabs,
  V2Toolbar,
  type V2TableColumn,
  V2Drawer,
} from "@/components/v2/system"
import {
  V2ListPageTemplate,
  V2Detail360Template,
  V2ModuleDashboardTemplate,
  V2KanbanPageTemplate,
  V2WorkCenterTemplate,
  V2FullFormTemplate,
  V2FinancialTableTemplate,
  V2SettingsPageTemplate,
} from "@/components/v2/templates"
import styles from "@/components/v2/system/V2System.module.css"

type DemoRow = {
  id: string
  cliente: string
  modulo: string
  estado: string
  owner: string
  vencimiento: string
  monto: string
}

const rows: DemoRow[] = [
  { id: "V2-001", cliente: "Honda del Peru", modulo: "Comercial", estado: "Activo", owner: "Paolo Bastianelli", vencimiento: "Hoy", monto: "S/ 84,500" },
  { id: "V2-002", cliente: "Mall Aventura", modulo: "Operaciones", estado: "Revision", owner: "Giancarlo Veliz", vencimiento: "3 dias", monto: "S/ 41,900" },
  { id: "V2-003", cliente: "Ripley", modulo: "Finanzas", estado: "Programado", owner: "Controller", vencimiento: "7 dias", monto: "S/ 56,200" },
]

const columns: V2TableColumn<DemoRow>[] = [
  { key: "id", header: "Codigo", render: (row) => <span className={styles.strongCell}>{row.id}</span> },
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
  { key: "owner", header: "Responsable", render: (row) => row.owner },
  { key: "monto", header: "Monto", align: "right", render: (row) => row.monto },
]

export default function UiV2ShellPage() {
  const [activeTemplate, setActiveTemplate] = useState("list")
  const [activeSubTab, setActiveSubTab] = useState("general")
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      row.cliente.toLowerCase().includes(query.toLowerCase()) ||
      row.id.toLowerCase().includes(query.toLowerCase())
    )
  }, [query])

  return (
    <>
      <div className={styles.systemRoot}>
        <V2PageHeader
          eyebrow="SIG v2.0 Templates"
          title="Showcase de Plantillas de Módulo"
          subtitle="Demostración interactiva de las ocho plantillas de página traducidas del sistema de diseño V1 a la V2."
          actions={
            <>
              <V2Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>
                Abrir Modal
              </V2Button>
              <V2Button icon={<SlidersHorizontal size={15} />} onClick={() => setDrawerOpen(true)} variant="secondary">
                Abrir Cajón
              </V2Button>
            </>
          }
        />

        <V2Tabs
          activeId={activeTemplate}
          items={[
            { id: "list", label: "ListPage" },
            { id: "detail", label: "Detail360" },
            { id: "dashboard", label: "Dashboard" },
            { id: "kanban", label: "Kanban" },
            { id: "workcenter", label: "WorkCenter" },
            { id: "form", label: "FullForm" },
            { id: "financial", label: "FinancialTable" },
            { id: "settings", label: "Settings" },
          ]}
          onChange={setActiveTemplate}
        />

        <div style={{ marginTop: "20px" }}>
          {/* 1. V2ListPageTemplate */}
          {activeTemplate === "list" && (
            <V2ListPageTemplate
              header={<V2PageHeader title="Listado de Clientes" eyebrow="V2ListPageTemplate" />}
              summary={
                <div className={styles.kpiGrid}>
                  <V2KpiCard icon={<CircleDollarSign size={16} />} label="Total Pipeline" value="S/ 182,600" trend="positive" trendLabel="+4.2%" indicatorColor="var(--v2-success)" />
                  <V2KpiCard icon={<UsersRound size={16} />} label="Clientes Activos" value="12" trend="neutral" trendLabel="Estable" indicatorColor="var(--v2-indigo)" />
                  <V2KpiCard icon={<AlertCircle size={16} />} label="Alertas Críticas" value="1" trend="negative" trendLabel="Alto" indicatorColor="var(--v2-danger)" />
                </div>
              }
              toolbar={
                <V2Toolbar
                  primary={<V2Input compact icon={<Search size={14} />} placeholder="Filtrar clientes..." value={query} onChange={(e) => setQuery(e.target.value)} />}
                  secondary={<V2Button size="compact" variant="secondary" icon={<Filter size={14} />}>Filtrar</V2Button>}
                />
              }
              table={
                <V2SectionCard title="Resultados">
                  <V2DataTable columns={columns} getRowKey={(row) => row.id} rows={filteredRows} />
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <V2Pagination onPageChange={() => undefined} page={1} pageCount={3} summary="1-3 de 9" />
                  </div>
                </V2SectionCard>
              }
            />
          )}

          {/* 2. V2Detail360Template */}
          {activeTemplate === "detail" && (
            <V2Detail360Template
              header={<V2PageHeader title="Detalle: Honda del Perú" eyebrow="V2Detail360Template" />}
              tabs={
                <V2Tabs
                  activeId={activeSubTab}
                  items={[
                    { id: "general", label: "Información General" },
                    { id: "proy", label: "Proyectos" },
                  ]}
                  onChange={setActiveSubTab}
                />
              }
            >
              {activeSubTab === "general" ? (
                <V2SectionCard title="Datos de la Empresa" description="Información fiscal y comercial.">
                  <div className={styles.sectionGrid}>
                    <div>
                      <p className={styles.label}>Razón Social</p>
                      <p className={styles.bodyCompact}>Honda del Perú S.A.</p>
                    </div>
                    <div>
                      <p className={styles.label}>RUC</p>
                      <p className={styles.bodyCompact}>20100040502</p>
                    </div>
                  </div>
                </V2SectionCard>
              ) : (
                <V2SectionCard title="Lista de Proyectos Asignados">
                  <V2DataTable columns={columns} getRowKey={(row) => row.id} rows={rows.slice(0, 1)} />
                </V2SectionCard>
              )}
            </V2Detail360Template>
          )}

          {/* 3. V2ModuleDashboardTemplate */}
          {activeTemplate === "dashboard" && (
            <V2ModuleDashboardTemplate
              header={<V2PageHeader title="Centro de Control de Finanzas" eyebrow="V2ModuleDashboardTemplate" />}
              summary={
                <div className={styles.kpiGrid}>
                  <V2KpiCard icon={<CircleDollarSign size={16} />} label="Total Cobrado" value="S/ 140K" trend="positive" trendLabel="+12%" indicatorColor="var(--v2-success)" />
                  <V2KpiCard icon={<Clock3 size={16} />} label="Pendiente de Cobro" value="S/ 84K" trend="neutral" trendLabel="Estable" indicatorColor="var(--v2-warning)" />
                </div>
              }
              widgets={
                <>
                  <V2SectionCard title="Análisis de Caja">
                    <div style={{ background: "rgba(0,0,0,0.05)", height: 180, borderRadius: 8, display: "grid", placeItems: "center" }}>
                      <span className={styles.bodyCompact}>[ Gráfico de Flujos de Caja ]</span>
                    </div>
                  </V2SectionCard>
                  <V2SectionCard title="Estado del Sistema">
                    <div style={{ display: "grid", gap: 12 }}>
                      <p className={styles.bodyCompact}>Sincronización Supabase: OK</p>
                      <p className={styles.bodyCompact}>SLA de Pagos: 98%</p>
                    </div>
                  </V2SectionCard>
                </>
              }
            />
          )}

          {/* 4. V2KanbanPageTemplate */}
          {activeTemplate === "kanban" && (
            <V2KanbanPageTemplate
              header={<V2PageHeader title="Embudo Comercial (Kanban)" eyebrow="V2KanbanPageTemplate" />}
              toolbar={
                <V2Toolbar
                  primary={<V2Input compact icon={<Search size={14} />} placeholder="Buscar lead..." />}
                />
              }
              columns={
                <div style={{ display: "flex", gap: "16px" }}>
                  {["Por Contactar", "En Negociación", "Propuesta Enviada"].map((col) => (
                    <div key={col} style={{ flex: "1 1 280px", background: "var(--v2-surface)", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", padding: "16px" }}>
                      <p className={styles.label} style={{ marginBottom: "12px" }}>{col}</p>
                      <div style={{ display: "grid", gap: "8px" }}>
                        <div style={{ padding: "12px", background: "var(--v2-surface-soft)", borderRadius: "var(--v2-radius-sm)", border: "1px solid var(--v2-border-soft)" }}>
                          <strong style={{ fontSize: "12px", color: "var(--v2-text)" }}>Lead de Honda</strong>
                          <p style={{ margin: 0, fontSize: "10.5px", color: "var(--v2-muted)" }}>S/ 42,000</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            />
          )}

          {/* 5. V2WorkCenterTemplate */}
          {activeTemplate === "workcenter" && (
            <V2WorkCenterTemplate
              header={<V2PageHeader title="Consola de Trazabilidad" eyebrow="V2WorkCenterTemplate" />}
              summary={
                <div style={{ display: "flex", gap: 8 }}>
                  <V2StatusBadge tone="success">3 Procesadas</V2StatusBadge>
                  <V2StatusBadge tone="warning">1 En revisión</V2StatusBadge>
                </div>
              }
              queue={
                <V2SectionCard title="Cola de Actividades">
                  <V2DataTable columns={columns} getRowKey={(row) => row.id} rows={rows} />
                </V2SectionCard>
              }
              detail={
                <V2SectionCard title="Detalle del Item">
                  <div style={{ display: "grid", gap: 12 }}>
                    <p className={styles.bodyCompact}><strong>ID:</strong> V2-001</p>
                    <p className={styles.bodyCompact}><strong>Cliente:</strong> Honda del Perú</p>
                    <p className={styles.bodyCompact}><strong>Monto:</strong> S/ 84,500</p>
                  </div>
                </V2SectionCard>
              }
            />
          )}

          {/* 6. V2FullFormTemplate */}
          {activeTemplate === "form" && (
            <V2FullFormTemplate
              header={<V2PageHeader title="Nuevo Registro de Entidad" eyebrow="V2FullFormTemplate" />}
              navigator={
                <V2SectionCard title="Pasos del Formulario">
                  <div style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontSize: "11.5px", fontWeight: "900", color: "var(--v2-indigo)" }}>1. Datos Generales</span>
                    <span style={{ fontSize: "11.5px", color: "var(--v2-muted)" }}>2. Facturación</span>
                  </div>
                </V2SectionCard>
              }
              actions={
                <V2QuickActions cols={2}>
                  <V2Button onClick={() => undefined}>Guardar Registro</V2Button>
                  <V2Button variant="ghost">Cancelar</V2Button>
                </V2QuickActions>
              }
            >
              <V2SectionCard title="Formulario de Datos">
                <div style={{ display: "grid", gap: 16 }}>
                  <V2FormField label="Razón Social" required>
                    <V2Input placeholder="Ingrese empresa..." />
                  </V2FormField>
                  <V2FormField label="Contacto Directo">
                    <V2Input placeholder="Nombre contacto..." />
                  </V2FormField>
                </div>
              </V2SectionCard>
            </V2FullFormTemplate>
          )}

          {/* 7. V2FinancialTableTemplate */}
          {activeTemplate === "financial" && (
            <V2FinancialTableTemplate
              header={<V2PageHeader title="Reporte Financiero" eyebrow="V2FinancialTableTemplate" />}
              summary={
                <div style={{ display: "flex", gap: 8 }}>
                  <V2StatusBadge tone="success">Inflows S/ 140,000</V2StatusBadge>
                </div>
              }
              columns={columns}
              rows={rows}
              getRowKey={(row) => row.id}
            />
          )}

          {/* 8. V2SettingsPageTemplate */}
          {activeTemplate === "settings" && (
            <V2SettingsPageTemplate
              header={<V2PageHeader title="Ajustes de Seguridad" eyebrow="V2SettingsPageTemplate" />}
              tabs={
                <V2Tabs
                  activeId="seg"
                  onChange={() => undefined}
                  items={[
                    { id: "perfil", label: "Perfil" },
                    { id: "seg", label: "Seguridad" },
                  ]}
                />
              }
            >
              <div style={{ display: "grid", gap: 16 }}>
                <V2FormField label="Nueva contraseña" required>
                  <V2Input placeholder="Ingrese password..." />
                </V2FormField>
              </div>
            </V2SettingsPageTemplate>
          )}
        </div>
      </div>

      {/* Modal */}
      <V2Modal onClose={() => setModalOpen(false)} open={modalOpen} title="Showcase Modal">
        <div style={{ display: "grid", gap: 16 }}>
          <p className={styles.bodyCompact}>Este modal cierra al hacer clic afuera o al presionar la tecla Escape.</p>
          <V2Button onClick={() => setModalOpen(false)}>Cerrar</V2Button>
        </div>
      </V2Modal>

      {/* Drawer */}
      <V2Drawer onClose={() => setDrawerOpen(false)} open={drawerOpen} title="Showcase Cajón">
        <div style={{ display: "grid", gap: 16 }}>
          <p className={styles.bodyCompact}>Este cajón lateral (420px) soporta cierre Escape y clics en el overlay.</p>
          <V2Button onClick={() => setDrawerOpen(false)}>Cerrar</V2Button>
        </div>
      </V2Drawer>
    </>
  )
}

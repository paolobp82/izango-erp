"use client"

import { useMemo, useState } from "react"
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ContextTabs,
  DataTable,
  Detail360Template,
  DetailPanel,
  EntityHeader,
  FinancialTableTemplate,
  FilterBar,
  FilterChip,
  FormField,
  FullFormTemplate,
  Input,
  KanbanPageTemplate,
  ListPageTemplate,
  ModuleDashboardTemplate,
  ModuleEmptyState,
  ModuleErrorState,
  ModuleLoadingState,
  ModuleToolbar,
  PageHeader,
  ProgressSummary,
  SearchInput,
  SectionNavigator,
  Select,
  SettingsPageTemplate,
  StickyActionBar,
  SummaryStrip,
  Textarea,
  Toggle,
  ViewSwitcher,
  WidgetContainer,
  WorkCenterTemplate,
  useTheme,
  type DataTableColumn,
} from "@/components/design-system"

type ClienteDemo = { id: string; cliente: string; ruc: string; contacto: string; proyecto: string; estado: string; venta: string }
type RqDemo = { codigo: string; proveedor: string; categoria: string; estado: string; monto: string; vencimiento: string }

const clientes: ClienteDemo[] = [
  { id: "CLI-001", cliente: "Honda del Perú", ruc: "20100130204", contacto: "María Calderón", proyecto: "BTL lanzamiento motos", estado: "Activo", venta: "S/ 84,500" },
  { id: "CLI-002", cliente: "Ripley", ruc: "20337564373", contacto: "Carlos Mendoza", proyecto: "Campaña retail verano", estado: "Activo", venta: "S/ 56,200" },
  { id: "CLI-003", cliente: "Mall Aventura", ruc: "20552443210", contacto: "Andrea Ruiz", proyecto: "Activación familiar", estado: "En revisión", venta: "S/ 41,900" },
]

const rqs: RqDemo[] = [
  { codigo: "RQ-2026-00128", proveedor: "Producciones Selva", categoria: "Producción", estado: "programado", monto: "S/ 12,800", vencimiento: "Hoy" },
  { codigo: "RQ-2026-00142", proveedor: "Logística Norte", categoria: "Traslado", estado: "aprobado", monto: "S/ 4,650", vencimiento: "7 días" },
  { codigo: "RQ-2026-00157", proveedor: "Visual Pro", categoria: "Audiovisual", estado: "pendiente", monto: "S/ 8,200", vencimiento: "Vencido" },
]

const clienteColumns: DataTableColumn<ClienteDemo>[] = [
  { key: "cliente", header: "Cliente", render: (row) => <strong>{row.cliente}</strong> },
  { key: "ruc", header: "RUC" },
  { key: "contacto", header: "Contacto" },
  { key: "proyecto", header: "Proyecto BTL" },
  { key: "estado", header: "Estado", render: (row) => <Badge tone={row.estado === "Activo" ? "success" : "warning"}>{row.estado}</Badge> },
  { key: "venta", header: "Venta", align: "right" },
]

const rqColumns: DataTableColumn<RqDemo>[] = [
  { key: "codigo", header: "RQ" },
  { key: "proveedor", header: "Proveedor" },
  { key: "categoria", header: "Categoría" },
  { key: "estado", header: "Estado", render: (row) => <Badge tone={row.estado === "programado" ? "info" : row.estado === "aprobado" ? "success" : "warning"}>{row.estado}</Badge> },
  { key: "vencimiento", header: "Vencimiento" },
  { key: "monto", header: "Monto", align: "right" },
]

export default function DesignSystemPage() {
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState("listado")
  const [search, setSearch] = useState("")
  const [view, setView] = useState("tabla")
  const [enabled, setEnabled] = useState(true)

  const filteredClientes = useMemo(
    () => clientes.filter((cliente) => [cliente.cliente, cliente.ruc, cliente.proyecto].join(" ").toLowerCase().includes(search.toLowerCase())),
    [search]
  )

  const header = (
    <PageHeader
      eyebrow="Design System"
      title="Module Template System v1.0"
      description="Plantillas visuales reutilizables para módulos operativos, comerciales y financieros del ERP."
      actions={[{ label: theme === "light" ? "Modo oscuro" : "Modo claro", onClick: toggleTheme, variant: "secondary" }]}
    />
  )

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {header}
      <ContextTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "listado", label: "Clientes", count: 3 },
          { value: "360", label: "Cliente 360" },
          { value: "dashboard", label: "Dashboard" },
          { value: "kanban", label: "Kanban" },
          { value: "work", label: "Work Center" },
          { value: "form", label: "Formulario" },
          { value: "finance", label: "Tabla financiera" },
          { value: "settings", label: "Settings" },
          { value: "states", label: "Estados" },
        ]}
      />

      {tab === "listado" && (
        <ListPageTemplate
          header={<PageHeader title="Listado de Clientes" description="Vista estándar para módulos con búsqueda, filtros y acciones." actions={[{ label: "Nuevo cliente", href: "/clientes/nuevo" }]} />}
          summary={<SummaryStrip metrics={[{ label: "Clientes", value: "3" }, { label: "Pipeline", value: "S/ 182,600" }, { label: "Activos", value: "2" }, { label: "En revisión", value: "1" }]} />}
          toolbar={<FilterBar actions={<ViewSwitcher value={view} onChange={setView} views={[{ value: "tabla", label: "Tabla" }, { value: "cards", label: "Cards" }]} />}><SearchInput value={search} onChange={setSearch} placeholder="Buscar cliente, RUC o proyecto" /><FilterChip label="Activos" active /><FilterChip label="Retail" /></FilterBar>}
          table={<DataTable columns={clienteColumns} rows={filteredClientes} rowKey="id" />}
        />
      )}

      {tab === "360" && (
        <Detail360Template
          header={<EntityHeader title="Honda del Perú" subtitle="Cliente estratégico · RUC 20100130204" status={<Badge tone="success">Activo</Badge>} actions={[{ label: "Crear proyecto", href: "/proyectos/nuevo" }, { label: "Editar", variant: "secondary" }]} />}
          tabs={<ContextTabs value="resumen" onChange={() => undefined} tabs={[{ value: "resumen", label: "Resumen" }, { value: "proyectos", label: "Proyectos", count: 4 }, { value: "finanzas", label: "Finanzas" }]} />}
        >
          <DetailPanel
            title="Resumen comercial"
            aside={<><div className="iz-label">Próxima acción</div><p className="iz-body">Enviar propuesta de activación BTL para campaña de motos.</p><ProgressSummary steps={["CRM", "Propuesta", "Proyecto", "Cierre"]} current={2} /></>}
          >
            <SummaryStrip metrics={[{ label: "Facturado", value: "S/ 84,500" }, { label: "Cobrado", value: "S/ 42,000" }, { label: "Pendiente", value: "S/ 42,500" }]} />
          </DetailPanel>
        </Detail360Template>
      )}

      {tab === "dashboard" && (
        <ModuleDashboardTemplate
          header={<PageHeader title="Dashboard Financiero" description="Composición para KPIs, alertas y widgets ejecutivos." />}
          summary={<SummaryStrip metrics={[{ label: "Caja disponible", value: "S/ 126,400" }, { label: "Por cobrar", value: "S/ 58,100" }, { label: "Pagos hoy", value: "S/ 18,750" }, { label: "Liquidez", value: "Estable" }]} />}
          widgets={<><WidgetContainer title="Ingresos vs egresos" period="Julio 2026"><div style={{ height: 160, display: "grid", placeItems: "center", color: "var(--iz-color-text-muted)" }}>Área reservada para gráfico real</div></WidgetContainer><WidgetContainer title="Alertas"><ModuleErrorState message="2 pagos vencidos requieren revisión." /></WidgetContainer></>}
        />
      )}

      {tab === "kanban" && (
        <KanbanPageTemplate
          header={<PageHeader title="CRM Kanban" description="Columnas consistentes para oportunidades comerciales." />}
          toolbar={<ModuleToolbar><SearchInput value={search} onChange={setSearch} placeholder="Buscar oportunidad" /></ModuleToolbar>}
          columns={<div style={{ display: "grid", gridTemplateColumns: "repeat(7, 238px)", gap: 12 }}>{["Nuevo", "Contactado", "Reunión", "Propuesta", "Negociación", "Ganado", "Perdido"].map((stage, index) => <Card key={stage} style={{ minHeight: 220 }}><div className="iz-label">{stage}</div><p className="iz-body">{index < 3 ? "Ripley · S/ 56,200" : "Sin oportunidades"}</p></Card>)}</div>}
        />
      )}

      {tab === "work" && (
        <WorkCenterTemplate
          header={<PageHeader title="Centro de aprobación de RQ" description="Bandeja de trabajo con detalle lateral." />}
          summary={<SummaryStrip metrics={[{ label: "Pendientes", value: "18" }, { label: "Vencidos", value: "3" }, { label: "Hoy", value: "5" }]} />}
          queue={<DataTable columns={rqColumns} rows={rqs} rowKey="codigo" />}
          detail={<Card><div className="iz-label">Detalle RQ</div><p className="iz-body">Validar proveedor, monto, fecha de necesidad y evidencia adjunta.</p><Button>Revisar</Button></Card>}
        />
      )}

      {tab === "form" && (
        <FullFormTemplate
          header={<PageHeader title="Formulario de Proveedor" description="Estructura para formularios completos con navegación y acciones fijas." />}
          navigator={<SectionNavigator sections={[{ id: "empresa", label: "Empresa" }, { id: "contacto", label: "Contacto" }, { id: "bancos", label: "Bancos" }]} />}
          actions={<StickyActionBar><Button variant="secondary">Cancelar</Button><Button>Guardar proveedor</Button></StickyActionBar>}
        >
          <Card id="empresa"><FormField label="Razón social"><Input defaultValue="Producciones Selva SAC" /></FormField><FormField label="RUC"><Input defaultValue="20604578121" /></FormField></Card>
          <Card id="contacto"><FormField label="Contacto"><Input defaultValue="José Manuel" /></FormField><FormField label="Correo"><Input defaultValue="operaciones@proveedor.pe" /></FormField></Card>
          <Card id="bancos"><FormField label="Banco"><Select defaultValue="BCP"><option>BCP</option><option>BBVA</option></Select></FormField><FormField label="Observaciones"><Textarea defaultValue="Proveedor frecuente para proyectos BTL." /></FormField></Card>
        </FullFormTemplate>
      )}

      {tab === "finance" && (
        <FinancialTableTemplate header={<PageHeader title="Tabla financiera de RQ" description="Tabla con columnas financieras y estados." />} summary={<SummaryStrip metrics={[{ label: "Total", value: "S/ 25,650" }, { label: "Programado", value: "S/ 12,800" }, { label: "Pendiente", value: "S/ 8,200" }]} />} columns={rqColumns} rows={rqs} rowKey="codigo" />
      )}

      {tab === "settings" && (
        <SettingsPageTemplate header={<PageHeader title="Configuración de usuario" description="Plantilla para preferencias y parámetros." />} tabs={<ContextTabs value="perfil" onChange={() => undefined} tabs={[{ value: "perfil", label: "Perfil" }, { value: "seguridad", label: "Seguridad" }]} />}>
          <div style={{ display: "grid", gap: 14 }}><Toggle checked={enabled} onChange={setEnabled} label="Notificaciones activas" /><Checkbox label="Recibir correos automáticos" defaultChecked /></div>
        </SettingsPageTemplate>
      )}

      {tab === "states" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <Card><ModuleLoadingState label="Cargando clientes..." /></Card>
          <ModuleEmptyState title="Sin registros" description="No hay resultados para los filtros seleccionados." action={<Button size="sm">Crear registro</Button>} />
          <Card><ModuleErrorState message="No se pudieron cargar los datos del módulo." /></Card>
        </div>
      )}
    </div>
  )
}

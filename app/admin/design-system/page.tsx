"use client"

import { useMemo, useState } from "react"
import {
  Alert,
  ArchiveTabs,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  Divider,
  DrawerForm,
  EmptyState,
  ErrorState,
  FiltersBar,
  FormField,
  Input,
  KpiCard,
  LoadingState,
  ModalForm,
  PermissionState,
  ReadonlyField,
  SectionCard,
  Select,
  SimpleForm,
  Skeleton,
  StatusBadge,
  StickyActions,
  Tabs,
  Textarea,
  Toggle,
  Toolbar,
  ValidationMessage,
  WidgetContainer,
  useTheme,
  type DataTableColumn,
} from "@/components/design-system"

type DemoRow = {
  id: string
  proyecto: string
  estado: string
  responsable: string
  monto: string
}

const rows: DemoRow[] = [
  { id: "IZ-001", proyecto: "Lanzamiento comercial", estado: "En curso", responsable: "Paolo Bastianelli", monto: "S/ 18,450" },
  { id: "IZ-002", proyecto: "Campaña Selva", estado: "Pendiente", responsable: "Angélica Estupiñán", monto: "S/ 7,920" },
  { id: "IZ-003", proyecto: "Producción audiovisual", estado: "Completado", responsable: "Pedro Campos", monto: "S/ 12,300" },
]

export default function DesignSystemPage() {
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState("componentes")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Array<string | number>>([])
  const [search, setSearch] = useState("")

  const filteredRows = useMemo(
    () => rows.filter((row) => row.proyecto.toLowerCase().includes(search.toLowerCase()) || row.responsable.toLowerCase().includes(search.toLowerCase())),
    [search]
  )

  const columns: DataTableColumn<DemoRow>[] = [
    { key: "id", header: "Código", sortable: true, width: 110 },
    { key: "proyecto", header: "Proyecto", sortable: true },
    { key: "estado", header: "Estado", render: (row) => <Badge tone={row.estado === "Completado" ? "success" : row.estado === "Pendiente" ? "warning" : "info"}>{row.estado}</Badge> },
    { key: "responsable", header: "Responsable" },
    { key: "monto", header: "Monto", align: "right" },
  ]

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Toolbar>
        <div>
          <h1 className="iz-display" style={{ margin: 0 }}>Design System v1.0</h1>
          <p className="iz-body" style={{ margin: "6px 0 0", color: "var(--iz-color-text-muted)" }}>
            Infraestructura visual reusable para SIG Izango 360.
          </p>
        </div>
        <div style={{ display: "inline-flex", gap: 8 }}>
          <Button variant="secondary" onClick={toggleTheme}>{theme === "light" ? "Modo oscuro" : "Modo claro"}</Button>
          <Button onClick={() => setDrawerOpen(true)}>Abrir drawer</Button>
        </div>
      </Toolbar>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "componentes", label: "Componentes" },
          { value: "datos", label: "Datos" },
          { value: "estados", label: "Estados" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <KpiCard label="Pipeline" value="S/ 124,800" sub="Mes actual" borderColor="var(--iz-color-brand-400)" icon="chart" />
        <KpiCard label="Pendientes" value="18" sub="Operativos" borderColor="var(--iz-color-warning)" icon="file" />
        <KpiCard label="Caja" value="S/ 42,100" sub="Disponible" borderColor="var(--iz-color-success)" icon="wallet" />
      </div>

      <SectionCard title="Fundamentos">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Card><div className="iz-label">Color</div><div className="iz-heading">Tokens semánticos</div><p className="iz-caption">Brand, superficie, texto, borde y estados.</p></Card>
          <Card><div className="iz-label">Tipografía</div><div className="iz-heading">Hanken Grotesk</div><p className="iz-caption">Display, Heading, Body, Caption, Label, KPI, Table y Mono.</p></Card>
          <Card><div className="iz-label">Layout</div><div className="iz-heading">Espaciado estable</div><p className="iz-caption">Escala común para cards, tablas, formularios y widgets.</p></Card>
        </div>
      </SectionCard>

      {tab === "componentes" && (
        <SectionCard title="Componentes base">
          <div style={{ display: "grid", gap: 18 }}>
            <Toolbar>
              <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                <Button>Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="ghost">Fantasma</Button>
                <Button variant="danger">Peligro</Button>
              </div>
              <Toggle checked={enabled} onChange={setEnabled} label="Activo" />
            </Toolbar>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge tone="brand">Marca</Badge>
              <Badge tone="success">Aprobado</Badge>
              <Badge tone="warning">Pendiente</Badge>
              <Badge tone="danger">Crítico</Badge>
              <StatusBadge label="Completado" type="success" />
              <Avatar name="Paolo Bastianelli" />
            </div>
            <SimpleForm
              actions={
                <>
                  <Button type="button" variant="secondary">Cancelar</Button>
                  <Button type="submit">Guardar</Button>
                </>
              }
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <FormField label="Nombre" required><Input placeholder="Nombre del registro" /></FormField>
                <FormField label="Estado"><Select defaultValue="activo"><option value="activo">Activo</option><option value="pausado">Pausado</option></Select></FormField>
                <FormField label="Notas" help="Texto de ayuda contextual."><Textarea placeholder="Observaciones" /></FormField>
              </div>
              <Checkbox label="Notificar a participantes" defaultChecked />
              <ValidationMessage>Ejemplo de validación visible.</ValidationMessage>
            </SimpleForm>
          </div>
        </SectionCard>
      )}

      {tab === "datos" && (
        <WidgetContainer title="Tabla base" period="Demo local" actions={<Button size="sm" onClick={() => setModalOpen(true)}>Nueva acción</Button>}>
          <DataTable
            columns={columns}
            rows={filteredRows}
            rowKey="id"
            search={search}
            onSearchChange={setSearch}
            pageSize={2}
            selectedKeys={selectedRows}
            onSelectedKeysChange={setSelectedRows}
            bulkActions={[{ label: "Acción masiva", onClick: () => undefined }]}
          />
        </WidgetContainer>
      )}

      {tab === "estados" && (
        <SectionCard title="Estados reutilizables">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <LoadingState />
            <ErrorState detail="Detalle funcional del error para soporte." />
            <PermissionState />
            <EmptyState title="Sin datos" description="Estado vacío con acción opcional." action={<Button size="sm">Crear registro</Button>} />
            <Card><ReadonlyField label="Solo lectura" value="Valor protegido" /><Divider /><Skeleton height={20} /><StickyActions><Button size="sm">Acción fija</Button></StickyActions></Card>
            <Alert tone="info">Alerta informativa con tono semántico.</Alert>
          </div>
        </SectionCard>
      )}

      <ArchiveTabs
        value="activos"
        onChange={() => undefined}
        tabs={[
          { value: "activos", label: "Activos", count: 12 },
          { value: "archivados", label: "Archivados", count: 4 },
          { value: "todos", label: "Todos", count: 16 },
        ]}
      />

      <FiltersBar actions={<Button variant="secondary" size="sm">Limpiar</Button>}>
        <Input placeholder="Buscar en filtros" style={{ maxWidth: 260 }} />
        <Select defaultValue=""><option value="">Todos los estados</option><option value="activo">Activo</option></Select>
      </FiltersBar>

      <DrawerForm open={drawerOpen} title="Drawer Form" subtitle="Formulario lateral reusable" onClose={() => setDrawerOpen(false)} actions={<Button onClick={() => setDrawerOpen(false)}>Guardar</Button>}>
        <FormField label="Campo lateral"><Input placeholder="Dato editable" /></FormField>
        <ReadonlyField label="Responsable" value="Controller" />
      </DrawerForm>

      <ModalForm open={modalOpen} title="Modal Form" onClose={() => setModalOpen(false)} actions={<Button onClick={() => setModalOpen(false)}>Confirmar</Button>}>
        <Alert tone="brand">Modal base preparado para formularios simples.</Alert>
      </ModalForm>
    </div>
  )
}

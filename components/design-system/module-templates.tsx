"use client"

import type { CSSProperties, ReactNode } from "react"
import DataTable, { type DataTableColumn } from "./DataTable"
import EmptyState from "./EmptyState"
import { Badge, Button, Card, ErrorState, Input, LoadingState, Toolbar } from "./base"
import WidgetContainer from "./WidgetContainer"

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info"
type Action = { label: ReactNode; onClick?: () => void; href?: string; variant?: "primary" | "secondary" | "ghost" | "danger" }
type Metric = { label: ReactNode; value: ReactNode; helper?: ReactNode; tone?: Tone }

const pageLayout: CSSProperties = { display: "grid", gap: "var(--iz-space-5)" }

function renderAction(action: Action, index: number) {
  const button = <Button type="button" variant={action.variant || (index === 0 ? "primary" : "secondary")} onClick={action.onClick}>{action.label}</Button>
  return action.href ? <a key={index} href={action.href} style={{ textDecoration: "none" }}>{button}</a> : <span key={index}>{button}</span>
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: Action[] }) {
  return (
    <Toolbar style={{ alignItems: "flex-start" }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow ? <div className="iz-label" style={{ color: "var(--iz-color-brand-700)", marginBottom: 5 }}>{eyebrow}</div> : null}
        <h1 className="iz-display" style={{ margin: 0 }}>{title}</h1>
        {description ? <p className="iz-body" style={{ margin: "6px 0 0", color: "var(--iz-color-text-muted)" }}>{description}</p> : null}
      </div>
      {actions?.length ? <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>{actions.map(renderAction)}</div> : null}
    </Toolbar>
  )
}

export function EntityHeader({ title, subtitle, status, meta, actions }: { title: ReactNode; subtitle?: ReactNode; status?: ReactNode; meta?: ReactNode; actions?: Action[] }) {
  return (
    <Card style={{ display: "grid", gap: "var(--iz-space-4)" }}>
      <Toolbar style={{ alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 className="iz-display" style={{ margin: 0 }}>{title}</h1>
            {status}
          </div>
          {subtitle ? <p className="iz-body" style={{ margin: "6px 0 0", color: "var(--iz-color-text-muted)" }}>{subtitle}</p> : null}
        </div>
        {actions?.length ? <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>{actions.map(renderAction)}</div> : null}
      </Toolbar>
      {meta ? <div style={{ color: "var(--iz-color-text-muted)", fontSize: 13 }}>{meta}</div> : null}
    </Card>
  )
}

export function SummaryStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "var(--iz-space-3)" }}>
      {metrics.map((metric, index) => (
        <Card key={index} style={{ padding: "var(--iz-space-4)" }}>
          <div className="iz-label" style={{ color: "var(--iz-color-text-muted)" }}>{metric.label}</div>
          <div className="iz-kpi" style={{ marginTop: 6 }}>{metric.value}</div>
          {metric.helper ? <div className="iz-caption" style={{ marginTop: 6, color: "var(--iz-color-text-muted)" }}>{metric.helper}</div> : null}
        </Card>
      ))}
    </div>
  )
}

export function ModuleToolbar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <Toolbar style={{ padding: "var(--iz-space-4)", background: "var(--iz-color-surface)", border: "1px solid var(--iz-color-border)", borderRadius: "var(--iz-radius-lg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>{children}</div>
      {actions ? <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </Toolbar>
  )
}

export function SearchInput({ value, onChange, placeholder = "Buscar..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={{ width: 280, maxWidth: "100%" }} />
}

export const FilterBar = ModuleToolbar

export function FilterChip({ label, active, onClick }: { label: ReactNode; active?: boolean; onClick?: () => void }) {
  return <Button type="button" size="sm" variant={active ? "primary" : "secondary"} onClick={onClick}>{label}</Button>
}

export function ViewSwitcher({ views, value, onChange }: { views: { value: string; label: ReactNode }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--iz-color-border)", borderRadius: "var(--iz-radius-md)", overflow: "hidden" }}>
      {views.map((view) => (
        <button key={view.value} type="button" onClick={() => onChange(view.value)} style={{ border: 0, padding: "8px 11px", background: value === view.value ? "var(--iz-color-brand-50)" : "var(--iz-color-surface)", color: value === view.value ? "var(--iz-color-brand-700)" : "var(--iz-color-text-muted)", fontWeight: 800, cursor: "pointer" }}>
          {view.label}
        </button>
      ))}
    </div>
  )
}

export function ContextTabs({ tabs, value, onChange }: { tabs: { value: string; label: ReactNode; count?: number }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, overflowX: "auto", borderBottom: "1px solid var(--iz-color-border)" }}>
      {tabs.map((tab) => (
        <button key={tab.value} type="button" onClick={() => onChange(tab.value)} style={{ border: 0, borderBottom: value === tab.value ? "2px solid var(--iz-color-brand-400)" : "2px solid transparent", background: "transparent", color: value === tab.value ? "var(--iz-color-brand-700)" : "var(--iz-color-text-muted)", padding: "12px 14px", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
          {tab.label}{typeof tab.count === "number" ? ` (${tab.count})` : ""}
        </button>
      ))}
    </div>
  )
}

export function DetailPanel({ title, children, aside }: { title?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 340px)", gap: "var(--iz-space-4)", alignItems: "start" }}>
      <Card>{title ? <h2 className="iz-heading" style={{ margin: "0 0 14px" }}>{title}</h2> : null}{children}</Card>
      {aside ? <Card>{aside}</Card> : null}
    </div>
  )
}

export function StickyActionBar({ children }: { children: ReactNode }) {
  return <div style={{ position: "sticky", bottom: 0, zIndex: 5, display: "flex", justifyContent: "flex-end", gap: 8, padding: "var(--iz-space-3)", background: "var(--iz-color-surface)", border: "1px solid var(--iz-color-border)", borderRadius: "var(--iz-radius-lg)", boxShadow: "var(--iz-shadow-md)" }}>{children}</div>
}

export function SectionNavigator({ sections }: { sections: { id: string; label: ReactNode }[] }) {
  return <Card style={{ display: "grid", gap: 8, padding: "var(--iz-space-3)" }}>{sections.map((section) => <a key={section.id} href={`#${section.id}`} style={{ color: "var(--iz-color-text-muted)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>{section.label}</a>)}</Card>
}

export function ProgressSummary({ steps, current }: { steps: string[]; current: number }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{steps.map((step, index) => <Badge key={step} tone={index < current ? "success" : index === current ? "brand" : "neutral"}>{step}</Badge>)}</div>
}

export function ModuleEmptyState(props: { title: string; description?: string; action?: ReactNode }) {
  return <EmptyState {...props} />
}

export function ModuleLoadingState({ label }: { label?: string }) {
  return <LoadingState label={label} />
}

export function ModuleErrorState({ message }: { message?: ReactNode }) {
  return <ErrorState detail={message} />
}

export function ListPageTemplate({ header, summary, toolbar, table }: { header: ReactNode; summary?: ReactNode; toolbar?: ReactNode; table: ReactNode }) {
  return <div style={pageLayout}>{header}{summary}{toolbar}{table}</div>
}

export function Detail360Template({ header, tabs, children }: { header: ReactNode; tabs?: ReactNode; children: ReactNode }) {
  return <div style={pageLayout}>{header}{tabs}{children}</div>
}

export function ModuleDashboardTemplate({ header, summary, widgets }: { header: ReactNode; summary?: ReactNode; widgets: ReactNode }) {
  return <div style={pageLayout}>{header}{summary}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--iz-space-4)" }}>{widgets}</div></div>
}

export function KanbanPageTemplate({ header, toolbar, columns }: { header: ReactNode; toolbar?: ReactNode; columns: ReactNode }) {
  return <div style={pageLayout}>{header}{toolbar}<div style={{ overflowX: "auto", paddingBottom: 8 }}>{columns}</div></div>
}

export function WorkCenterTemplate({ header, summary, queue, detail }: { header: ReactNode; summary?: ReactNode; queue: ReactNode; detail?: ReactNode }) {
  return <div style={pageLayout}>{header}{summary}<div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 420px)", gap: "var(--iz-space-4)" }}>{queue}{detail}</div></div>
}

export function FullFormTemplate({ header, navigator, children, actions }: { header: ReactNode; navigator?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return <div style={pageLayout}>{header}<div style={{ display: "grid", gridTemplateColumns: navigator ? "220px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: "var(--iz-space-4)", alignItems: "start" }}>{navigator}{children}</div>{actions}</div>
}

export function FinancialTableTemplate<T>({ header, summary, columns, rows, rowKey }: { header: ReactNode; summary?: ReactNode; columns: DataTableColumn<T>[]; rows: T[]; rowKey: keyof T | ((row: T, index: number) => string | number) }) {
  return <div style={pageLayout}>{header}{summary}<DataTable columns={columns} rows={rows} rowKey={rowKey} /></div>
}

export function SettingsPageTemplate({ header, tabs, children }: { header: ReactNode; tabs?: ReactNode; children: ReactNode }) {
  return <div style={pageLayout}>{header}{tabs}<WidgetContainer title="Configuración">{children}</WidgetContainer></div>
}

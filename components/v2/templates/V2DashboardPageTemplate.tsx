import type { ReactNode } from "react"
import { V2PageHeader } from "../system/V2PageHeader"
import { V2LoadingState } from "../system/V2LoadingState"
import { V2EmptyState } from "../system/V2EmptyState"
import { V2ErrorState } from "../system/V2ErrorState"
import styles from "./V2Templates.module.css"

export type V2DashboardPageState = "ready" | "loading" | "empty" | "error"
export type V2DashboardPageDensity = "comfortable" | "compact"
export type V2DashboardPageContentWidth = "contained" | "full"

export type V2DashboardPageTemplateProps = {
  breadcrumb?: ReactNode
  eyebrow?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  statusBadge?: ReactNode
  actions?: ReactNode
  secondaryActions?: ReactNode
  filters?: ReactNode
  kpis?: ReactNode
  children?: ReactNode
  sidebar?: ReactNode
  summary?: ReactNode
  footer?: ReactNode
  auxiliary?: ReactNode
  state?: V2DashboardPageState
  loadingState?: ReactNode
  emptyState?: ReactNode
  errorState?: ReactNode
  density?: V2DashboardPageDensity
  contentWidth?: V2DashboardPageContentWidth
  className?: string

  // Prop de compatibilidad con prototipos previos
  header?: ReactNode
}

export function V2DashboardPageTemplate({
  actions,
  auxiliary,
  breadcrumb,
  children,
  className,
  contentWidth = "contained",
  density = "comfortable",
  emptyState,
  errorState,
  eyebrow,
  filters,
  footer,
  header,
  kpis,
  loadingState,
  secondaryActions,
  sidebar,
  state = "ready",
  statusBadge,
  subtitle,
  summary,
  title,
}: V2DashboardPageTemplateProps) {
  const containerClass = `${styles.dashboardRoot} ${
    contentWidth === "contained" ? styles.widthContained : styles.widthFull
  } ${density === "compact" ? styles.densityCompact : styles.densityComfortable} ${
    className || ""
  }`

  const resolvedHeader = header || (title ? (
    <div className={styles.dashboardHeaderWrapper}>
      <V2PageHeader
        actions={
          (actions || secondaryActions) ? (
            <div className={styles.headerActionsGroup}>
              {secondaryActions}
              {actions}
            </div>
          ) : undefined
        }
        eyebrow={typeof eyebrow === "string" ? eyebrow : undefined}
        subtitle={typeof subtitle === "string" ? subtitle : undefined}
        title={typeof title === "string" ? title : String(title ?? "")}
      />
      {statusBadge ? <div className={styles.headerBadgeSlot}>{statusBadge}</div> : null}
    </div>
  ) : null)

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          loadingState || (
            <div className={styles.stateWrapper}>
              <V2LoadingState rows={6} variant="card" />
            </div>
          )
        )

      case "empty":
        return (
          emptyState || (
            <div className={styles.stateWrapper}>
              <V2EmptyState
                description="No hay información o métricas disponibles para el periodo seleccionado."
                title="Sin datos en el dashboard"
              />
            </div>
          )
        )

      case "error":
        return (
          errorState || (
            <div className={styles.stateWrapper}>
              <V2ErrorState
                errorCode="500-DASHBOARD"
                title="Error al cargar las métricas del dashboard"
              />
            </div>
          )
        )

      case "ready":
      default:
        return (
          <div className={`${styles.dashboardLayoutGrid} ${sidebar ? styles.hasSidebar : styles.noSidebar}`}>
            <div className={styles.dashboardMainContent}>
              {children}
            </div>

            {sidebar ? (
              <aside className={styles.dashboardSidebar}>{sidebar}</aside>
            ) : null}
          </div>
        )
    }
  }

  return (
    <main className={containerClass}>
      {breadcrumb ? <nav aria-label="Navegación secundaria" className={styles.breadcrumbArea}>{breadcrumb}</nav> : null}

      {resolvedHeader ? <header className={styles.headerArea}>{resolvedHeader}</header> : null}

      {filters ? <section aria-label="Filtros del dashboard" className={styles.filtersArea}>{filters}</section> : null}

      {kpis ? <section aria-label="Métricas principales" className={styles.kpisArea}>{kpis}</section> : null}

      {summary ? <section aria-label="Resumen ejecutivo" className={styles.summaryArea}>{summary}</section> : null}

      <section aria-label="Contenido del dashboard" className={styles.contentArea}>
        {renderContent()}
      </section>

      {auxiliary ? <aside className={styles.auxiliaryArea}>{auxiliary}</aside> : null}

      {footer ? <footer className={styles.dashboardFooterArea}>{footer}</footer> : null}
    </main>
  )
}

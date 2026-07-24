import type { ReactNode } from "react"
import { V2PageHeader } from "../system/V2PageHeader"
import { V2LoadingState } from "../system/V2LoadingState"
import { V2EmptyState } from "../system/V2EmptyState"
import { V2ErrorState } from "../system/V2ErrorState"
import styles from "./V2Templates.module.css"

export type V2ListPageState = "ready" | "loading" | "empty" | "error"
export type V2ListPageDensity = "comfortable" | "compact"
export type V2ListPageContentWidth = "full" | "contained"

export type V2ListPageTemplateProps = {
  title?: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  breadcrumb?: ReactNode
  actions?: ReactNode
  secondaryActions?: ReactNode
  kpis?: ReactNode
  filters?: ReactNode
  children?: ReactNode
  pagination?: ReactNode
  auxiliary?: ReactNode
  state?: V2ListPageState
  loadingState?: ReactNode
  emptyState?: ReactNode
  errorState?: ReactNode
  density?: V2ListPageDensity
  contentWidth?: V2ListPageContentWidth
  className?: string

  // Props de compatibilidad con prototipos previos
  header?: ReactNode
  summary?: ReactNode
  toolbar?: ReactNode
  table?: ReactNode
}

export function V2ListPageTemplate({
  actions,
  auxiliary,
  breadcrumb,
  children,
  className,
  contentWidth = "full",
  density = "comfortable",
  description,
  emptyState,
  errorState,
  eyebrow,
  filters,
  header,
  kpis,
  loadingState,
  pagination,
  secondaryActions,
  state = "ready",
  summary,
  table,
  title,
  toolbar,
}: V2ListPageTemplateProps) {
  const containerClass = `${styles.templateRoot} ${
    contentWidth === "contained" ? styles.widthContained : styles.widthFull
  } ${density === "compact" ? styles.densityCompact : styles.densityComfortable} ${
    className || ""
  }`

  const resolvedHeader = header || (title ? (
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
      subtitle={typeof description === "string" ? description : undefined}
      title={typeof title === "string" ? title : String(title ?? "")}
    />
  ) : null)

  const resolvedKpis = kpis || summary
  const resolvedFilters = filters || toolbar
  const resolvedChildren = children || table

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          loadingState || (
            <div className={styles.stateWrapper}>
              <V2LoadingState rows={4} variant="table" />
            </div>
          )
        )

      case "empty":
        return (
          emptyState || (
            <div className={styles.stateWrapper}>
              <V2EmptyState
                description="No se encontraron registros en esta sección."
                title="Sin datos disponibles"
              />
            </div>
          )
        )

      case "error":
        return (
          errorState || (
            <div className={styles.stateWrapper}>
              <V2ErrorState
                errorCode="500-TEMPLATE"
                title="Error al cargar la información"
              />
            </div>
          )
        )

      case "ready":
      default:
        return resolvedChildren
    }
  }

  return (
    <main className={containerClass}>
      {breadcrumb ? <nav aria-label="Navegación secundaria" className={styles.breadcrumbArea}>{breadcrumb}</nav> : null}

      {resolvedHeader ? <header className={styles.headerArea}>{resolvedHeader}</header> : null}

      {resolvedKpis ? <section aria-label="Indicadores métricos" className={styles.kpisArea}>{resolvedKpis}</section> : null}

      {resolvedFilters ? <section aria-label="Filtros y acciones de lista" className={styles.filtersArea}>{resolvedFilters}</section> : null}

      <section aria-label="Listado principal" className={styles.contentArea}>
        {renderContent()}
      </section>

      {pagination && state === "ready" ? (
        <footer className={styles.paginationArea}>{pagination}</footer>
      ) : null}

      {auxiliary ? <aside className={styles.auxiliaryArea}>{auxiliary}</aside> : null}
    </main>
  )
}

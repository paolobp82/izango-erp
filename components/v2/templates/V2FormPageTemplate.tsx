import type { ReactNode } from "react"
import { V2PageHeader } from "../system/V2PageHeader"
import { V2LoadingState } from "../system/V2LoadingState"
import { V2EmptyState } from "../system/V2EmptyState"
import { V2ErrorState } from "../system/V2ErrorState"
import styles from "./V2Templates.module.css"

export type V2FormPageState = "default" | "loading" | "empty" | "error"
export type V2FormPageDensity = "comfortable" | "compact"
export type V2FormPageContentWidth = "full" | "contained"

export type V2FormPageTemplateProps = {
  breadcrumb?: ReactNode
  eyebrow?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  statusBadge?: ReactNode
  actions?: ReactNode
  secondaryActions?: ReactNode
  children?: ReactNode
  sidebar?: ReactNode
  summary?: ReactNode
  footer?: ReactNode
  auxiliary?: ReactNode
  state?: V2FormPageState
  loadingState?: ReactNode
  emptyState?: ReactNode
  errorState?: ReactNode
  density?: V2FormPageDensity
  contentWidth?: V2FormPageContentWidth
  className?: string

  // Prop de compatibilidad con prototipos previos
  header?: ReactNode
}

export function V2FormPageTemplate({
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
  footer,
  header,
  loadingState,
  secondaryActions,
  sidebar,
  state = "default",
  statusBadge,
  subtitle,
  summary,
  title,
}: V2FormPageTemplateProps) {
  const containerClass = `${styles.formRoot} ${
    contentWidth === "contained" ? styles.widthContained : styles.widthFull
  } ${density === "compact" ? styles.densityCompact : styles.densityComfortable} ${
    className || ""
  }`

  const resolvedHeader = header || (title ? (
    <div className={styles.formHeaderWrapper}>
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
                description="El formulario solicitado no se encuentra disponible o no existe."
                title="Formulario no disponible"
              />
            </div>
          )
        )

      case "error":
        return (
          errorState || (
            <div className={styles.stateWrapper}>
              <V2ErrorState
                errorCode="500-FORM"
                title="Error al cargar el formulario"
              />
            </div>
          )
        )

      case "default":
      default:
        return (
          <div className={`${styles.formLayoutGrid} ${sidebar ? styles.hasSidebar : styles.noSidebar}`}>
            <div className={styles.formMainContent}>
              {children}
            </div>

            {sidebar ? (
              <aside className={styles.formSidebar}>{sidebar}</aside>
            ) : null}
          </div>
        )
    }
  }

  return (
    <main className={containerClass}>
      {breadcrumb ? <nav aria-label="Navegación secundaria" className={styles.breadcrumbArea}>{breadcrumb}</nav> : null}

      {resolvedHeader ? <header className={styles.headerArea}>{resolvedHeader}</header> : null}

      {summary ? <section aria-label="Resumen de formulario" className={styles.summaryArea}>{summary}</section> : null}

      <section aria-label="Cuerpo del formulario" className={styles.contentArea}>
        {renderContent()}
      </section>

      {auxiliary ? <aside className={styles.auxiliaryArea}>{auxiliary}</aside> : null}

      {footer ? <footer className={styles.formFooterArea}>{footer}</footer> : null}
    </main>
  )
}

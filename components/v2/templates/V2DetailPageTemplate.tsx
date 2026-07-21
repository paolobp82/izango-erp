import type { ReactNode } from "react"
import { V2PageHeader } from "../system/V2PageHeader"
import { V2LoadingState } from "../system/V2LoadingState"
import { V2EmptyState } from "../system/V2EmptyState"
import { V2ErrorState } from "../system/V2ErrorState"
import styles from "./V2Templates.module.css"

export type V2DetailPageState = "default" | "loading" | "empty" | "error"
export type V2DetailPageDensity = "comfortable" | "compact"
export type V2DetailPageContentWidth = "full" | "contained"
export type V2DetailPageSidebarPosition = "left" | "right"

export type V2DetailPageTemplateProps = {
  breadcrumb?: ReactNode
  eyebrow?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  statusBadge?: ReactNode
  actions?: ReactNode
  secondaryActions?: ReactNode
  summary?: ReactNode
  tabs?: ReactNode
  children?: ReactNode
  main?: ReactNode
  sidebar?: ReactNode
  sidebarPosition?: V2DetailPageSidebarPosition
  timeline?: ReactNode
  attachments?: ReactNode
  footer?: ReactNode
  auxiliary?: ReactNode
  state?: V2DetailPageState
  loadingState?: ReactNode
  emptyState?: ReactNode
  errorState?: ReactNode
  density?: V2DetailPageDensity
  contentWidth?: V2DetailPageContentWidth
  className?: string

  // Prop de compatibilidad con prototipos previos
  header?: ReactNode
}

export function V2DetailPageTemplate({
  actions,
  attachments,
  auxiliary,
  breadcrumb,
  children,
  className,
  contentWidth = "full",
  density = "comfortable",
  emptyState,
  errorState,
  eyebrow,
  footer,
  header,
  loadingState,
  main,
  secondaryActions,
  sidebar,
  sidebarPosition = "right",
  state = "default",
  statusBadge,
  subtitle,
  summary,
  tabs,
  timeline,
  title,
}: V2DetailPageTemplateProps) {
  const containerClass = `${styles.detailRoot} ${
    contentWidth === "contained" ? styles.widthContained : styles.widthFull
  } ${density === "compact" ? styles.densityCompact : styles.densityComfortable} ${
    className || ""
  }`

  const resolvedHeader = header || (title ? (
    <div className={styles.detailHeaderWrapper}>
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

  const resolvedMain = children || main

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          loadingState || (
            <div className={styles.stateWrapper}>
              <V2LoadingState rows={6} variant="table" />
            </div>
          )
        )

      case "empty":
        return (
          emptyState || (
            <div className={styles.stateWrapper}>
              <V2EmptyState
                description="No se encontró la información o el registro no existe."
                title="Detalle no disponible"
              />
            </div>
          )
        )

      case "error":
        return (
          errorState || (
            <div className={styles.stateWrapper}>
              <V2ErrorState
                errorCode="500-DETAIL"
                title="Error al cargar el detalle"
              />
            </div>
          )
        )

      case "default":
      default:
        return (
          <div
            className={`${styles.detailLayoutGrid} ${
              sidebarPosition === "left" ? styles.sidebarLeft : styles.sidebarRight
            }`}
          >
            {sidebar && sidebarPosition === "left" ? (
              <aside className={styles.detailSidebar}>{sidebar}</aside>
            ) : null}

            <div className={styles.detailMainContent}>
              {resolvedMain}
              {timeline ? <section aria-label="Cronograma de actividad" className={styles.detailTimelineSection}>{timeline}</section> : null}
              {attachments ? <section aria-label="Archivos adjuntos" className={styles.detailAttachmentsSection}>{attachments}</section> : null}
            </div>

            {sidebar && sidebarPosition === "right" ? (
              <aside className={styles.detailSidebar}>{sidebar}</aside>
            ) : null}
          </div>
        )
    }
  }

  return (
    <main className={containerClass}>
      {breadcrumb ? <nav aria-label="Navegación secundaria" className={styles.breadcrumbArea}>{breadcrumb}</nav> : null}

      {resolvedHeader ? <header className={styles.headerArea}>{resolvedHeader}</header> : null}

      {summary ? <section aria-label="Resumen de indicadores" className={styles.summaryArea}>{summary}</section> : null}

      {tabs ? <nav aria-label="Pestañas de navegación de detalle" className={styles.tabsArea}>{tabs}</nav> : null}

      <section aria-label="Contenido principal del detalle" className={styles.contentArea}>
        {renderContent()}
      </section>

      {auxiliary ? <aside className={styles.auxiliaryArea}>{auxiliary}</aside> : null}

      {footer ? <footer className={styles.detailFooterArea}>{footer}</footer> : null}
    </main>
  )
}

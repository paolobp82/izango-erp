"use client"

import { AlertTriangle } from "lucide-react"
import Link from "next/link"
import styles from "./V2System.module.css"

export type V2AlertCardProps = {
  tipo: "warning" | "info" | "hot"
  message: string
  actionLabel?: string
  href?: string
  onClick?: () => void
}

export function V2AlertCard({
  tipo,
  message,
  actionLabel = "Ver",
  href,
  onClick,
}: V2AlertCardProps) {
  const alertClass =
    tipo === "hot"
      ? styles.alertCardHot
      : tipo === "warning"
      ? styles.alertCardWarning
      : styles.alertCardInfo

  const content = (
    <>
      <span className={styles.alertCardIconCompact}>
        <AlertTriangle size={13} />
      </span>
      <span className={styles.alertCardTextCompact}>{message}</span>
      <span className={styles.alertCardActionCompact}>{actionLabel}</span>
    </>
  )

  if (href) {
    return (
      <Link className={`${styles.alertCardCompact} ${alertClass}`} href={href}>
        {content}
      </Link>
    )
  }

  return (
    <div className={`${styles.alertCardCompact} ${alertClass}`} onClick={onClick} role="button" tabIndex={0}>
      {content}
    </div>
  )
}

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

type V2PageHeaderProps = {
  actions?: ReactNode
  eyebrow?: string
  subtitle?: string
  title: string
}

export function V2PageHeader({ actions, eyebrow, subtitle, title }: V2PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.toolbarGroup}>{actions}</div> : null}
    </header>
  )
}

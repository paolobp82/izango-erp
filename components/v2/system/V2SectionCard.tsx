import type { ReactNode } from "react"
import styles from "./V2System.module.css"

type V2SectionCardProps = {
  action?: ReactNode
  children: ReactNode
  description?: string
  title: string
}

export function V2SectionCard({ action, children, description, title }: V2SectionCardProps) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionCardHeader}>
        <div>
          <h2 className={styles.sectionCardTitle}>{title}</h2>
          {description ? <p className={styles.sectionCardDescription}>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

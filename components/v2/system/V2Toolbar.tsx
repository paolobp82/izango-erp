import type { ReactNode } from "react"
import styles from "./V2System.module.css"

type V2ToolbarProps = {
  primary: ReactNode
  secondary?: ReactNode
}

export function V2Toolbar({ primary, secondary }: V2ToolbarProps) {
  return (
    <section className={styles.toolbar} aria-label="Barra de herramientas V2">
      <div className={styles.toolbarGroup}>{primary}</div>
      {secondary ? <div className={styles.toolbarGroup}>{secondary}</div> : null}
    </section>
  )
}

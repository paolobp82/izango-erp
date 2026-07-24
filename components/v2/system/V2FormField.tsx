"use client"

import type { ReactNode } from "react"
import styles from "./V2System.module.css"

export type V2FormFieldProps = {
  label: string
  error?: string
  required?: boolean
  help?: string
  children: ReactNode
}

export function V2FormField({
  label,
  error,
  required = false,
  help,
  children,
}: V2FormFieldProps) {
  return (
    <div className={styles.formField}>
      <label className={styles.formLabel}>
        <span>{label}</span>
        {required && <span className={styles.formRequiredStar}>*</span>}
      </label>
      {children}
      {error && <span className={styles.formError}>{error}</span>}
      {!error && help && <span className={styles.formHelpText}>{help}</span>}
    </div>
  )
}

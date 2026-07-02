"use client"

import type { ReactNode } from "react"
import MasterPage from "./MasterPage"

type PagePatternProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  summary?: ReactNode
  filters?: ReactNode
  tabs?: ReactNode
  children: ReactNode
}

export default function PagePattern({
  title,
  description,
  eyebrow,
  actions,
  summary,
  filters,
  tabs,
  children,
}: PagePatternProps) {
  return (
    <MasterPage title={title} subtitle={description} eyebrow={eyebrow} actions={actions}>
      <div style={{ display: "grid", gap: 18 }}>
        {summary}
        {filters}
        {tabs}
        {children}
      </div>
    </MasterPage>
  )
}

"use client"
import { ReactNode } from "react"
import AppLayout from "@/components/layout/AppLayout"
export default function BibliotecaLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}

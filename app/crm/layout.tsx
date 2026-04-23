import { ReactNode } from "react"
import AppLayout from "@/components/layout/AppLayout"
export default function CRMLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
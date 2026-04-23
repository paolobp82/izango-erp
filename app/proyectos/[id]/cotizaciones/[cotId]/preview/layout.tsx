import { ReactNode } from "react"
import AppLayout from "@/components/layout/AppLayout"
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}

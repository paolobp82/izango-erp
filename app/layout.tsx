import type { Metadata } from "next"
import "./globals.css"
import AppLayout from "@/components/layout/AppLayout"

export const metadata: Metadata = { title: "Izango ERP", description: "Sistema de gestion Izango 360" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
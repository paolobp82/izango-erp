import type { Metadata } from "next"
import "./globals.css"
export const metadata: Metadata = { title: "Izango ERP", description: "Sistema de gestion Izango 360" }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body className="bg-gray-50 text-gray-900">{children}</body></html>
}
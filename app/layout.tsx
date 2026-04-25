import type { Metadata } from "next"
import "./globals.css"
import AppLayout from "@/components/layout/AppLayout"

const LOGO_URL = "https://oernvcmmbkmscpfrmwja.supabase.co/storage/v1/object/public/assets/Mesa%20de%20trabajo%201.png"

export const metadata: Metadata = {
  title: "Izango ERP",
  description: "Sistema de gestion Izango 360",
  icons: { icon: LOGO_URL, apple: LOGO_URL }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href={LOGO_URL} />
      </head>
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
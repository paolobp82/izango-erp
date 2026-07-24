"use client"
import { usePathname } from "next/navigation"
import { V2AppShell } from "@/components/v2/layout"

/**
 * AppLayout — Shell global unificado.
 *
 * Regla única:
 *   - Rutas públicas (/login, /reset-password, /auth/*) → sin layout.
 *   - Toda ruta autenticada → V2AppShell (Sidebar V2 + Topbar V2 + Content V2).
 *
 * La autenticación, carga de perfil y redirect a /login son responsabilidad
 * de V2AppShell. No se duplica esa lógica aquí.
 *
 * NOTA: El shell legacy (Sidebar antiguo + header inline) fue eliminado.
 * Los módulos de negocio aún no migrados se renderizan dentro del área de
 * contenido del nuevo shell sin modificar su lógica interna.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname?.startsWith("/auth")

  if (isPublicRoute) return <>{children}</>

  return <V2AppShell>{children}</V2AppShell>
}

"use client"

import { usePathname } from "next/navigation"

const ITEMS = [
  { href: "/finanzas/dashboard", label: "Resumen ejecutivo" },
  { href: "/finanzas/cuentas-por-cobrar", label: "Cuentas por cobrar" },
  { href: "/finanzas/cuentas-por-pagar", label: "Cuentas por pagar" },
  { href: "/finanzas/rentabilidad", label: "Rentabilidad" },
  { href: "/finanzas/centro-costos", label: "Rentabilidad por Proyecto" },
  { href: "/finanzas/flujo-ejecutivo", label: "Flujo ejecutivo" },
]

export default function FinanceNav() {
  const pathname = usePathname()

  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #E2E8F0", marginBottom: 20, overflowX: "auto" }}>
      {ITEMS.map(item => {
        const active = pathname === item.href
        return (
          <a
            key={item.href}
            href={item.href}
            style={{
              padding: "10px 14px",
              color: active ? "#0F6E56" : "#64748B",
              borderBottom: active ? "2px solid #0F6E56" : "2px solid transparent",
              fontSize: 13,
              fontWeight: active ? 800 : 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </a>
        )
      })}
    </div>
  )
}


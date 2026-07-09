"use client"

import Link from "next/link"

const cards = [
  {
    title: "Bandeja de Pagos",
    description: "Cola operativa del Controller para pagos provenientes de RQP, Administración, Caja Chica y Obligaciones.",
    status: "Base creada",
  },
  {
    title: "Programación",
    description: "Vista futura para ordenar fechas, prioridades, banco origen e impacto en caja.",
    status: "Próximo",
  },
  {
    title: "Pagos Ejecutados",
    description: "Historial operativo con voucher, número de operación y usuario responsable.",
    status: "Próximo",
  },
  {
    title: "Flujo Ejecutivo",
    description: "Vista diaria, semanal y mensual alineada al Excel financiero.",
    status: "Próximo",
  },
]

export default function TesoreriaPage() {
  return (
    <main style={{ padding: 24, display: "grid", gap: 18 }}>
      <div>
        <Link href="/finanzas" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
          ← Finanzas
        </Link>
        <h1 style={{ margin: "10px 0 4px", fontSize: 28, fontWeight: 800, color: "#111827" }}>
          Tesorería
        </h1>
        <p style={{ margin: 0, color: "#6b7280", maxWidth: 820 }}>
          Centro operativo financiero para programar, ejecutar y controlar pagos del grupo.
        </p>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {cards.map(card => (
          <article key={card.title} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16, color: "#111827" }}>{card.title}</h2>
              <span style={{ fontSize: 11, border: "1px solid #d1d5db", borderRadius: 999, padding: "3px 8px", color: "#374151" }}>
                {card.status}
              </span>
            </div>
            <p style={{ margin: "10px 0 0", color: "#6b7280", fontSize: 13, lineHeight: 1.45 }}>
              {card.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}

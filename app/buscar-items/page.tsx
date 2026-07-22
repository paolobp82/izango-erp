"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BuscarItemsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const query = window.location.search.replace(/^\?/, "")
    router.replace(`/biblioteca?tab=cotizados${query ? `&${query}` : ""}`)
  }, [router])

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>
        Redirigiendo a Biblioteca de Ítems…
      </div>
    </div>
  )
}

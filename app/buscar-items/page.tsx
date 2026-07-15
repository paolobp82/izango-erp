"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BuscarItemsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const query = window.location.search.replace(/^\?/, "")
    router.replace(`/biblioteca?tab=cotizados${query ? `&${query}` : ""}`)
  }, [router])

  return <div style={{ color: "#6b7280", padding: 24 }}>Redirigiendo a Biblioteca de Ítems...</div>
}

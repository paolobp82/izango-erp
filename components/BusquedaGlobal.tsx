"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { buscarItemsCotizados } from "@/lib/quote-item-search"
import { filtrarPorAlcance } from "@/lib/permisos"

const TIPOS: Record<string, { icon: string, color: string }> = {
  proyecto:    { icon: "📁", color: "#1e40af" },
  cliente:     { icon: "🏢", color: "#15803d" },
  proveedor:   { icon: "🔧", color: "#9a3412" },
  cotizacion:  { icon: "📄", color: "#6d28d9" },
  item_cotizacion: { icon: "🔎", color: "#0f766e" },
  factura:     { icon: "🧾", color: "#166534" },
  lead:        { icon: "🎯", color: "#d97706" },
}

function normalizarTextoBusqueda(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function aliasesBusquedaCotizacion(query: string) {
  const normalized = normalizarTextoBusqueda(query)
  const aliases = new Set([query])
  if (normalized.includes("proforma")) {
    aliases.add(query.replace(/proforma/gi, "cotizacion"))
    aliases.add(query.replace(/proformas/gi, "cotizaciones"))
  }
  if (normalized.includes("cotizacion")) {
    aliases.add(query.replace(/cotizaci[oó]n/gi, "proforma"))
    aliases.add(query.replace(/cotizaciones/gi, "proformas"))
  }
  return Array.from(aliases).filter(Boolean)
}

export default function BusquedaGlobal() {
  const supabase = createClient()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) { setResultados([]); setOpen(false); return }
    timerRef.current = setTimeout(() => buscar(query.trim()), 350)
  }, [query])

  async function buscar(q: string) {
    setLoading(true)
    const like = `%${q}%`
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = user ? await supabase.from("perfiles").select("*").eq("id", user.id).single() : { data: null }
    const [
      { data: proyectos },
      { data: clientes },
      { data: proveedores },
      { data: facturas },
      { data: leads },
    ] = await Promise.all([
      supabase.from("proyectos").select("id, nombre, codigo, estado, productor_id").is("deleted_at", null).or(`nombre.ilike.${like},codigo.ilike.${like}`).limit(8),
      supabase.from("clientes").select("id, razon_social, ruc").or(`razon_social.ilike.${like},ruc.ilike.${like}`).limit(4),
      supabase.from("proveedores").select("id, nombre, ruc").or(`nombre.ilike.${like},ruc.ilike.${like}`).limit(3),
      supabase.from("facturas").select("id, numero_factura, estado").ilike("numero_factura", like).limit(3),
      supabase.from("crm_leads").select("id, razon_social, estado").ilike("razon_social", like).limit(3),
    ])
    const itemsCotizacionResults = await Promise.all(aliasesBusquedaCotizacion(q).map(alias => buscarItemsCotizados(supabase, { query: alias, limit: 6 })))
    const itemsCotizacion = Array.from(
      new Map(itemsCotizacionResults.flatMap(result => result.data || []).map((item: any) => [item.id, item])).values()
    )

    const res: any[] = [
      ...filtrarPorAlcance(proyectos || [], perfil, "proyectos", { usuarioId: user?.id }).slice(0, 4).map(p => ({ tipo: "proyecto", titulo: p.nombre, subtitulo: p.codigo + " · " + p.estado, href: "/proyectos/" + p.id })),
      ...(clientes || []).map(c => ({ tipo: "cliente", titulo: c.razon_social, subtitulo: c.ruc || "Sin RUC", href: "/clientes" })),
      ...(proveedores || []).map(p => ({ tipo: "proveedor", titulo: p.nombre, subtitulo: p.ruc || "Sin RUC", href: "/proveedores" })),
      ...(facturas || []).map(f => ({ tipo: "factura", titulo: f.numero_factura, subtitulo: "Estado: " + f.estado, href: "/facturacion" })),
      ...(leads || []).map(l => ({ tipo: "lead", titulo: l.razon_social, subtitulo: "CRM · " + l.estado, href: "/crm" })),
      ...(itemsCotizacion || []).map((item: any) => {
        const cot = item.cotizacion
        const proy = cot?.proyecto
        return {
          tipo: "item_cotizacion",
          titulo: item.descripcion,
          subtitulo: `${proy?.codigo || "Proyecto"} · ${proy?.nombre || "Sin proyecto"} · Cotización V${cot?.version || "?"}`,
          href: cot?.proyecto_id && cot?.id ? `/proyectos/${cot.proyecto_id}/cotizaciones/${cot.id}` : "/buscar-items",
        }
      }),
    ]

    setResultados(res)
    setOpen(res.length > 0)
    setLoading(false)
  }

  function navegar(href: string) {
    setQuery("")
    setOpen(false)
    setResultados([])
    router.push(href)
  }

  return (
    <div ref={ref} style={{ position: "relative", width: 320 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => resultados.length > 0 && setOpen(true)}
          placeholder="Buscar proyectos, clientes, ítems..."
          style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#f9fafb", boxSizing: "border-box" }}
        />
        {loading && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9ca3af" }}>...</span>}
      </div>

      {open && resultados.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 400, overflowY: "auto" }}>
          {resultados.map((r, i) => {
            const t = TIPOS[r.tipo] || { icon: "•", color: "#6b7280" }
            return (
              <div key={i} onClick={() => navegar(r.href)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: i < resultados.length - 1 ? "1px solid #f3f4f6" : "none" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.titulo}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.subtitulo}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: t.color, background: t.color + "20", padding: "2px 6px", borderRadius: 4, flexShrink: 0, textTransform: "capitalize" }}>{r.tipo}</span>
              </div>
            )
          })}
        </div>
      )}

      {open && query.length >= 2 && resultados.length === 0 && !loading && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, padding: "16px 14px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  )
}

@"
"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const ESTADO_LABEL: Record<string, string> = {
  pendiente_aprobacion: "Pendiente", aprobado: "Aprobado", en_curso: "En curso",
  terminado: "Terminado", facturado: "Facturado", liquidado: "Liquidado",
}

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre, apellido)")
      .order("created_at", { ascending: false })
    setProyectos(data || [])
    setLoading(false)
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm("¿Eliminar el proyecto " + nombre + "? Esta acción no se puede deshacer.")) return
    setEliminando(id)
    const { data: cots } = await supabase.from("cotizaciones").select("id").eq("proyecto_id", id)
    if (cots && cots.length > 0) {
      await supabase.from("cotizacion_items").delete().in("cotizacion_id", cots.map((c: any) => c.id))
      await supabase.from("cotizaciones").delete().eq("proyecto_id", id)
    }
    await supabase.from("proyectos").delete().eq("id", id)
    setEliminando(null)
    load()
  }

  if (loading) return <div style={{ color: "#6b7280", padding: 24 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>Proyectos</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{proyectos.length} proyectos</p>
        </div>
        <button onClick={() => router.push("/proyectos/nuevo")} className="btn-primary" style={{ fontSize: 13 }}>
          + Nuevo proyecto
        </button>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {proyectos.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No hay proyectos aún</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CÓDIGO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PROYECTO</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CLIENTE</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>PRODUCTOR</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
                <th style={{ padding: "10px 20px", width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p, idx) => {
                const ec: any = { pendiente_aprobacion: { bg: "#fef9c3", color: "#92400e" }, aprobado: { bg: "#dbeafe", color: "#1e40af" }, en_curso: { bg: "#dcfce7", color: "#15803d" }, terminado: { bg: "#f3f4f6", color: "#6b7280" }, facturado: { bg: "#f5f3ff", color: "#6d28d9" }, liquidado: { bg: "#f3f4f6", color: "#374151" } }
                const e = ec[p.estado] || { bg: "#f3f4f6", color: "#6b7280" }
                const prod = p.productor ? p.productor.nombre + " " + p.productor.apellido : "—"
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{p.codigo}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{p.nombre}</div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{p.cliente?.razon_social || "—"}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{prod}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: e.bg, color: e.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                        {ESTADO_LABEL[p.estado] || p.estado || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => router.push("/proyectos/" + p.id)} className="btn-secondary" style={{ fontSize: 12 }}>Ver</button>
                        <button onClick={() => eliminar(p.id, p.nombre)} disabled={eliminando === p.id}
                          style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                          {eliminando === p.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
"@ | Out-File -LiteralPath "C:\Users\user\Desktop\izango-erp\app\proyectos\page.tsx" -Encoding UTF8 -Force
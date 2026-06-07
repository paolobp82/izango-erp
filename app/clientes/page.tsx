"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { useRouter } from "next/navigation"

const POR_PAGINA = 50

export default function ClientesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [eliminando, setEliminando] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("clientes").select("*").order("razon_social")
    setClientes(data || [])
    setLoading(false)
  }

  const CAMPOS = [
    { key: "razon_social", label: "Razon social", requerido: true },
    { key: "ruc", label: "RUC" },
    { key: "direccion", label: "Direccion" },
    { key: "nombre_contacto", label: "Nombre contacto" },
    { key: "email_contacto", label: "Email contacto" },
    { key: "telefono_contacto", label: "Telefono contacto" },
    { key: "nombre_contacto_admin", label: "Nombre admin" },
    { key: "email_contacto_admin", label: "Email admin" },
    { key: "telefono_contacto_admin", label: "Telefono admin" },
    { key: "banco_1", label: "Banco 1" },
    { key: "numero_cuenta_1", label: "N cuenta 1" },
    { key: "cci_1", label: "CCI 1" },
  ]

  async function importarClientes(registros: any[]) {
    let exitosos = 0
    const errores: string[] = []
    for (const r of registros) {
      try {
        const { error } = await supabase.from("clientes").insert({ ...r, entidad: "peru" })
        if (error) errores.push(r.razon_social + ": " + error.message)
        else exitosos++
      } catch (e: any) {
        errores.push(r.razon_social + ": " + e.message)
      }
    }
    load()
    return { exitosos, errores }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm("¿Eliminar cliente " + nombre + "? Esta acción no se puede deshacer.")) return
    setEliminando(id)
    const { error } = await supabase.from("clientes").delete().eq("id", id)
    if (error) {
      alert("No se puede eliminar este cliente porque tiene proyectos u otros registros asociados.")
    } else {
      load()
    }
    setEliminando(null)
  }

  const totalPaginas = Math.ceil(clientes.length / POR_PAGINA)
  const paginados = clientes.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  if (loading) return <div style={{ color: "#6b7280", fontSize: 13 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Clientes</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{clientes.length} clientes registrados</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ImportExport modulo="clientes" campos={CAMPOS} datos={clientes} onImportar={importarClientes} />
          <a href="/clientes/nuevo" className="btn-primary">+ Nuevo cliente</a>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>RAZON SOCIAL</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>RUC</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>CONTACTO</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>EMAIL</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#6b7280" }}>ESTADO</th>
              <th style={{ padding: "10px 20px", width: 300 }}></th>
            </tr>
          </thead>
          <tbody>
            {clientes.length > 0 ? paginados.map((c: any, idx: number) => (
              <tr key={c.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "12px 20px" }}>
                  <div style={{ fontWeight: 500, color: "#111827" }}>{c.razon_social}</div>
                </td>
                <td style={{ padding: "12px", color: "#9ca3af", fontFamily: "monospace", fontSize: 12 }}>{c.ruc || "—"}</td>
                <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{c.nombre_contacto || "—"}</td>
                <td style={{ padding: "12px", color: "#9ca3af", fontSize: 12 }}>{c.email_contacto || "—"}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ background: c.activo ? "#dcfce7" : "#f3f4f6", color: c.activo ? "#15803d" : "#6b7280", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                    {c.activo !== false ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={{ padding: "12px 20px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={() => router.push(`/clientes/${c.id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Ver / Editar</button>
                    <button onClick={() => router.push(`/proyectos?cliente_id=${c.id}`)} className="btn-secondary" style={{ fontSize: 12 }}>Proyectos</button>
                    <button onClick={() => router.push(`/proyectos/nuevo?cliente_id=${c.id}`)} className="btn-primary" style={{ fontSize: 12 }}>+ Proyecto</button>
                    <button onClick={() => eliminar(c.id, c.razon_social)} disabled={eliminando === c.id}
                      style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #fee2e2", borderRadius: 6, background: "#fff", color: "#dc2626", cursor: "pointer" }}>
                      {eliminando === c.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: "40px 20px", fontSize: 14 }}>
                  No hay clientes. <a href="/clientes/nuevo" style={{ color: "#0F6E56" }}>Agrega el primero</a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPaginas > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "16px 20px", borderTop: "1px solid #f3f4f6" }}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              style={{ padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: pagina === 1 ? "not-allowed" : "pointer", color: pagina === 1 ? "#d1d5db" : "#374151", fontSize: 13 }}>
              Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPagina(n)}
                style={{ padding: "5px 10px", border: "1px solid " + (n === pagina ? "#0F6E56" : "#e5e7eb"), borderRadius: 6, background: n === pagina ? "#0F6E56" : "#fff", color: n === pagina ? "#fff" : "#374151", cursor: "pointer", fontSize: 13, fontWeight: n === pagina ? 700 : 400 }}>
                {n}
              </button>
            ))}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
              style={{ padding: "5px 12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#374151", fontSize: 13 }}>
              Siguiente
            </button>
            <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>{clientes.length} clientes · Pág. {pagina}/{totalPaginas}</span>
          </div>
        )}
      </div>
    </div>
  )
}

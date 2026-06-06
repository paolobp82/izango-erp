"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"

const POR_PAGINA = 50

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)

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
            </tr>
          </thead>
          <tbody>
            {clientes.length > 0 ? paginados.map((c: any, idx: number) => (
              <tr key={c.id} style={{ borderTop: "1px solid #f3f4f6", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "12px 20px" }}>
                  <a href={`/clientes/${c.id}`} style={{ fontWeight: 500, color: "#111827", textDecoration: "none" }}>{c.razon_social}</a>
                </td>
                <td style={{ padding: "12px", color: "#9ca3af", fontFamily: "monospace", fontSize: 12 }}>{c.ruc || "—"}</td>
                <td style={{ padding: "12px", fontSize: 13, color: "#374151" }}>{c.nombre_contacto || "—"}</td>
                <td style={{ padding: "12px", color: "#9ca3af", fontSize: 12 }}>{c.email_contacto || "—"}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ background: c.activo ? "#dcfce7" : "#f3f4f6", color: c.activo ? "#15803d" : "#6b7280", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                    {c.activo !== false ? "Activo" : "Inactivo"}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: "40px 20px", fontSize: 14 }}>
                  No hay clientes. <a href="/clientes/nuevo" style={{ color: "#0F6E56" }}>Agrega el primero</a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import ImportExport from "@/components/ImportExport"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2PageHeader,
  type V2TableColumn,
} from "@/components/v2/system"

export default function UbicacionesPage() {
  const supabase = createClient()
  const [ubicaciones, setUbicaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: "", tipo: "almacen", direccion: "" })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from("inventario_ubicaciones").select("*").order("nombre")
    setUbicaciones(data || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: "", tipo: "almacen", direccion: "" })
    setShowForm(true)
  }

  function abrirEditar(ub: any) {
    setEditando(ub)
    setForm({ nombre: ub.nombre, tipo: ub.tipo, direccion: ub.direccion || "" })
    setShowForm(true)
  }

  async function guardar() {
    if (!form.nombre) { alert("Nombre es obligatorio"); return }
    setSaving(true)
    if (editando) {
      await supabase.from("inventario_ubicaciones").update(form).eq("id", editando.id)
    } else {
      await supabase.from("inventario_ubicaciones").insert({ ...form, activo: true })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from("inventario_ubicaciones").update({ activo: !activo }).eq("id", id)
    load()
  }

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando ubicaciones...
      </div>
    )
  }

  const columns: V2TableColumn<any>[] = [
    {
      key: "nombre",
      header: "Nombre",
      render: (ub) => (
        <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>
          {ub.nombre}
        </span>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (ub) => (
        <span style={{
          background: ub.tipo === "almacen" ? "#dbeafe" : "#fef3c7",
          color: ub.tipo === "almacen" ? "#1e40af" : "#92400e",
          padding: "2px 8px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {ub.tipo === "almacen" ? "🏭 Almacén" : "📍 Punto logístico"}
        </span>
      ),
    },
    {
      key: "direccion",
      header: "Dirección",
      render: (ub) => (
        <span style={{ fontSize: 12.5, color: "var(--v2-muted)" }}>
          {ub.direccion || "—"}
        </span>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      align: "center",
      render: (ub) => (
        <span style={{
          background: ub.activo ? "#d1fae5" : "#fee2e2",
          color: ub.activo ? "#065f46" : "#dc2626",
          padding: "2px 8px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {ub.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      render: (ub) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <V2Button variant="ghost" size="compact" onClick={() => abrirEditar(ub)}>
            Editar
          </V2Button>
          <V2Button
            variant="ghost"
            size="compact"
            onClick={() => toggleActivo(ub.id, ub.activo)}
          >
            {ub.activo ? "Desactivar" : "Activar"}
          </V2Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            eyebrow="Inventario"
            title="Ubicaciones"
            subtitle={`${ubicaciones.length} almacenes y puntos logísticos registrados`}
            actions={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Link href="/inventario" style={{ textDecoration: "none" }}>
                  <V2Button variant="secondary" size="compact">
                    ← Inventario
                  </V2Button>
                </Link>
                <ImportExport
                  modulo="inventario_ubicaciones"
                  campos={[
                    { key: "nombre", label: "Nombre", requerido: true },
                    { key: "tipo", label: "Tipo" },
                    { key: "direccion", label: "Dirección" },
                  ]}
                  datos={ubicaciones}
                  onImportar={async (registros) => {
                    let exitosos = 0
                    const errores: string[] = []
                    for (const r of registros) {
                      const { error } = await supabase.from("inventario_ubicaciones").insert({ ...r, activo: true })
                      if (error) errores.push(r.nombre + ": " + error.message)
                      else exitosos++
                    }
                    load()
                    return { exitosos, errores }
                  }}
                />
                <V2Button variant="primary" onClick={abrirNuevo}>
                  + Nueva ubicación
                </V2Button>
              </div>
            }
          />
        }
        table={
          <V2DataTable
            columns={columns}
            rows={ubicaciones}
            getRowKey={(ub) => ub.id}
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay ubicaciones registradas.
              </div>
            }
          />
        }
      />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 480, boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>{editando ? "Editar ubicación" : "Nueva ubicación"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input style={inp} value={form.nombre} placeholder="Ej: Chorrillos, Oficina, Lima Norte" onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Tipo</label>
                <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="almacen">Almacén</option>
                  <option value="punto_logistico">Punto logístico</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Dirección</label>
                <input style={inp} value={form.direccion} placeholder="Dirección física" onChange={e => setForm({ ...form, direccion: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : editando ? "Actualizar" : "Crear"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
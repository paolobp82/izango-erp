"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { V2ListPageTemplate } from "@/components/v2/templates"
import {
  V2Button,
  V2DataTable,
  V2PageHeader,
  V2Select,
  type V2TableColumn,
} from "@/components/v2/system"
import { V2FilterBar } from "@/components/v2/filters"

export default function PermisosPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [trabajadorPropio, setTrabajadorPropio] = useState<any>(null)
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroTrabajador, setFiltroTrabajador] = useState("")
  const [form, setForm] = useState({ tipo: "permiso", fecha: "", horas: "", motivo: "" })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from("perfiles").select("*").eq("id", user.id).single()
      setPerfil(p)
      const { data: t } = await supabase.from("rrhh_trabajadores").select("*").eq("user_id", user.id).single()
      setTrabajadorPropio(t)
    }
    const [{ data: regs }, { data: trabs }] = await Promise.all([
      supabase.from("rrhh_permisos").select("*, trabajador:rrhh_trabajadores(nombre,apellido)").order("fecha", { ascending: false }),
      supabase.from("rrhh_trabajadores").select("id,nombre,apellido").eq("activo", true).order("apellido"),
    ])
    setRegistros(regs || [])
    setTrabajadores(trabs || [])
    setLoading(false)
  }

  const esAdmin = perfil?.perfil === "superadmin" || perfil?.perfil === "gerente_general" || perfil?.perfil === "administrador" || perfil?.perfil === "controller"

  async function guardar() {
    if (!form.fecha) { alert("Fecha es obligatoria"); return }
    setSaving(true)
    const trabajadorId = trabajadorPropio?.id
    if (!trabajadorId && !esAdmin) { alert("No se encontró tu ficha de trabajador"); setSaving(false); return }
    await supabase.from("rrhh_permisos").insert({
      ...form,
      trabajador_id: trabajadorId,
      horas: form.horas ? parseFloat(form.horas) : null,
      aprobado: false
    })
    setSaving(false)
    setShowForm(false)
    setForm({ tipo: "permiso", fecha: "", horas: "", motivo: "" })
    load()
  }

  async function aprobar(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_permisos").update({ aprobado: true, aprobado_por: user?.id }).eq("id", id)
    load()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este registro?")) return
    await supabase.from("rrhh_permisos").delete().eq("id", id)
    load()
  }

  const registrosFiltrados = registros.filter(r => {
    if (!esAdmin) return r.trabajador_id === trabajadorPropio?.id
    const matchTipo = !filtroTipo || r.tipo === filtroTipo
    const matchTrab = !filtroTrabajador || r.trabajador_id === filtroTrabajador
    return matchTipo && matchTrab
  })

  const TIPO_COLOR: any = {
    permiso: { bg: "#dbeafe", color: "#1e40af" },
    tardanza: { bg: "#fef3c7", color: "#92400e" },
  }

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando permisos...
      </div>
    )
  }

  const columns: V2TableColumn<any>[] = [
    ...(esAdmin
      ? [
          {
            key: "trabajador",
            header: "Trabajador",
            render: (r: any) => (
              <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>
                {r.trabajador?.apellido}, {r.trabajador?.nombre}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "tipo",
      header: "Tipo",
      render: (r) => {
        const tc = TIPO_COLOR[r.tipo] || TIPO_COLOR.permiso
        return (
          <span style={{ background: tc.bg, color: tc.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            {r.tipo}
          </span>
        )
      },
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (r) => <span style={{ fontSize: 13, color: "var(--v2-text)" }}>{r.fecha}</span>,
    },
    {
      key: "horas",
      header: "Horas",
      align: "center",
      render: (r) => <span style={{ fontSize: 13, color: "var(--v2-text)" }}>{r.horas ? `${r.horas}h` : "—"}</span>,
    },
    {
      key: "motivo",
      header: "Motivo",
      render: (r) => <span style={{ fontSize: 12.5, color: "var(--v2-muted)" }}>{r.motivo || "—"}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      align: "center",
      render: (r) =>
        r.aprobado ? (
          <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            ✓ Aprobado
          </span>
        ) : (
          <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            Pendiente
          </span>
        ),
    },
    ...(esAdmin
      ? [
          {
            key: "acciones",
            header: "",
            align: "right" as const,
            render: (r: any) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {!r.aprobado && (
                  <V2Button variant="ghost" size="compact" onClick={() => aprobar(r.id)}>
                    Aprobar
                  </V2Button>
                )}
                <V2Button variant="destructive" size="compact" onClick={() => eliminar(r.id)}>
                  ×
                </V2Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <V2ListPageTemplate
        header={
          <V2PageHeader
            eyebrow="Recursos Humanos"
            title="Permisos y Tardanzas"
            subtitle={`${registrosFiltrados.length} registros registrados`}
            actions={
              <V2Button variant="primary" onClick={() => setShowForm(true)}>
                + Registrar
              </V2Button>
            }
          />
        }
        toolbar={
          esAdmin ? (
            <V2FilterBar
              searchValue=""
              onSearchChange={() => {}}
              activeFiltersCount={0}
              hideDrawerButton
              onToggleDrawer={() => {}}
              quickFilters={
                <>
                  <div style={{ width: 220 }}>
                    <V2Select
                      compact
                      value={filtroTrabajador}
                      onChange={(e) => setFiltroTrabajador(e.target.value)}
                      options={[
                        { label: "Todos los trabajadores", value: "" },
                        ...trabajadores.map((t) => ({ label: `${t.apellido}, ${t.nombre}`, value: t.id })),
                      ]}
                    />
                  </div>
                  <div style={{ width: 160 }}>
                    <V2Select
                      compact
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                      options={[
                        { label: "Todos los tipos", value: "" },
                        { label: "Permiso", value: "permiso" },
                        { label: "Tardanza", value: "tardanza" },
                      ]}
                    />
                  </div>
                </>
              }
              showClearButton={Boolean(filtroTrabajador || filtroTipo)}
              onClearFilters={() => {
                setFiltroTrabajador("")
                setFiltroTipo("")
              }}
            />
          ) : undefined
        }
        table={
          <V2DataTable
            columns={columns}
            rows={registrosFiltrados}
            getRowKey={(r) => r.id}
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay registros.
              </div>
            }
          />
        }
      />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 440, boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Registrar permiso / tardanza</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Tipo *</label>
                  <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="permiso">Permiso</option>
                    <option value="tardanza">Tardanza</option>
                  </select>
                </div>
                <div><label style={lbl}>Fecha *</label><input style={inp} type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Horas</label><input style={inp} type="number" min="0.5" step="0.5" value={form.horas} placeholder="Ej: 2" onChange={e => setForm({ ...form, horas: e.target.value })} /></div>
              <div><label style={lbl}>Motivo</label><textarea style={{ ...inp, height: 70, resize: "vertical" }} value={form.motivo} placeholder="Descripción del permiso o tardanza" onChange={e => setForm({ ...form, motivo: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Registrar"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
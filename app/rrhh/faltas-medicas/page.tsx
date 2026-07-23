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

export default function FaltasMedicasPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [trabajadorPropio, setTrabajadorPropio] = useState<any>(null)
  const [filtroTrabajador, setFiltroTrabajador] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "", motivo: "", documento_url: "" })
  const [subiendo, setSubiendo] = useState(false)

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
      supabase.from("rrhh_faltas_medicas").select("*, trabajador:rrhh_trabajadores(nombre,apellido)").order("fecha_inicio", { ascending: false }),
      supabase.from("rrhh_trabajadores").select("id,nombre,apellido").eq("activo", true).order("apellido"),
    ])
    setRegistros(regs || [])
    setTrabajadores(trabs || [])
    setLoading(false)
  }

  const esAdmin = perfil?.perfil === "superadmin" || perfil?.perfil === "gerente_general" || perfil?.perfil === "administrador" || perfil?.perfil === "controller"

  async function subirDocumento(file: File) {
    setSubiendo(true)
    const ext = file.name.split(".").pop()
    const path = `faltas-medicas/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true })
    if (error) { alert("Error subiendo archivo: " + error.message); setSubiendo(false); return }
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path)
    setForm(prev => ({ ...prev, documento_url: urlData.publicUrl }))
    setSubiendo(false)
  }

  async function guardar() {
    if (!form.fecha_inicio || !form.fecha_fin) { alert("Fechas son obligatorias"); return }
    if (form.fecha_fin < form.fecha_inicio) { alert("Fecha fin debe ser mayor a fecha inicio"); return }
    setSaving(true)
    const trabajadorId = trabajadorPropio?.id
    if (!trabajadorId && !esAdmin) { alert("No se encontró tu ficha de trabajador"); setSaving(false); return }
    await supabase.from("rrhh_faltas_medicas").insert({ ...form, trabajador_id: trabajadorId, aprobado: false })
    setSaving(false)
    setShowForm(false)
    setForm({ fecha_inicio: "", fecha_fin: "", motivo: "", documento_url: "" })
    load()
  }

  async function aprobar(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_faltas_medicas").update({ aprobado: true, aprobado_por: user?.id }).eq("id", id)
    load()
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este registro?")) return
    await supabase.from("rrhh_faltas_medicas").delete().eq("id", id)
    load()
  }

  const registrosFiltrados = registros.filter(r => {
    if (!esAdmin) return r.trabajador_id === trabajadorPropio?.id
    const matchTrab = !filtroTrabajador || r.trabajador_id === filtroTrabajador
    const matchEstado = !filtroEstado || (filtroEstado === "aprobado" ? r.aprobado : !r.aprobado)
    return matchTrab && matchEstado
  })

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando faltas médicas...
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
      key: "fecha_inicio",
      header: "Desde",
      render: (r) => <span style={{ fontSize: 13, color: "var(--v2-text)" }}>{r.fecha_inicio}</span>,
    },
    {
      key: "fecha_fin",
      header: "Hasta",
      render: (r) => <span style={{ fontSize: 13, color: "var(--v2-text)" }}>{r.fecha_fin}</span>,
    },
    {
      key: "dias",
      header: "Días",
      align: "center",
      render: (r) => <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--v2-text)" }}>{r.dias}</span>,
    },
    {
      key: "motivo",
      header: "Motivo",
      render: (r) => <span style={{ fontSize: 12.5, color: "var(--v2-muted)" }}>{r.motivo || "—"}</span>,
    },
    {
      key: "documento",
      header: "Documento",
      align: "center",
      render: (r) =>
        r.documento_url ? (
          <a
            href={r.documento_url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 11.5, color: "#1e40af", textDecoration: "none", background: "#dbeafe", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}
          >
            Ver PDF
          </a>
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--v2-subtle)" }}>Sin sustento</span>
        ),
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
            title="Faltas Médicas"
            subtitle={`${registrosFiltrados.length} registros registrados`}
            actions={
              <V2Button variant="primary" onClick={() => setShowForm(true)}>
                + Registrar falta médica
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
                  <div style={{ width: 140 }}>
                    <V2Select
                      compact
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      options={[
                        { label: "Todos", value: "" },
                        { label: "Pendiente", value: "pendiente" },
                        { label: "Aprobado", value: "aprobado" },
                      ]}
                    />
                  </div>
                </>
              }
              showClearButton={Boolean(filtroTrabajador || filtroEstado)}
              onClearFilters={() => {
                setFiltroTrabajador("")
                setFiltroEstado("")
              }}
            />
          ) : undefined
        }
        table={
          <V2DataTable
            columns={columns}
            rows={registrosFiltrados}
            getRowKey={(r) => r.id}
            stickyHeader
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay registros de faltas médicas.
              </div>
            }
          />
        }
      />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 480, boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Registrar falta médica</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Fecha inicio *</label><input style={inp} type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
                <div><label style={lbl}>Fecha fin *</label><input style={inp} type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Motivo / Diagnóstico</label><textarea style={{ ...inp, height: 70, resize: "vertical" }} value={form.motivo} placeholder="Descripción de la falta médica" onChange={e => setForm({ ...form, motivo: e.target.value })} /></div>
              <div>
                <label style={lbl}>Documento sustento (PDF)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { if (e.target.files?.[0]) subirDocumento(e.target.files[0]) }}
                  style={{ fontSize: 12, color: "var(--v2-text)" }} />
                {subiendo && <div style={{ fontSize: 11, color: "var(--v2-muted)", marginTop: 4 }}>Subiendo archivo...</div>}
                {form.documento_url && <div style={{ fontSize: 11, color: "var(--v2-success)", marginTop: 4 }}>✓ Archivo subido correctamente</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving || subiendo}>{saving ? "Guardando..." : "Registrar"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
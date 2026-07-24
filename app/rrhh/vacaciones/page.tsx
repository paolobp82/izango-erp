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

export default function VacacionesPage() {
  const supabase = createClient()
  const [registros, setRegistros] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const [trabajadorPropio, setTrabajadorPropio] = useState<any>(null)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroTrabajador, setFiltroTrabajador] = useState("")
  const [motivoRechazo, setMotivoRechazo] = useState("")
  const [showRechazo, setShowRechazo] = useState<string | null>(null)
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "", motivo: "" })

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
      supabase.from("rrhh_vacaciones").select("*, trabajador:rrhh_trabajadores(nombre,apellido), aprobador:perfiles!aprobado_por(nombre,apellido)").order("created_at", { ascending: false }),
      supabase.from("rrhh_trabajadores").select("id,nombre,apellido").eq("activo", true).order("apellido"),
    ])
    setRegistros(regs || [])
    setTrabajadores(trabs || [])
    setLoading(false)
  }

  // Puede VER todas las solicitudes
  const esAdmin = ["superadmin", "gerente_general", "administrador", "controller"].includes(perfil?.perfil)
  // Solo ESTOS pueden aprobar/rechazar
  const puedeAprobar = ["superadmin", "gerente_general"].includes(perfil?.perfil)

  async function guardar() {
    if (!form.fecha_inicio || !form.fecha_fin) { alert("Fechas son obligatorias"); return }
    if (form.fecha_fin < form.fecha_inicio) { alert("Fecha fin debe ser mayor a fecha inicio"); return }
    setSaving(true)
    const trabajadorId = trabajadorPropio?.id
    if (!trabajadorId && !esAdmin) { alert("No se encontró tu ficha de trabajador"); setSaving(false); return }
    await supabase.from("rrhh_vacaciones").insert({ ...form, trabajador_id: trabajadorId, estado: "pendiente" })
    setSaving(false)
    setShowForm(false)
    setForm({ fecha_inicio: "", fecha_fin: "", motivo: "" })
    load()
  }

  async function aprobar(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_vacaciones").update({ estado: "aprobada", aprobado_por: user?.id, notas_admin: null }).eq("id", id)
    load()
  }

  async function rechazar(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("rrhh_vacaciones").update({ estado: "rechazada", aprobado_por: user?.id, notas_admin: motivoRechazo || null }).eq("id", id)
    setShowRechazo(null)
    setMotivoRechazo("")
    load()
  }

  const registrosFiltrados = registros.filter(r => {
    if (!esAdmin) return r.trabajador_id === trabajadorPropio?.id
    const matchEstado = !filtroEstado || r.estado === filtroEstado
    const matchTrab = !filtroTrabajador || r.trabajador_id === filtroTrabajador
    return matchEstado && matchTrab
  })

  const pendientes = registros.filter(r => r.estado === "pendiente").length

  const ESTADO_COLOR: any = {
    pendiente: { bg: "#fef3c7", color: "#92400e" },
    aprobada:  { bg: "#d1fae5", color: "#065f46" },
    rechazada: { bg: "#fee2e2", color: "#dc2626" },
  }

  const inp: any = { padding: "8px 12px", border: "1px solid var(--v2-border)", borderRadius: "var(--v2-radius)", fontSize: 13, fontFamily: "inherit", background: "var(--v2-surface)", width: "100%", outline: "none", boxSizing: "border-box" as const }
  const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--v2-muted)", marginBottom: 6, textTransform: "uppercase" as const }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando solicitudes de vacaciones...
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
      key: "estado",
      header: "Estado",
      align: "center",
      render: (r) => {
        const ec = ESTADO_COLOR[r.estado] || ESTADO_COLOR.pendiente
        return (
          <span style={{ background: ec.bg, color: ec.color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
            {r.estado}
          </span>
        )
      },
    },
    {
      key: "aprobador",
      header: "Aprobado por",
      render: (r) => (
        <span style={{ fontSize: 12, color: "var(--v2-muted)" }}>
          {r.aprobador ? `${r.aprobador.nombre} ${r.aprobador.apellido}` : "—"}
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
                {puedeAprobar && r.estado === "pendiente" && (
                  <>
                    <V2Button variant="ghost" size="compact" onClick={() => aprobar(r.id)}>
                      Aprobar
                    </V2Button>
                    <V2Button variant="destructive" size="compact" onClick={() => setShowRechazo(r.id)}>
                      Rechazar
                    </V2Button>
                  </>
                )}
                {!puedeAprobar && r.estado === "pendiente" && (
                  <span style={{ fontSize: 11, color: "var(--v2-subtle)" }}>Esperando GG</span>
                )}
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
            title="Vacaciones"
            subtitle={`${registrosFiltrados.length} solicitudes${puedeAprobar && pendientes > 0 ? ` · ${pendientes} pendiente${pendientes > 1 ? "s" : ""} de aprobación` : ""}`}
            actions={
              <V2Button variant="primary" onClick={() => setShowForm(true)}>
                + Solicitar vacaciones
              </V2Button>
            }
          />
        }
        toolbar={
          <div>
            {puedeAprobar && pendientes > 0 && (
              <div style={{ marginBottom: 12, padding: "10px 16px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "var(--v2-radius)", fontSize: 13, color: "#92400e", fontWeight: 600 }}>
                ⚠️ Hay {pendientes} solicitud{pendientes > 1 ? "es" : ""} de vacaciones esperando tu aprobación.
              </div>
            )}
            {esAdmin && (
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
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        options={[
                          { label: "Todos los estados", value: "" },
                          { label: "Pendiente", value: "pendiente" },
                          { label: "Aprobada", value: "aprobada" },
                          { label: "Rechazada", value: "rechazada" },
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
            )}
          </div>
        }
        table={
          <V2DataTable
            columns={columns}
            rows={registrosFiltrados}
            getRowKey={(r) => r.id}
            stickyHeader
            empty={
              <div style={{ padding: "40px", textAlign: "center", color: "var(--v2-muted)", fontSize: 13 }}>
                No hay solicitudes de vacaciones.
              </div>
            }
          />
        }
      />

      {/* Modal rechazo */}
      {showRechazo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 24, width: 400, boxShadow: "var(--v2-shadow-lg)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "var(--v2-text)" }}>Motivo de rechazo</h3>
            <textarea
              style={{ ...inp, minHeight: 80, resize: "vertical", marginBottom: 16 }}
              placeholder="Explica el motivo del rechazo (opcional)..."
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <V2Button variant="ghost" onClick={() => { setShowRechazo(null); setMotivoRechazo("") }}>Cancelar</V2Button>
              <V2Button variant="destructive" onClick={() => rechazar(showRechazo)}>
                Confirmar rechazo
              </V2Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva solicitud */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--v2-surface)", borderRadius: "var(--v2-radius-lg)", padding: 28, width: "100%", maxWidth: 440, boxShadow: "var(--v2-shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>Solicitar vacaciones</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--v2-subtle)" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Fecha inicio *</label><input style={inp} type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
                <div><label style={lbl}>Fecha fin *</label><input style={inp} type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} /></div>
              </div>
              <div><label style={lbl}>Motivo</label><textarea style={{ ...inp, height: 70, resize: "vertical" }} value={form.motivo} placeholder="Motivo de las vacaciones" onChange={e => setForm({ ...form, motivo: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <V2Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</V2Button>
              <V2Button variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando..." : "Solicitar"}</V2Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
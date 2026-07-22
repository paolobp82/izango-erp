"use client"

import { useState } from "react"

// Unico formulario de "Crear/editar tarea": usado tanto por app/tareas/page.tsx (modal
// propio del modulo) como por el detalle de Proyecto (dentro de un V2Drawer). Es
// puramente presentacional/controlado — toda la data (usuarios, proyectos, clientes),
// el estado (form) y el guardado (guardarTareaService) viven en quien lo consume; este
// componente no hace fetch, no valida permisos, no llama a Supabase y no notifica.

const ESTADOS: Record<string, any> = {
  pendiente: { label: "Pendiente", bg: "#fef9c3", color: "#92400e" },
  en_progreso: { label: "En progreso", bg: "#dbeafe", color: "#1e40af" },
  en_revision: { label: "En revisión", bg: "#f5f3ff", color: "#6d28d9" },
  completada: { label: "Completada", bg: "#dcfce7", color: "#15803d" },
  cancelada: { label: "Cancelada", bg: "#fee2e2", color: "#991b1b" },
}

const PRIORIDADES: Record<string, any> = {
  baja: { label: "Baja", bg: "#f3f4f6", color: "#6b7280" },
  media: { label: "Media", bg: "#fef9c3", color: "#92400e" },
  alta: { label: "Alta", bg: "#fed7aa", color: "#9a3412" },
  urgente: { label: "Urgente", bg: "#fee2e2", color: "#991b1b" },
}

const FRECUENCIAS: Record<string, string> = {
  no_repite: "No se repite",
  diario: "Diario",
  semanal: "Semanal",
  mensual: "Mensual",
  anual: "Anual",
  laborables: "Días laborables",
  personalizado_dias: "Personalizado: días",
  personalizado_semanas: "Personalizado: semanas",
  personalizado_meses: "Personalizado: meses",
}

const inp: any = { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, fontFamily: "inherit", background: "#fff", width: "100%", outline: "none" }
const lbl: any = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }

function nombreUsuario(u: any) {
  return [u?.nombre, u?.apellido].filter(Boolean).join(" ") || "Sin nombre"
}

function inicialesUsuario(u: any) {
  const nombre = nombreUsuario(u)
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() || "?"
}

export type TaskFormValue = {
  titulo: string
  descripcion: string
  estado: string
  prioridad: string
  proyecto_id: string
  cliente_id: string
  asignado_a: string
  fecha_limite: string
  hora_inicio: string
  hora_fin: string
  participante_ids: string[]
  frecuencia: string
  recurrencia_intervalo: number
  recurrencia_fecha_fin: string
  recurrencia_max_repeticiones: string
  link_inicial: string
  notificar_participantes: boolean
  mostrar_participantes_mi_trabajo: boolean
  permitir_comentarios: boolean
  recibir_correos_automaticos: boolean
}

export type TaskFormUsuario = { id: string; nombre?: string; apellido?: string; perfil?: string; email?: string }
export type TaskFormProyecto = { id: string; codigo: string; nombre: string }
export type TaskFormCliente = { id: string; razon_social: string }

export type TaskFormProps = {
  form: TaskFormValue
  onChange: (form: TaskFormValue) => void
  /** true = editando una tarea existente (cambia titulo/estado/campo "link inicial"). */
  editando: boolean
  usuarios: TaskFormUsuario[]
  proyectos: TaskFormProyecto[]
  clientes: TaskFormCliente[]
  /** Bloquea el select de proyecto (usado cuando se abre desde el propio detalle del proyecto). */
  proyectoBloqueado?: boolean
  /** Bloquea el select de cliente (usado cuando el cliente se deriva del proyecto bloqueado). */
  clienteBloqueado?: boolean
}

export function TaskForm({
  clienteBloqueado = false,
  clientes,
  editando,
  form,
  onChange,
  proyectoBloqueado = false,
  proyectos,
  usuarios,
}: TaskFormProps) {
  const [participanteSearch, setParticipanteSearch] = useState("")

  function toggleParticipante(id: string) {
    const exists = form.participante_ids.includes(id)
    onChange({ ...form, participante_ids: exists ? form.participante_ids.filter((pid) => pid !== id) : [...form.participante_ids, id] })
  }

  const participantesSeleccionados = usuarios.filter((u) => form.participante_ids.includes(u.id))
  const participantesDisponibles = usuarios
    .filter((u) => u.id !== form.asignado_a)
    .filter((u) => {
      const q = participanteSearch.trim().toLowerCase()
      if (!q) return true
      return `${u.nombre || ""} ${u.apellido || ""} ${u.perfil || ""} ${u.email || ""}`.toLowerCase().includes(q)
    })

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!editando && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10 }}>
          {[
            { label: "1. Pendiente", active: true },
            { label: "2. En progreso", active: false },
            { label: "3. En revisión", active: false },
            { label: "4. Cierre", active: false },
          ].map((paso) => (
            <div key={paso.label} style={{ padding: "8px 10px", borderRadius: 8, background: paso.active ? "#fef9c3" : "#fff", border: "1px solid " + (paso.active ? "#fde68a" : "#e5e7eb"), color: paso.active ? "#92400e" : "#6b7280", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
              {paso.label}
            </div>
          ))}
        </div>
      )}
      <div>
        <label style={lbl}>TÍTULO *</label>
        <input onChange={(e) => onChange({ ...form, titulo: e.target.value })} placeholder="Título de la tarea" style={inp} value={form.titulo} />
      </div>
      <div>
        <label style={lbl}>DESCRIPCIÓN</label>
        <textarea onChange={(e) => onChange({ ...form, descripcion: e.target.value })} placeholder="Detalle de la tarea..." style={{ ...inp, minHeight: 80, resize: "vertical" }} value={form.descripcion} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {editando ? (
          <div>
            <label style={lbl}>ESTADO</label>
            <select onChange={(e) => onChange({ ...form, estado: e.target.value })} style={inp} value={form.estado}>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label style={lbl}>ESTADO INICIAL</label>
            <div style={{ padding: "9px 10px", border: "1px solid #fde68a", borderRadius: 7, background: "#fef9c3", color: "#92400e", fontSize: 13, fontWeight: 700 }}>
              Pendiente
            </div>
          </div>
        )}
        <div>
          <label style={lbl}>PRIORIDAD</label>
          <select onChange={(e) => onChange({ ...form, prioridad: e.target.value })} style={inp} value={form.prioridad}>
            {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>RESPONSABLE PRINCIPAL *</label>
        <select
          onChange={(e) => onChange({ ...form, asignado_a: e.target.value, participante_ids: form.participante_ids.filter((id) => id !== e.target.value) })}
          style={inp}
          value={form.asignado_a}
        >
          <option value="">Sin asignar</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.perfil}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl}>PARTICIPANTES / SEGUIDORES</label>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", padding: 10 }}>
          {participantesSeleccionados.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {participantesSeleccionados.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleParticipante(u.id)}
                  style={{ border: "1px solid #dbeafe", background: "#eff6ff", color: "#1e40af", borderRadius: 99, padding: "4px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  type="button"
                >
                  {nombreUsuario(u)} ×
                </button>
              ))}
            </div>
          )}
          <input
            onChange={(e) => setParticipanteSearch(e.target.value)}
            placeholder="Buscar usuarios para agregar..."
            style={{ ...inp, border: "1px solid #f3f4f6", marginBottom: 8 }}
            value={participanteSearch}
          />
          <div style={{ maxHeight: 170, overflowY: "auto", display: "grid", gap: 4 }}>
            {participantesDisponibles.length === 0 ? (
              <div style={{ padding: 10, color: "#9ca3af", fontSize: 12 }}>No hay usuarios con esa búsqueda</div>
            ) : participantesDisponibles.map((u) => {
              const checked = form.participante_ids.includes(u.id)
              return (
                <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, background: checked ? "#f0fdf4" : "#fff", border: `1px solid ${checked ? "#bbf7d0" : "#f3f4f6"}`, cursor: "pointer" }}>
                  <input checked={checked} onChange={() => toggleParticipante(u.id)} type="checkbox" />
                  <span style={{ width: 26, height: 26, borderRadius: 99, background: "#eef2ff", color: "#3730a3", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{inicialesUsuario(u)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#374151" }}>{nombreUsuario(u)} <span style={{ fontWeight: 600, color: "#9ca3af" }}>— {u.perfil || "Sin rol"}</span></span>
                    {u.email && <span style={{ display: "block", fontSize: 11, color: "#9ca3af" }}>{u.email}</span>}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>PROYECTO (opcional)</label>
          <select disabled={proyectoBloqueado} onChange={(e) => onChange({ ...form, proyecto_id: e.target.value })} style={inp} value={form.proyecto_id}>
            <option value="">Sin proyecto</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>CLIENTE (opcional)</label>
          <select disabled={clienteBloqueado} onChange={(e) => onChange({ ...form, cliente_id: e.target.value })} style={inp} value={form.cliente_id}>
            <option value="">Sin cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>FECHA LÍMITE</label>
        <input onChange={(e) => onChange({ ...form, fecha_limite: e.target.value })} style={inp} type="date" value={form.fecha_limite} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>HORA INICIO</label>
          <input onChange={(e) => onChange({ ...form, hora_inicio: e.target.value })} style={inp} type="time" value={form.hora_inicio || ""} />
        </div>
        <div>
          <label style={lbl}>HORA FIN</label>
          <input onChange={(e) => onChange({ ...form, hora_fin: e.target.value })} style={inp} type="time" value={form.hora_fin || ""} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>FRECUENCIA</label>
          <select onChange={(e) => onChange({ ...form, frecuencia: e.target.value })} style={inp} value={form.frecuencia}>
            {Object.entries(FRECUENCIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {form.frecuencia.startsWith("personalizado") && (
          <div>
            <label style={lbl}>CADA</label>
            <input min={1} onChange={(e) => onChange({ ...form, recurrencia_intervalo: Number(e.target.value) })} style={inp} type="number" value={form.recurrencia_intervalo} />
          </div>
        )}
      </div>
      {form.frecuencia !== "no_repite" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>FECHA FIN</label>
            <input onChange={(e) => onChange({ ...form, recurrencia_fecha_fin: e.target.value })} style={inp} type="date" value={form.recurrencia_fecha_fin} />
          </div>
          <div>
            <label style={lbl}>MÁXIMO DE REPETICIONES</label>
            <input min={1} onChange={(e) => onChange({ ...form, recurrencia_max_repeticiones: e.target.value })} style={inp} type="number" value={form.recurrencia_max_repeticiones} />
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { key: "notificar_participantes" as const, label: "Notificar participantes" },
          { key: "mostrar_participantes_mi_trabajo" as const, label: "Mostrar en Mi Trabajo" },
          { key: "permitir_comentarios" as const, label: "Permitir comentarios" },
          { key: "recibir_correos_automaticos" as const, label: "Correos automáticos" },
        ].map((option) => (
          <label key={option.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151", fontWeight: 600 }}>
            <input checked={form[option.key]} onChange={(e) => onChange({ ...form, [option.key]: e.target.checked })} type="checkbox" />
            {option.label}
          </label>
        ))}
      </div>
      {!editando && (
        <div>
          <label style={lbl}>LINK O REFERENCIA INICIAL</label>
          <input onChange={(e) => onChange({ ...form, link_inicial: e.target.value })} placeholder="https://drive.google.com/..." style={inp} value={form.link_inicial} />
        </div>
      )}
    </div>
  )
}

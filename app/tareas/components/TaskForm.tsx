"use client"

import { useState } from "react"
import { V2Badge, V2Input, V2Select } from "@/components/v2/system"
import styles from "./TaskForm.module.css"

const ESTADOS = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  en_revision: "En revisión",
  completada: "Completada",
  cancelada: "Cancelada",
}

const PRIORIDADES = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
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

function nombreUsuario(u: TaskFormUsuario) {
  return [u?.nombre, u?.apellido].filter(Boolean).join(" ") || "Sin nombre"
}

function inicialesUsuario(u: TaskFormUsuario) {
  return nombreUsuario(u).split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "?"
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
  editando: boolean
  usuarios: TaskFormUsuario[]
  proyectos: TaskFormProyecto[]
  clientes: TaskFormCliente[]
  proyectoBloqueado?: boolean
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
    onChange({
      ...form,
      participante_ids: exists
        ? form.participante_ids.filter((participanteId) => participanteId !== id)
        : [...form.participante_ids, id],
    })
  }

  const participantesSeleccionados = usuarios.filter((usuario) => form.participante_ids.includes(usuario.id))
  const participantesDisponibles = usuarios
    .filter((usuario) => usuario.id !== form.asignado_a)
    .filter((usuario) => {
      const query = participanteSearch.trim().toLowerCase()
      if (!query) return true
      return `${usuario.nombre || ""} ${usuario.apellido || ""} ${usuario.perfil || ""} ${usuario.email || ""}`.toLowerCase().includes(query)
    })

  return (
    <div className={styles.form}>
      {!editando ? (
        <div aria-label="Flujo de la tarea" className={styles.workflow}>
          {["1. Pendiente", "2. En progreso", "3. En revisión", "4. Cierre"].map((label, index) => (
            <div className={`${styles.workflowStep} ${index === 0 ? styles.workflowStepActive : ""}`} key={label}>
              {label}
            </div>
          ))}
        </div>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>Información principal</h3>
          <p>Define el alcance y la prioridad del trabajo.</p>
        </div>
        <div className={styles.fields}>
          <div className={styles.full}>
            <V2Input label="Título de la tarea *" onChange={(event) => onChange({ ...form, titulo: event.target.value })} placeholder="Título de la tarea" value={form.titulo} />
          </div>
          <div className={styles.full}>
            <label className={styles.label} htmlFor="task-description">Descripción</label>
            <textarea className={styles.textarea} id="task-description" onChange={(event) => onChange({ ...form, descripcion: event.target.value })} placeholder="Detalle de la tarea..." value={form.descripcion} />
          </div>
          {editando ? (
            <V2Select label="Estado" onChange={(event) => onChange({ ...form, estado: event.target.value })} options={Object.entries(ESTADOS).map(([value, label]) => ({ label, value }))} value={form.estado} />
          ) : (
            <div>
              <span className={styles.label}>Estado inicial</span>
              <div className={styles.initialState}><V2Badge variant="warning">Pendiente</V2Badge></div>
            </div>
          )}
          <V2Select label="Prioridad" onChange={(event) => onChange({ ...form, prioridad: event.target.value })} options={Object.entries(PRIORIDADES).map(([value, label]) => ({ label, value }))} value={form.prioridad} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>Asignación</h3>
          <p>Elige a la persona responsable y a quienes harán seguimiento.</p>
        </div>
        <div className={styles.fields}>
          <div className={styles.full}>
            <V2Select
              label="Responsable principal *"
              onChange={(event) => onChange({ ...form, asignado_a: event.target.value, participante_ids: form.participante_ids.filter((id) => id !== event.target.value) })}
              options={[{ label: "Sin asignar", value: "" }, ...usuarios.map((usuario) => ({ label: `${usuario.nombre} ${usuario.apellido} — ${usuario.perfil}`, value: usuario.id }))]}
              value={form.asignado_a}
            />
          </div>
          <div className={styles.full}>
            <span className={styles.label}>Participantes / seguidores</span>
            <div className={styles.participants}>
              {participantesSeleccionados.length > 0 ? (
                <div className={styles.selectedParticipants}>
                  {participantesSeleccionados.map((usuario) => (
                    <button className={styles.participantChip} key={usuario.id} onClick={() => toggleParticipante(usuario.id)} type="button">
                      {nombreUsuario(usuario)} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <V2Input compact onChange={(event) => setParticipanteSearch(event.target.value)} placeholder="Buscar usuarios para agregar..." value={participanteSearch} />
              <div className={styles.participantList}>
                {participantesDisponibles.length === 0 ? (
                  <div className={styles.noParticipants}>No hay usuarios con esa búsqueda</div>
                ) : participantesDisponibles.map((usuario) => {
                  const checked = form.participante_ids.includes(usuario.id)
                  return (
                    <label className={`${styles.participantRow} ${checked ? styles.participantRowSelected : ""}`} key={usuario.id}>
                      <input checked={checked} className={styles.checkbox} onChange={() => toggleParticipante(usuario.id)} type="checkbox" />
                      <span className={styles.avatar}>{inicialesUsuario(usuario)}</span>
                      <span className={styles.participantIdentity}>
                        <span className={styles.participantName}>{nombreUsuario(usuario)} <span>— {usuario.perfil || "Sin rol"}</span></span>
                        {usuario.email ? <span className={styles.participantEmail}>{usuario.email}</span> : null}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>Contexto</h3>
          <p>Relaciona la tarea con el proyecto y cliente correspondientes.</p>
        </div>
        <div className={styles.fields}>
          <V2Select disabled={proyectoBloqueado} label="Proyecto (opcional)" onChange={(event) => onChange({ ...form, proyecto_id: event.target.value })} options={[{ label: "Sin proyecto", value: "" }, ...proyectos.map((proyecto) => ({ label: `${proyecto.codigo} — ${proyecto.nombre}`, value: proyecto.id }))]} value={form.proyecto_id} />
          <V2Select disabled={clienteBloqueado} label="Cliente (opcional)" onChange={(event) => onChange({ ...form, cliente_id: event.target.value })} options={[{ label: "Sin cliente", value: "" }, ...clientes.map((cliente) => ({ label: cliente.razon_social, value: cliente.id }))]} value={form.cliente_id} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>Programación</h3>
          <p>Configura fechas, horario y recurrencia.</p>
        </div>
        <div className={styles.scheduleFields}>
          <V2Input label="Fecha límite" onChange={(event) => onChange({ ...form, fecha_limite: event.target.value })} type="date" value={form.fecha_limite} />
          <V2Input label="Hora inicio" onChange={(event) => onChange({ ...form, hora_inicio: event.target.value })} type="time" value={form.hora_inicio || ""} />
          <V2Input label="Hora fin" onChange={(event) => onChange({ ...form, hora_fin: event.target.value })} type="time" value={form.hora_fin || ""} />
          <V2Select label="Frecuencia" onChange={(event) => onChange({ ...form, frecuencia: event.target.value })} options={Object.entries(FRECUENCIAS).map(([value, label]) => ({ label, value }))} value={form.frecuencia} />
          {form.frecuencia.startsWith("personalizado") ? <V2Input label="Cada" min={1} onChange={(event) => onChange({ ...form, recurrencia_intervalo: Number(event.target.value) })} type="number" value={form.recurrencia_intervalo} /> : null}
          {form.frecuencia !== "no_repite" ? (
            <>
              <V2Input label="Fecha fin" onChange={(event) => onChange({ ...form, recurrencia_fecha_fin: event.target.value })} type="date" value={form.recurrencia_fecha_fin} />
              <V2Input label="Máximo de repeticiones" min={1} onChange={(event) => onChange({ ...form, recurrencia_max_repeticiones: event.target.value })} type="number" value={form.recurrencia_max_repeticiones} />
            </>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <h3>Opciones</h3>
          <p>Configura visibilidad, comentarios y avisos automáticos.</p>
        </div>
        <div className={styles.options}>
          {[
            { key: "notificar_participantes" as const, label: "Notificar participantes" },
            { key: "mostrar_participantes_mi_trabajo" as const, label: "Mostrar en Mi Trabajo" },
            { key: "permitir_comentarios" as const, label: "Permitir comentarios" },
            { key: "recibir_correos_automaticos" as const, label: "Correos automáticos" },
          ].map((option) => (
            <label className={styles.option} key={option.key}>
              <input checked={form[option.key]} className={styles.checkbox} onChange={(event) => onChange({ ...form, [option.key]: event.target.checked })} type="checkbox" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      {!editando ? (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h3>Referencia inicial</h3>
          </div>
          <V2Input label="Link o referencia inicial" onChange={(event) => onChange({ ...form, link_inicial: event.target.value })} placeholder="https://drive.google.com/..." value={form.link_inicial} />
        </section>
      ) : null}
    </div>
  )
}

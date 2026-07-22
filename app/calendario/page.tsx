"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { filtrarPorAlcance } from "@/lib/permisos"
import { V2ListPageTemplate } from "@/components/v2/templates"
import { V2Button, V2PageHeader, V2SectionCard } from "@/components/v2/system"

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

const ESTADO_COLOR: Record<string, any> = {
  aprobado:            { bg: "#dbeafe", color: "#1e40af", label: "Aprobado" },
  aprobado_produccion: { bg: "#fed7aa", color: "#9a3412", label: "Aprobado Prod." },
  en_curso:            { bg: "#dcfce7", color: "#15803d", label: "En curso" },
  terminado:           { bg: "#f3f4f6", color: "#6b7280", label: "Terminado" },
  facturado:           { bg: "#f5f3ff", color: "#6d28d9", label: "Facturado" },
}

export default function CalendarioPage() {
  const supabase = createClient()
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth())
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState<any>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = user ? await supabase.from("perfiles").select("*").eq("id", user.id).single() : { data: null }
    const { data } = await supabase
      .from("proyectos")
      .select("*, cliente:clientes(razon_social), productor:perfiles!productor_id(nombre,apellido)")
      .in("estado", ["aprobado", "aprobado_produccion", "en_curso", "terminado", "facturado"])
      .is("deleted_at", null)
      .not("fecha_inicio", "is", null)
      .order("fecha_inicio")
    setProyectos(filtrarPorAlcance(data || [], perfil, "calendario", { usuarioId: user?.id }))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function getDiasDelMes() {
    const primero = new Date(anio, mes, 1)
    const ultimo = new Date(anio, mes + 1, 0)
    const dias: (Date | null)[] = []
    for (let i = 0; i < primero.getDay(); i++) dias.push(null)
    for (let i = 1; i <= ultimo.getDate(); i++) dias.push(new Date(anio, mes, i))
    return dias
  }

  function proyectosDelDia(dia: Date) {
    return proyectos.filter(p => {
      if (!p.fecha_inicio) return false
      const f = new Date(p.fecha_inicio + "T00:00:00")
      return f.getDate() === dia.getDate() && f.getMonth() === dia.getMonth() && f.getFullYear() === dia.getFullYear()
    })
  }

  function mesAnterior() {
    if (mes === 0) { setMes(11); setAnio(a => a - 1) }
    else setMes(m => m - 1)
  }

  function mesSiguiente() {
    if (mes === 11) { setMes(0); setAnio(a => a + 1) }
    else setMes(m => m + 1)
  }

  const dias = getDiasDelMes()
  const hoy = new Date()
  const proyectosMes = proyectos.filter(p => {
    if (!p.fecha_inicio) return false
    const f = new Date(p.fecha_inicio + "T00:00:00")
    return f.getMonth() === mes && f.getFullYear() === anio
  })

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--v2-muted)", fontSize: 13 }}>
        Cargando calendario operacional...
      </div>
    )
  }

  return (
    <V2ListPageTemplate
      header={
        <V2PageHeader
          eyebrow="Operaciones"
          title="Calendario Operacional"
          subtitle="Proyectos aprobados y en curso por fecha de ejecución"
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <V2Button variant="ghost" size="compact" onClick={mesAnterior}>‹ Anterior</V2Button>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--v2-text)", minWidth: 140, textAlign: "center" }}>
                {MESES[mes]} {anio}
              </span>
              <V2Button variant="ghost" size="compact" onClick={mesSiguiente}>Siguiente ›</V2Button>
              <V2Button variant="secondary" size="compact" onClick={() => { setMes(new Date().getMonth()); setAnio(new Date().getFullYear()) }}>
                Hoy
              </V2Button>
            </div>
          }
        />
      }
      summary={
        proyectosMes.length > 0 ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            {proyectosMes.map(p => {
              const ec = ESTADO_COLOR[p.estado] || { bg: "var(--v2-surface-subtle)", color: "var(--v2-muted)", label: p.estado }
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  style={{
                    background: ec.bg,
                    border: "1px solid " + ec.color + "40",
                    borderRadius: "var(--v2-radius-sm)",
                    padding: "6px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: ec.color }}>{p.codigo}</span>
                  <span style={{ fontSize: 12, color: "var(--v2-text)" }}>{p.nombre}</span>
                  <span style={{ fontSize: 11, color: "var(--v2-muted)" }}>{p.fecha_inicio}</span>
                </div>
              )
            })}
          </div>
        ) : undefined
      }
      table={
        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: 16 }}>
          <V2SectionCard title="Programación del Mes">
            {/* Header días */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "var(--v2-brand, #0F6E56)", borderRadius: "var(--v2-radius-sm) var(--v2-radius-sm) 0 0" }}>
              {DIAS.map(d => (
                <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{d}</div>
              ))}
            </div>

            {/* Días */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0, border: "1px solid var(--v2-border)", borderRadius: "0 0 var(--v2-radius) var(--v2-radius)" }}>
              {dias.map((dia, idx) => {
                if (!dia) return <div key={idx} style={{ minHeight: 100, background: "var(--v2-surface-subtle)", borderRight: "1px solid var(--v2-border)", borderBottom: "1px solid var(--v2-border)" }} />
                const proysDia = proyectosDelDia(dia)
                const esHoy = dia.getDate() === hoy.getDate() && dia.getMonth() === hoy.getMonth() && dia.getFullYear() === hoy.getFullYear()
                return (
                  <div key={idx} style={{ minHeight: 100, padding: "6px 8px", borderRight: "1px solid var(--v2-border)", borderBottom: "1px solid var(--v2-border)", background: "var(--v2-surface)" }}>
                    <div style={{
                      fontSize: 12.5,
                      fontWeight: esHoy ? 800 : 500,
                      color: esHoy ? "#fff" : "var(--v2-text)",
                      background: esHoy ? "var(--v2-brand)" : "transparent",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 4,
                    }}>
                      {dia.getDate()}
                    </div>
                    {proysDia.map(p => {
                      const ec = ESTADO_COLOR[p.estado] || { bg: "var(--v2-surface-subtle)", color: "var(--v2-muted)" }
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelected(p)}
                          style={{
                            background: ec.bg,
                            color: ec.color,
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10.5,
                            fontWeight: 600,
                            marginBottom: 3,
                            cursor: "pointer",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.codigo} {p.nombre}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </V2SectionCard>

          {/* Panel detalle */}
          {selected && (
            <V2SectionCard title={selected.codigo}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--v2-text)" }}>{selected.nombre}</h3>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--v2-subtle)", fontSize: 20 }}>×</button>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "Cliente", value: selected.cliente?.razon_social },
                  { label: "Productor", value: selected.productor ? selected.productor.nombre + " " + selected.productor.apellido : "—" },
                  { label: "Estado", value: ESTADO_COLOR[selected.estado]?.label || selected.estado },
                  { label: "Fecha ejecución", value: selected.fecha_inicio || "—" },
                  { label: "Fecha fin estimada", value: selected.fecha_fin_estimada || "—" },
                  { label: "Presupuesto", value: selected.presupuesto_referencial ? "S/ " + Number(selected.presupuesto_referencial).toLocaleString("es-PE") : "—" },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--v2-muted)", textTransform: "uppercase", marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 12.5, color: "var(--v2-text)", fontWeight: 500 }}>{item.value || "—"}</div>
                  </div>
                ))}
              </div>
              <a
                href={"/proyectos/" + selected.id}
                style={{ textDecoration: "none", display: "block", marginTop: 16 }}
              >
                <V2Button variant="primary" style={{ width: "100%" }}>
                  Ver detalle proyecto →
                </V2Button>
              </a>
            </V2SectionCard>
          )}
        </div>
      }
    />
  )
}

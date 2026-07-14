/* eslint-disable @typescript-eslint/no-explicit-any */

import { businessRuleEngine } from "@/lib/core/business-rules"
import { lifecycleEngine } from "@/lib/core/lifecycle"
import { registrarAccion } from "@/lib/trazabilidad"

export type EventoSincronizacionComercial =
  | "proyecto_vinculado"
  | "cotizacion_emitida"
  | "cotizacion_aprobada_cliente"
  | "cotizacion_rechazada"
  | "factura_emitida"
  | "factura_cobrada"

type SincronizarLeadPorProyectoParams = {
  supabase: any
  proyectoId?: string | null
  evento: EventoSincronizacionComercial
  cotizacion?: any
  factura?: any
}

type LeadSincronizable = {
  id: string
  estado: string | null
  archivado?: boolean | null
  razon_social?: string | null
  proyecto_id?: string | null
}

function estadoObjetivoPorEvento(evento: EventoSincronizacionComercial, lead: LeadSincronizable) {
  const estadoActual = String(lead.estado || "nuevo")
  if (evento === "cotizacion_aprobada_cliente" || evento === "factura_cobrada") return "ganado"
  if (evento === "proyecto_vinculado" || evento === "cotizacion_emitida") {
    if (["nuevo", "contactado", "reunion"].includes(estadoActual)) return "propuesta"
  }
  return null
}

function descripcionEvento(evento: EventoSincronizacionComercial) {
  const labels: Record<EventoSincronizacionComercial, string> = {
    proyecto_vinculado: "Proyecto vinculado al lead comercial",
    cotizacion_emitida: "Cotización vinculada al lead comercial",
    cotizacion_aprobada_cliente: "Cotización aprobada por cliente",
    cotizacion_rechazada: "Cotización rechazada o anulada requiere revisión comercial",
    factura_emitida: "Factura emitida para proyecto comercial vinculado",
    factura_cobrada: "Factura cobrada para proyecto comercial vinculado",
  }
  return labels[evento]
}

async function registrarEventoComercial(lead: LeadSincronizable, evento: EventoSincronizacionComercial, extras: Record<string, unknown>) {
  await registrarAccion({
    accion: "sincronizacion_comercial",
    modulo: "crm",
    entidad_tipo: "lead",
    entidad_id: lead.id,
    descripcion: descripcionEvento(evento),
    datos_nuevos: {
      evento,
      lead_id: lead.id,
      proyecto_id: lead.proyecto_id,
      ...extras,
    },
  })
}

export async function sincronizarLeadPorProyecto({
  supabase,
  proyectoId,
  evento,
  cotizacion,
  factura,
}: SincronizarLeadPorProyectoParams) {
  if (!proyectoId) return { actualizado: false, motivo: "sin_proyecto" }

  const { data, error } = await supabase
    .from("crm_leads")
    .select("id, estado, archivado, razon_social, proyecto_id")
    .eq("proyecto_id", proyectoId)

  if (error) {
    console.error("Error sincronizando lead comercial:", error)
    return { actualizado: false, error: error.message }
  }

  const leads: LeadSincronizable[] = data || []
  if (leads.length === 0) return { actualizado: false, motivo: "sin_leads_vinculados" }

  const resultados = []

  for (const lead of leads) {
    const estadoActual = String(lead.estado || "nuevo")

    if (lead.archivado || estadoActual === "perdido") {
      resultados.push({ leadId: lead.id, actualizado: false, motivo: "lead_no_sincronizable" })
      continue
    }

    if (evento === "cotizacion_rechazada" || evento === "factura_emitida") {
      await registrarEventoComercial(lead, evento, {
        cotizacion_id: cotizacion?.id,
        factura_id: factura?.id,
        estado_actual: estadoActual,
      })
      resultados.push({ leadId: lead.id, actualizado: false, motivo: "evento_informativo" })
      continue
    }

    const estadoObjetivo = estadoObjetivoPorEvento(evento, lead)
    if (!estadoObjetivo || estadoObjetivo === estadoActual) {
      if (evento === "factura_cobrada") {
        await registrarEventoComercial(lead, evento, {
          factura_id: factura?.id,
          estado_actual: estadoActual,
          monto_final_abonado: factura?.monto_final_abonado,
        })
      }
      resultados.push({ leadId: lead.id, actualizado: false, motivo: "sin_cambio_estado" })
      continue
    }

    if (estadoActual === "ganado" && estadoObjetivo !== "ganado") {
      resultados.push({ leadId: lead.id, actualizado: false, motivo: "no_retroceder_ganado" })
      continue
    }

    const puedeTransicionar = lifecycleEngine.canTransition("crm", estadoActual, estadoObjetivo)
    if (!puedeTransicionar) {
      resultados.push({ leadId: lead.id, actualizado: false, motivo: "transicion_no_permitida" })
      continue
    }

    const regla = businessRuleEngine.evaluate("crm", "cambiar_estado", {
      record: { ...lead, estado: estadoObjetivo },
      metadata: { desde: estadoActual, hacia: estadoObjetivo, evento },
    })
    if (!regla.allowed) {
      resultados.push({ leadId: lead.id, actualizado: false, motivo: regla.reason || "regla_negocio" })
      continue
    }

    const { error: updateError } = await supabase
      .from("crm_leads")
      .update({ estado: estadoObjetivo })
      .eq("id", lead.id)

    if (updateError) {
      console.error("Error actualizando lead comercial:", updateError)
      resultados.push({ leadId: lead.id, actualizado: false, error: updateError.message })
      continue
    }

    await registrarAccion({
      accion: "sincronizar_estado",
      modulo: "crm",
      entidad_tipo: "lead",
      entidad_id: lead.id,
      descripcion: `Lead actualizado por evento comercial: ${descripcionEvento(evento)}`,
      datos_anteriores: { estado: estadoActual },
      datos_nuevos: {
        estado: estadoObjetivo,
        evento,
        proyecto_id: proyectoId,
        cotizacion_id: cotizacion?.id,
        factura_id: factura?.id,
        monto_final_abonado: factura?.monto_final_abonado,
      },
    })

    resultados.push({ leadId: lead.id, actualizado: true, estadoAnterior: estadoActual, estadoNuevo: estadoObjetivo })
  }

  return {
    actualizado: resultados.some(resultado => resultado.actualizado),
    resultados,
  }
}

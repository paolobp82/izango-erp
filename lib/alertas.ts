import { createClient } from "@/lib/supabase"

export type TipoAlerta = 
  | "proyecto_creado"
  | "rq_pendiente"
  | "proyecto_facturacion"
  | "proyecto_liquidado"
  | "cotizacion_aprobada"
  | "audiovisual_requerimiento_creado"

const CAMPO_ALERTA: Record<TipoAlerta, string> = {
  proyecto_creado: "proyecto_creado",
  rq_pendiente: "rq_pendiente",
  proyecto_facturacion: "proyecto_facturacion",
  proyecto_liquidado: "proyecto_liquidado",
  cotizacion_aprobada: "cotizacion_aprobada",
  audiovisual_requerimiento_creado: "proyecto_creado",
}

export async function enviarAlerta(tipo: TipoAlerta, datos: any) {
  try {
    const supabase = createClient()
    const campo = CAMPO_ALERTA[tipo]
    const { data: configs } = await supabase
      .from("alertas_config")
      .select("email")
      .eq(campo, true)

    if (!configs || configs.length === 0) return

    const destinatarios = configs.map(c => c.email).filter(Boolean)
    if (destinatarios.length === 0) return

    const res = await fetch("/api/alertas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, destinatarios, datos }),
    })
    const payload = await res.json().catch(() => null)
    if (!res.ok || payload?.fallidos > 0) {
      console.error("Error enviando alerta:", payload || res.statusText)
    }
  } catch (e) {
    console.error("Error enviando alerta:", e)
  }
}

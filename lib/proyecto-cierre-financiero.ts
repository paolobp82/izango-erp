/* eslint-disable @typescript-eslint/no-explicit-any */
import { FACTURAS_COBRADAS, esFacturaAnulada, montoCobradoFactura } from "@/lib/finance"

type SupabaseLike = {
  from: (table: string) => any
}

export type CierreFinancieroProyecto = {
  permitido: boolean
  facturaFinal: any | null
  facturaCobrada: boolean
  liquidacion: any | null
  liquidacionCerrada: boolean
  aprobadaController: boolean
  razonesPendientes: string[]
}

export async function puedeCerrarFinancieramenteProyecto(
  supabase: SupabaseLike,
  proyectoId: string
): Promise<CierreFinancieroProyecto> {
  const base: CierreFinancieroProyecto = {
    permitido: false,
    facturaFinal: null,
    facturaCobrada: false,
    liquidacion: null,
    liquidacionCerrada: false,
    aprobadaController: false,
    razonesPendientes: [],
  }

  if (!supabase || !proyectoId) {
    return { ...base, razonesPendientes: ["Proyecto no identificado."] }
  }

  const { data: facturas, error: facturasError } = await supabase
    .from("facturas")
    .select("id, proyecto_id, numero_factura, estado, tipo_factura, fecha_emision, fecha_abono, subtotal, igv, monto_final_abonado, created_at")
    .eq("proyecto_id", proyectoId)
    .order("fecha_emision", { ascending: false, nullsFirst: false })

  if (facturasError) throw facturasError

  const facturasFinales = (facturas || [])
    .filter((factura: any) => String(factura?.tipo_factura || "final") === "final")
    .filter((factura: any) => !esFacturaAnulada(factura))

  const facturaFinal =
    facturasFinales.find((factura: any) => FACTURAS_COBRADAS.includes(String(factura?.estado || ""))) ||
    facturasFinales[0] ||
    null

  const facturaCobrada = Boolean(
    facturaFinal &&
    FACTURAS_COBRADAS.includes(String(facturaFinal.estado || "")) &&
    montoCobradoFactura(facturaFinal) > 0
  )

  const { data: liquidacion, error: liquidacionError } = await supabase
    .from("liquidaciones")
    .select("id, proyecto_id, cerrada, aprobado_controller, fecha_cierre, aprobado_controller_at, created_at")
    .eq("proyecto_id", proyectoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (liquidacionError) throw liquidacionError

  const liquidacionCerrada = Boolean(liquidacion?.cerrada)
  const aprobadaController = Boolean(liquidacion?.aprobado_controller)
  const razonesPendientes = [
    !facturaFinal ? "No existe factura final válida." : "",
    facturaFinal && !facturaCobrada ? "La factura final no está cobrada." : "",
    !liquidacion ? "No existe liquidación del proyecto." : "",
    liquidacion && !liquidacionCerrada ? "La liquidación no está cerrada." : "",
    liquidacion && !aprobadaController ? "La liquidación no está aprobada por Controller." : "",
  ].filter(Boolean)

  return {
    permitido: razonesPendientes.length === 0,
    facturaFinal,
    facturaCobrada,
    liquidacion,
    liquidacionCerrada,
    aprobadaController,
    razonesPendientes,
  }
}

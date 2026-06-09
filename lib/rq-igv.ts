export type RqTratamientoIgv = "incluye_igv" | "mas_igv" | "no_aplica"

export type RqIgvInput = {
  monto_solicitado?: number | string | null
  tratamiento_igv?: string | null
  incluye_igv?: boolean | null
}

export function rqTratamientoIgv(rq: RqIgvInput | null | undefined): RqTratamientoIgv {
  if (rq?.tratamiento_igv === "mas_igv" || rq?.tratamiento_igv === "no_aplica" || rq?.tratamiento_igv === "incluye_igv") {
    return rq.tratamiento_igv
  }
  return rq?.incluye_igv === false ? "mas_igv" : "incluye_igv"
}

export function rqTratamientoIgvLabel(rq: RqIgvInput | null | undefined) {
  const tratamiento = rqTratamientoIgv(rq)
  if (tratamiento === "mas_igv") return "Mas IGV"
  if (tratamiento === "no_aplica") return "No aplica IGV"
  return "Incluye IGV"
}

export function rqIgvDetalle(rq: RqIgvInput | null | undefined) {
  const monto = Number(rq?.monto_solicitado || 0)
  const tratamiento = rqTratamientoIgv(rq)
  if (tratamiento === "mas_igv") {
    const igv = monto * 0.18
    return { tratamiento, subtotal: monto, igv, total: monto + igv }
  }
  if (tratamiento === "no_aplica") {
    return { tratamiento, subtotal: monto, igv: 0, total: monto }
  }
  const subtotal = monto / 1.18
  return { tratamiento, subtotal, igv: monto - subtotal, total: monto }
}

export function rqIncluyeIgvLegacy(tratamiento: string | null | undefined) {
  return tratamiento !== "mas_igv"
}

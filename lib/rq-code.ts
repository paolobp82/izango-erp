export function rqCodigo(rq: { codigo_rq?: string | null; numero_rq?: string | null } | null | undefined) {
  return rq?.codigo_rq || rq?.numero_rq || "—"
}

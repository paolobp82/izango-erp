export type CostoSourceType =
  | "rq_presupuestado"
  | "rq_adicional"
  | "caja_chica"
  | "traslado"
  | "costo_interno"
  | "sintetico"

export type RegistroCostoConsolidado = {
  source_type: CostoSourceType
  source_id: string
  proyecto_id: string | null
  monto: number
  afecta_rentabilidad: boolean
  estado: string
  referencia: string
  categoria: string
  metadata: Record<string, unknown>
  incluido: boolean
  motivo_exclusion?: string
}

export type ConsolidacionCostos = {
  registros: RegistroCostoConsolidado[]
  registrosIncluidos: RegistroCostoConsolidado[]
  registrosExcluidos: RegistroCostoConsolidado[]
  duplicadosExactos: RegistroCostoConsolidado[]
  posiblesColisiones: string[]
  errores: string[]
  advertencias: string[]
  totalPresupuestado: number
  totalReal: number
  totalAdicionales: number
  totalCajaChica: number
  totalTraslados: number
  margen: number
  rentabilidadPct: number
}

type Row = Record<string, unknown>

type ConsolidarCostosInput = {
  proyectoId: string
  precioBase?: number
  liquidacionItems?: Row[]
  rqs?: Row[]
  cajaChica?: Row[]
  traslados?: Row[]
  incluirRqsSinItemsComoPresupuestados?: boolean
}

type LiquidacionPersistida = {
  costo_real?: unknown
  cerrada?: unknown
  aprobado_controller?: unknown
}

const ESTADOS_EXCLUIDOS = new Set(["cancelado", "rechazado", "anulado"])
const ESTADOS_RQ_PENDIENTES = new Set(["pendiente_aprobacion"])

function text(value: unknown) {
  return String(value || "").trim()
}

function num(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function estado(row: Row) {
  return text(row.estado).toLowerCase()
}

function sourceKey(record: RegistroCostoConsolidado) {
  return `${record.source_type}:${record.source_id}`
}

function dineroSimilar(a: number, b: number) {
  return Math.abs(a - b) <= 1
}

function rqCodigo(rq: Row) {
  if (rq.codigo_rq) return text(rq.codigo_rq)
  if (rq.numero_rq) return `RQ-${String(rq.numero_rq).padStart(5, "0")}`
  return "RQ"
}

function montoFinalRQ(rq: Row) {
  const rendido = num(rq.monto_rendido)
  if (rendido > 0) return rendido
  return num(rq.monto_solicitado)
}

function crearRegistro(params: Omit<RegistroCostoConsolidado, "incluido"> & { incluido?: boolean }) {
  return {
    ...params,
    incluido: params.incluido !== false,
  }
}

function excluir(record: RegistroCostoConsolidado, motivo: string) {
  return { ...record, incluido: false, motivo_exclusion: motivo }
}

export function consolidarCostosProyecto(input: ConsolidarCostosInput): ConsolidacionCostos {
  const errores: string[] = []
  const advertencias: string[] = []
  const posiblesColisiones: string[] = []
  const registrosBase: RegistroCostoConsolidado[] = []
  const proyectoId = input.proyectoId

  const rqsValidos = (input.rqs || []).filter((rq) => {
    if (text(rq.proyecto_id) !== proyectoId) return false
    return !ESTADOS_EXCLUIDOS.has(estado(rq))
  })

  const rqByCotizacionItemId = new Map<string, Row>()
  rqsValidos.forEach((rq) => {
    const cotizacionItemId = text(rq.cotizacion_item_id)
    if (cotizacionItemId && !rqByCotizacionItemId.has(cotizacionItemId)) rqByCotizacionItemId.set(cotizacionItemId, rq)
  })

  const idsRqIncluidos = new Set<string>()
  let totalPresupuestado = 0

  ;(input.liquidacionItems || []).forEach((item) => {
    const itemId = text(item.id)
    const cotizacionItemId = text(item.cotizacion_item_id)
    const rq = cotizacionItemId ? rqByCotizacionItemId.get(cotizacionItemId) : null
    const rqId = rq ? text(rq.id) : ""
    const costoPresupuestado = num(item.costo_presupuestado)
    const costoRealGuardado = num(item.costo_real)
    const monto = rq ? montoFinalRQ(rq) : costoRealGuardado
    totalPresupuestado += costoPresupuestado
    if (rqId) idsRqIncluidos.add(rqId)

    registrosBase.push(crearRegistro({
      source_type: rq ? "rq_presupuestado" : "sintetico",
      source_id: rqId || itemId,
      proyecto_id: proyectoId,
      monto,
      afecta_rentabilidad: true,
      estado: rq ? estado(rq) : "sin_rq",
      referencia: rq ? rqCodigo(rq) : text(item.descripcion || itemId),
      categoria: "presupuesto",
      metadata: {
        liquidacion_item_id: itemId,
        cotizacion_item_id: cotizacionItemId || null,
        descripcion: item.descripcion || "",
        proveedor_nombre: item.proveedor_nombre || "",
        costo_presupuestado: costoPresupuestado,
        rq_id: rqId || null,
        rq_codigo: rq ? rqCodigo(rq) : null,
        rq_estado: rq ? estado(rq) : null,
        monto_solicitado: rq ? num(rq.monto_solicitado) : 0,
        monto_rendido: rq ? num(rq.monto_rendido) : 0,
        monto_devolucion: rq ? num(rq.monto_devolucion) : 0,
      },
    }))
  })

  rqsValidos
    .filter((rq) => !idsRqIncluidos.has(text(rq.id)))
    .filter((rq) => rq.es_adicional === true || !text(rq.cotizacion_item_id))
    .forEach((rq) => {
      const rqId = text(rq.id)
      const esAdicionalMarcado = rq.es_adicional === true
      if (!esAdicionalMarcado) {
        advertencias.push(`${rqCodigo(rq)} no tiene cotizacion_item_id ni es_adicional=true; se trata como adicional legacy para no perder costo.`)
      }
      idsRqIncluidos.add(rqId)
      registrosBase.push(crearRegistro({
        source_type: "rq_adicional",
        source_id: rqId,
        proyecto_id: proyectoId,
        monto: montoFinalRQ(rq),
        afecta_rentabilidad: true,
        estado: estado(rq),
        referencia: rqCodigo(rq),
        categoria: "adicional",
        metadata: {
          descripcion: rq.descripcion || "RQ adicional",
          proveedor_nombre: rq.proveedor_nombre || "",
          rq_id: rqId,
          rq_codigo: rqCodigo(rq),
          rq_estado: estado(rq),
          monto_solicitado: num(rq.monto_solicitado),
          monto_rendido: num(rq.monto_rendido),
          monto_devolucion: num(rq.monto_devolucion),
          fecha_rendicion: rq.fecha_rendicion || null,
          observacion_rendicion: rq.observacion_rendicion || null,
          solicitado_por: rq.solicitado_por || null,
          es_adicional: rq.es_adicional === true,
        },
      }))
    })

  if (input.incluirRqsSinItemsComoPresupuestados) {
    rqsValidos
      .filter((rq) => !idsRqIncluidos.has(text(rq.id)))
      .filter((rq) => text(rq.cotizacion_item_id))
      .forEach((rq) => {
        const rqId = text(rq.id)
        idsRqIncluidos.add(rqId)
        registrosBase.push(crearRegistro({
          source_type: "rq_presupuestado",
          source_id: rqId,
          proyecto_id: proyectoId,
          monto: montoFinalRQ(rq),
          afecta_rentabilidad: true,
          estado: estado(rq),
          referencia: rqCodigo(rq),
          categoria: "presupuesto_provisional",
          metadata: {
            descripcion: rq.descripcion || "RQ presupuestado sin liquidación cerrada",
            proveedor_nombre: rq.proveedor_nombre || "",
            rq_id: rqId,
            rq_codigo: rqCodigo(rq),
            rq_estado: estado(rq),
            cotizacion_item_id: text(rq.cotizacion_item_id),
            monto_solicitado: num(rq.monto_solicitado),
            monto_rendido: num(rq.monto_rendido),
            monto_devolucion: num(rq.monto_devolucion),
            provisional_sin_liquidacion_item: true,
          },
        }))
      })
  }

  ;(input.cajaChica || []).forEach((caja) => {
    const cajaId = text(caja.id)
    const rqId = text(caja.rq_id)
    const base = crearRegistro({
      source_type: "caja_chica",
      source_id: cajaId,
      proyecto_id: text(caja.proyecto_id) || proyectoId,
      monto: num(caja.monto_debe),
      afecta_rentabilidad: true,
      estado: estado(caja),
      referencia: text(caja.concepto || caja.categoria || cajaId),
      categoria: "caja_chica",
      metadata: {
        caja_chica_id: cajaId,
        rq_id: rqId || null,
        descripcion: caja.concepto || caja.categoria || "Caja chica",
        proveedor_nombre: caja.categoria || "Caja chica",
        fecha: caja.fecha || null,
        observaciones: caja.observaciones || null,
      },
    })

    if (text(caja.proyecto_id) !== proyectoId) return
    if (estado(caja) !== "aprobado") {
      registrosBase.push(excluir(base, "Caja chica no aprobada."))
      return
    }
    if (base.monto <= 0) {
      registrosBase.push(excluir(base, "Caja chica sin monto debe positivo."))
      return
    }
    if (rqId && idsRqIncluidos.has(rqId)) {
      registrosBase.push(excluir(base, "Caja chica vinculada a un RQ ya incluido."))
      return
    }
    registrosBase.push(base)
  })

  if ((input.cajaChica || []).some((caja) => text(caja.proyecto_id) === proyectoId)) {
    advertencias.push("Caja chica no posee campo afecta_rentabilidad; se incluye si tiene proyecto, estado aprobado y monto_debe positivo.")
  }

  ;(input.traslados || []).forEach((traslado) => {
    const trasladoId = text(traslado.id)
    const base = crearRegistro({
      source_type: "traslado",
      source_id: trasladoId,
      proyecto_id: text(traslado.proyecto_id) || proyectoId,
      monto: num(traslado.costo_real),
      afecta_rentabilidad: traslado.afecta_rentabilidad !== false,
      estado: estado(traslado),
      referencia: text(traslado.codigo || traslado.titulo || trasladoId),
      categoria: "traslado",
      metadata: {
        traslado_logistica_id: trasladoId,
        descripcion: `Traslado/logística: ${text(traslado.codigo) ? `${text(traslado.codigo)} - ` : ""}${text(traslado.titulo) || `${text(traslado.punto_recojo) || "Origen"} → ${text(traslado.punto_entrega) || "Destino"}`}`,
        proveedor_nombre: "Logística",
        fecha_traslado: traslado.fecha_entrega_real || traslado.fecha_entrega || traslado.fecha_salida || null,
        origen: traslado.punto_recojo || null,
        destino: traslado.punto_entrega || null,
      },
    })

    if (text(traslado.proyecto_id) !== proyectoId) return
    if (!base.afecta_rentabilidad) {
      registrosBase.push(excluir(base, "Traslado marcado como no afecta rentabilidad."))
      return
    }
    if (ESTADOS_EXCLUIDOS.has(base.estado)) {
      registrosBase.push(excluir(base, "Traslado cancelado/rechazado/anulado."))
      return
    }
    if (base.monto <= 0) {
      registrosBase.push(excluir(base, "Traslado sin costo_real positivo."))
      return
    }
    registrosBase.push(base)
  })

  const vistos = new Set<string>()
  const duplicadosExactos: RegistroCostoConsolidado[] = []
  const registros = registrosBase.map((record) => {
    const key = sourceKey(record)
    if (!record.incluido) return record
    if (vistos.has(key)) {
      duplicadosExactos.push(record)
      return excluir(record, "Duplicado exacto por source_type + source_id.")
    }
    vistos.add(key)
    return record
  })

  const registrosIncluidos = registros.filter((record) => record.incluido && record.afecta_rentabilidad)

  registrosIncluidos.forEach((record) => {
    if (record.monto < 0) errores.push(`${record.referencia} tiene costo negativo.`)
    if (record.source_type === "rq_adicional") {
      if (!text(record.metadata.descripcion)) errores.push(`${record.referencia} es adicional y no tiene concepto.`)
      if (!record.metadata.solicitado_por) errores.push(`${record.referencia} es adicional y no tiene solicitante.`)
      if (ESTADOS_RQ_PENDIENTES.has(record.estado)) errores.push(`${record.referencia} adicional sigue pendiente de aprobación.`)
      if (record.metadata.es_adicional !== true) advertencias.push(`${record.referencia} adicional no está marcado con es_adicional=true.`)
    }
  })

  for (let i = 0; i < registrosIncluidos.length; i++) {
    for (let j = i + 1; j < registrosIncluidos.length; j++) {
      const a = registrosIncluidos[i]
      const b = registrosIncluidos[j]
      if (a.proyecto_id !== b.proyecto_id || a.source_type === b.source_type) continue
      if (dineroSimilar(a.monto, b.monto)) {
        posiblesColisiones.push(`${a.referencia} (${a.source_type}) y ${b.referencia} (${b.source_type}) tienen importes similares.`)
      }
    }
  }

  const totalReal = registrosIncluidos.reduce((sum, record) => sum + record.monto, 0)
  const totalAdicionales = registrosIncluidos.filter((record) => record.source_type === "rq_adicional").reduce((sum, record) => sum + record.monto, 0)
  const totalCajaChica = registrosIncluidos.filter((record) => record.source_type === "caja_chica").reduce((sum, record) => sum + record.monto, 0)
  const totalTraslados = registrosIncluidos.filter((record) => record.source_type === "traslado").reduce((sum, record) => sum + record.monto, 0)
  const precioBase = num(input.precioBase)
  const margen = precioBase - totalReal
  const rentabilidadPct = precioBase > 0 ? (margen / precioBase) * 100 : 0

  return {
    registros,
    registrosIncluidos,
    registrosExcluidos: registros.filter((record) => !record.incluido || !record.afecta_rentabilidad),
    duplicadosExactos,
    posiblesColisiones,
    errores,
    advertencias,
    totalPresupuestado,
    totalReal,
    totalAdicionales,
    totalCajaChica,
    totalTraslados,
    margen,
    rentabilidadPct,
  }
}

export function resumenDesdeRegistros(registros: RegistroCostoConsolidado[], precioBase = 0, totalPresupuestado = 0) {
  const registrosIncluidos = registros.filter((record) => record.incluido !== false && record.afecta_rentabilidad !== false)
  const totalReal = registrosIncluidos.reduce((sum, record) => sum + num(record.monto), 0)
  const totalAdicionales = registrosIncluidos.filter((record) => record.source_type === "rq_adicional").reduce((sum, record) => sum + num(record.monto), 0)
  const totalCajaChica = registrosIncluidos.filter((record) => record.source_type === "caja_chica").reduce((sum, record) => sum + num(record.monto), 0)
  const totalTraslados = registrosIncluidos.filter((record) => record.source_type === "traslado").reduce((sum, record) => sum + num(record.monto), 0)
  const margen = num(precioBase) - totalReal
  return {
    totalPresupuestado,
    totalReal,
    totalAdicionales,
    totalCajaChica,
    totalTraslados,
    margen,
    rentabilidadPct: num(precioBase) > 0 ? (margen / num(precioBase)) * 100 : 0,
  }
}

export function resumenDesdeItemsConsolidados(items: Row[], precioBase = 0) {
  const registros = items.map((item) => {
    const sourceType = text(item.source_type) || "sintetico"
    return crearRegistro({
      source_type: sourceType as CostoSourceType,
      source_id: text(item.source_id || item.id),
      proyecto_id: text(item.proyecto_id) || null,
      monto: num(item.costo_real || item.monto),
      afecta_rentabilidad: item.afecta_rentabilidad !== false,
      estado: text(item.estado || item.rq_estado),
      referencia: text(item.rq_codigo || item.descripcion || item.id),
      categoria: text(item.categoria_consolidacion || item.categoria),
      metadata: item,
    })
  })

  const totalPresupuestado = items
    .filter((item) => !["rq_adicional", "caja_chica", "traslado"].includes(text(item.source_type)))
    .reduce((sum, item) => sum + num(item.costo_presupuestado), 0)

  return resumenDesdeRegistros(registros, precioBase, totalPresupuestado)
}

export function validarConsolidacionParaController(consolidacion: ConsolidacionCostos) {
  const bloqueos = [
    ...consolidacion.errores,
    ...consolidacion.duplicadosExactos.map((record) => `${record.referencia} está duplicado por source_type + source_id.`),
  ]

  const advertencias = [
    ...consolidacion.advertencias,
    ...consolidacion.posiblesColisiones,
  ]

  return { bloqueos, advertencias }
}

export function costoRealDesdeConsolidacion(consolidacion: ConsolidacionCostos, liquidacion?: LiquidacionPersistida | null) {
  const costoPersistido = num(liquidacion?.costo_real)
  const liquidacionCerradaYAprobada = Boolean(liquidacion?.cerrada && liquidacion?.aprobado_controller)

  if (liquidacionCerradaYAprobada && Math.abs(costoPersistido - consolidacion.totalReal) <= 0.01) {
    return {
      costoReal: costoPersistido,
      fuente: "liquidacion_cerrada_aprobada" as const,
    }
  }

  return {
    costoReal: consolidacion.totalReal,
    fuente: "consolidacion_provisional" as const,
  }
}

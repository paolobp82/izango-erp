import { puedeEjecutarAccion } from "@/lib/permisos"
import { registrarAccion } from "@/lib/trazabilidad"
import { rqCodigo } from "@/lib/rq-code"

// Coincide con FORM_RQ_VACIO en app/rq/page.tsx — incluye tambien los campos que solo
// usa el formulario de edicion (voucher_url, nota_pago, etc.) porque formRQ comparte el
// mismo shape que formEditarRQ; crearRQManualService solo lee los campos relevantes para
// la creacion, pero el tipo debe aceptar el objeto completo para que RQForm (compartido)
// pueda tipar su prop `onChange` sin perder campos.
export type FormRQManual = {
  descripcion: string
  proveedor_id: string
  monto_solicitado: string
  tratamiento_igv: string
  proyecto_id: string
  tipo_pago: string
  condicion_comercial: string
  medio_pago: string
  es_excepcion: boolean
  motivo_excepcion: string
  dias_credito: string
  fecha_necesidad_pago: string
  fecha_pago: string
  voucher_url: string
  nota_pago: string
  numero_operacion: string
  banco_pago: string
  tipo_transferencia: string
}

export type CrearRQManualParams = {
  supabase: any
  formRQ: FormRQManual
  proyectos: any[]
  proveedoresTodos: any[]
  perfil: any
}

export type CrearRQManualResult =
  | { ok: true; creado: any }
  | { ok: false; error: string }

// Mismo mapeo de mensajes que app/rq/page.tsx (errorSupabaseRQ), reutilizado aqui para
// que tanto /rq como cualquier otro consumidor (ej. el detalle de Proyecto) muestren el
// mismo texto de error ante el mismo fallo de Supabase.
function errorSupabaseRQCreacion(error: any): string {
  const mensaje = String(error?.message || "")
  if (mensaje.includes("tratamiento_igv") || mensaje.includes("schema cache")) {
    return "No se pudo crear el RQ porque falta actualizar el esquema de Supabase. Verifica que la migracion RQ de tratamiento_igv/codigo_rq este aplicada y refresca el schema cache."
  }
  if (mensaje.includes("solicitado_por")) {
    return "No se pudo crear el RQ porque falta el campo solicitado_por en la base de datos o no esta disponible en el schema cache."
  }
  if (mensaje.includes("codigo_rq") || mensaje.includes("rq_codigo")) {
    return "No se pudo generar el codigo RQ. Verifica que la migracion de numeracion RQ y su trigger esten aplicados."
  }
  return mensaje || "No se pudo crear el RQ. Revisa los datos obligatorios e intenta nuevamente."
}

// Extraido de crearRQManual() en app/rq/page.tsx (misma validacion, mismo payload, mismo
// insert, mismo registro de auditoria) para que pueda reutilizarse desde otros
// consumidores (ej. el detalle de Proyecto) sin duplicar la logica. app/rq/page.tsx sigue
// siendo dueño de la UI/estado (formRQ, showNuevoRQ, errorNuevoRQ, guardandoRQ) y solo
// invoca esta funcion.
export async function crearRQManualService({
  supabase,
  formRQ,
  proyectos,
  proveedoresTodos,
  perfil,
}: CrearRQManualParams): Promise<CrearRQManualResult> {
  const proyecto = proyectos.find((p: any) => p.id === formRQ.proyecto_id)

  const puedeCrear = puedeEjecutarAccion(perfil, "rq", "crear", {
    usuarioId: perfil?.id,
    registro: { proyecto_id: formRQ.proyecto_id, proyecto },
  })
  if (!puedeCrear) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." }
  }

  if (!formRQ.proyecto_id) {
    return { ok: false, error: "Selecciona un proyecto para evitar crear un RQ huerfano." }
  }
  if (proyecto?.estado !== "en_curso") {
    return { ok: false, error: "Para generar RQs, el proyecto debe estar En curso." }
  }
  if (!formRQ.descripcion.trim()) {
    return { ok: false, error: "Ingresa la descripcion o concepto del RQ." }
  }
  if (!formRQ.proveedor_id) {
    return { ok: false, error: "Selecciona un proveedor." }
  }
  const monto = Number(formRQ.monto_solicitado)
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "Ingresa un monto valido mayor a cero." }
  }
  if (formRQ.es_excepcion && !String(formRQ.motivo_excepcion || "").trim()) {
    return { ok: false, error: "El motivo de la excepción es obligatorio." }
  }

  const prov = proveedoresTodos.find((p: any) => p.id === formRQ.proveedor_id)
  const payload = {
    proyecto_id: formRQ.proyecto_id,
    estado: "pendiente_aprobacion",
    proveedor_id: formRQ.proveedor_id,
    proveedor_nombre: prov?.nombre || "",
    monto_solicitado: monto,
    tratamiento_igv: formRQ.tratamiento_igv,
    descripcion: formRQ.descripcion.trim(),
    tipo_pago: formRQ.condicion_comercial || formRQ.tipo_pago,
    dias_credito: (formRQ.condicion_comercial || formRQ.tipo_pago) === "credito" && formRQ.dias_credito ? Number(formRQ.dias_credito) : null,
    condicion_comercial: formRQ.condicion_comercial || formRQ.tipo_pago,
    medio_pago: formRQ.medio_pago || "Transferencia",
    fecha_necesidad_pago: formRQ.fecha_necesidad_pago || null,
    es_excepcion: Boolean(formRQ.es_excepcion),
    motivo_excepcion: formRQ.es_excepcion ? String(formRQ.motivo_excepcion || "").trim() : null,
    excepcion_solicitada_por: formRQ.es_excepcion ? perfil?.id || null : null,
    excepcion_solicitada_at: formRQ.es_excepcion ? new Date().toISOString() : null,
    es_adicional: true,
    solicitado_por: perfil?.id || null,
  }

  const { data: creado, error } = await supabase
    .from("requerimientos_pago")
    .insert(payload)
    .select("id,codigo_rq,numero_rq")
    .single()

  if (error) {
    return { ok: false, error: errorSupabaseRQCreacion(error) }
  }

  await registrarAccion({
    accion: "crear",
    modulo: "rq",
    entidad_id: creado?.id,
    entidad_tipo: "rq",
    descripcion: "RQ manual creado: " + rqCodigo(creado),
    datos_nuevos: payload,
  })

  return { ok: true, creado }
}

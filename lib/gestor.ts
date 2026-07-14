export async function cargarItemsAprobadosAlGestor(
  supabase: any,
  proyectoId: string,
  cotizacionId: string
) {
  if (!supabase || !proyectoId || !cotizacionId) {
    return { creados: 0, omitidos: 0 }
  }

  const { data: cotizacion, error: cotError } = await supabase
    .from("cotizaciones")
    .select("id, proyecto_id, version")
    .eq("id", cotizacionId)
    .maybeSingle()

  if (cotError) throw cotError
  if (!cotizacion) return { creados: 0, omitidos: 0 }

  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyectos")
    .select("id, productor_id")
    .eq("id", proyectoId)
    .maybeSingle()

  if (proyectoError) throw proyectoError

  let responsableNombre = ""

  if (proyecto?.productor_id) {
    const { data: productor } = await supabase
      .from("perfiles")
      .select("nombre, apellido")
      .eq("id", proyecto.productor_id)
      .maybeSingle()

    responsableNombre = productor
      ? `${productor.nombre || ""} ${productor.apellido || ""}`.trim()
      : ""
  }

  const { data: items, error: itemsError } = await supabase
    .from("cotizacion_items")
    .select("*")
    .eq("cotizacion_id", cotizacionId)
    .order("orden", { ascending: true })

  if (itemsError) throw itemsError

  const itemsValidos = (items || []).filter((item: any) =>
    item?.id &&
    item.tipo !== "familia" &&
    item.tipo !== "celda_extra" &&
    item.incluir_en_total !== false &&
    String(item.descripcion || "").trim()
  )

  if (itemsValidos.length === 0) {
    return { creados: 0, omitidos: 0 }
  }

  const itemIds = itemsValidos.map((item: any) => item.id)

  const { data: existentes, error: existentesError } = await supabase
    .from("proyecto_tareas")
    .select("cotizacion_item_id")
    .in("cotizacion_item_id", itemIds)

  if (existentesError) throw existentesError

  const yaCargados = new Set(
    (existentes || [])
      .map((row: any) => row.cotizacion_item_id)
      .filter(Boolean)
  )

  const nuevos = itemsValidos.filter((item: any) => !yaCargados.has(item.id))

  if (nuevos.length === 0) {
    return { creados: 0, omitidos: itemsValidos.length }
  }

  const { count } = await supabase
    .from("proyecto_tareas")
    .select("id", { count: "exact", head: true })
    .eq("proyecto_id", proyectoId)

  const ordenBase = count || 0

  const registros = nuevos.map((item: any, index: number) => ({
    proyecto_id: proyectoId,
    cotizacion_id: cotizacionId,
    cotizacion_item_id: item.id,
    origen: "proforma_aprobada",
    origen_version: cotizacion.version || null,

    titulo: item.descripcion || "Item aprobado",
    descripcion: [
      item.descripcion ? `Item aprobado: ${item.descripcion}` : "",
      item.proveedor_nombre ? `Proveedor: ${item.proveedor_nombre}` : "",
      cotizacion.version ? `Origen: Cotización V${cotizacion.version}` : "Origen: Cotización aprobada",
    ].filter(Boolean).join("\n"),

    proveedor_id: item.proveedor_id || null,
    proveedor_nombre: item.proveedor_nombre || null,
    cantidad: Number(item.cantidad) || 1,
    costo_presupuestado: Number(item.costo_total) || 0,
    precio_cliente: Number(item.precio_cliente) || 0,

    responsable_id: proyecto?.productor_id || null,
    responsable_nombre: responsableNombre,
    estado: "pendiente",
    fecha_inicio: null,
    fecha_fin: null,
    color: "#0F6E56",
    orden: ordenBase + index,
  }))

  const { error: insertError } = await supabase
    .from("proyecto_tareas")
    .insert(registros)

  if (insertError) throw insertError

  return { creados: registros.length, omitidos: itemsValidos.length - registros.length }
}

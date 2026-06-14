export async function buscarItemsCotizados(supabase: any, options: { query?: string; limit?: number } = {}) {
  const q = options.query?.trim()
  const limit = options.limit || 500
  let itemQuery = supabase
    .from("cotizacion_items")
    .select("id,descripcion,cotizacion_id,costo_total,precio_cliente,created_at")
    .not("descripcion", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (q) itemQuery = itemQuery.ilike("descripcion", `%${q}%`)

  const { data: items, error: itemsError } = await itemQuery
  if (itemsError || !items?.length) return { data: [], error: itemsError }

  const cotizacionIds = [...new Set(items.map((item: any) => item.cotizacion_id).filter(Boolean))]
  if (cotizacionIds.length === 0) return { data: [], error: null }

  const { data: cotizaciones, error: cotizacionesError } = await supabase
    .from("cotizaciones")
    .select("id,version,estado,created_at,proyecto_id")
    .is("deleted_at", null)
    .in("id", cotizacionIds)

  if (cotizacionesError) return { data: [], error: cotizacionesError }

  const proyectoIds = [...new Set((cotizaciones || []).map((cot: any) => cot.proyecto_id).filter(Boolean))]
  const { data: proyectos, error: proyectosError } = proyectoIds.length > 0
    ? await supabase.from("proyectos").select("id,codigo,nombre,cliente_id").is("deleted_at", null).in("id", proyectoIds)
    : { data: [], error: null }

  if (proyectosError) return { data: [], error: proyectosError }

  const clienteIds = [...new Set((proyectos || []).map((proy: any) => proy.cliente_id).filter(Boolean))]
  const { data: clientes, error: clientesError } = clienteIds.length > 0
    ? await supabase.from("clientes").select("id,razon_social").in("id", clienteIds)
    : { data: [], error: null }

  if (clientesError) return { data: [], error: clientesError }

  const cotPorId = new Map((cotizaciones || []).map((cot: any) => [cot.id, cot]))
  const proyPorId = new Map((proyectos || []).map((proy: any) => [proy.id, proy]))
  const clientePorId = new Map((clientes || []).map((cliente: any) => [cliente.id, cliente]))

  const data = items.map((item: any) => {
    const cotizacion: any = cotPorId.get(item.cotizacion_id) || null
    const proyecto: any = cotizacion?.proyecto_id ? proyPorId.get(cotizacion.proyecto_id) || null : null
    const cliente: any = proyecto?.cliente_id ? clientePorId.get(proyecto.cliente_id) || null : null
    return {
      ...item,
      cotizacion: cotizacion ? { ...cotizacion, proyecto: proyecto ? { ...proyecto, cliente } : null } : null,
    }
  }).filter((item: any) => !item.cotizacion?.proyecto_id || item.cotizacion?.proyecto)

  return { data, error: null }
}

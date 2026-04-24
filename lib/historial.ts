import { createClient } from "@/lib/supabase"

export async function registrarHistorial({
  cotizacion_id,
  accion,
  estado_anterior,
  estado_nuevo,
  descripcion,
  datos,
}: {
  cotizacion_id: string
  accion: string
  estado_anterior?: string
  estado_nuevo?: string
  descripcion?: string
  datos?: any
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: perfil } = await supabase.from("perfiles").select("nombre, apellido").eq("id", user.id).single()
    await supabase.from("cotizacion_historial").insert({
      cotizacion_id,
      usuario_id: user.id,
      usuario_nombre: perfil ? perfil.nombre + " " + perfil.apellido : user.email,
      accion,
      estado_anterior: estado_anterior || null,
      estado_nuevo: estado_nuevo || null,
      descripcion: descripcion || null,
      datos: datos ? JSON.stringify(datos) : null,
    })
  } catch (e) {
    console.error("Error historial:", e)
  }
}
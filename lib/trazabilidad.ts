import { createClient } from "@/lib/supabase"

export async function registrarAccion({
  accion,
  modulo,
  entidad_id,
  entidad_tipo,
  descripcion,
  datos_anteriores,
  datos_nuevos,
}: {
  accion: string
  modulo: string
  entidad_id?: string
  entidad_tipo?: string
  descripcion?: string
  datos_anteriores?: any
  datos_nuevos?: any
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: perfil } = await supabase.from("perfiles").select("nombre, apellido").eq("id", user.id).single()
    await supabase.from("trazabilidad").insert({
      usuario_id: user.id,
      usuario_nombre: perfil ? perfil.nombre + " " + perfil.apellido : user.email,
      accion,
      modulo,
      entidad_id: entidad_id || null,
      entidad_tipo: entidad_tipo || null,
      descripcion: descripcion || null,
      datos_anteriores: datos_anteriores ? JSON.stringify(datos_anteriores) : null,
      datos_nuevos: datos_nuevos ? JSON.stringify(datos_nuevos) : null,
    })
  } catch (e) {
    console.error("Error trazabilidad:", e)
  }
}
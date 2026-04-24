import { createClient } from "@/lib/supabase"

export async function crearNotificacion({
  usuario_id,
  titulo,
  mensaje,
  tipo = "info",
  enlace,
}: {
  usuario_id: string
  titulo: string
  mensaje?: string
  tipo?: "info" | "success" | "warning" | "error"
  enlace?: string
}) {
  try {
    const supabase = createClient()
    await supabase.from("notificaciones").insert({
      usuario_id,
      titulo,
      mensaje: mensaje || null,
      tipo,
      enlace: enlace || null,
      leida: false,
    })
  } catch (e) {
    console.error("Error notificacion:", e)
  }
}

export async function notificarATodos({
  titulo,
  mensaje,
  tipo = "info",
  enlace,
  perfiles,
}: {
  titulo: string
  mensaje?: string
  tipo?: "info" | "success" | "warning" | "error"
  enlace?: string
  perfiles?: string[]
}) {
  try {
    const supabase = createClient()
    let q = supabase.from("perfiles").select("id")
    if (perfiles && perfiles.length > 0) {
      q = q.in("perfil", perfiles) as any
    }
    const { data: users } = await q
    if (!users) return
    await supabase.from("notificaciones").insert(
      users.map((u: any) => ({ usuario_id: u.id, titulo, mensaje: mensaje || null, tipo, enlace: enlace || null, leida: false }))
    )
  } catch (e) {
    console.error("Error notificacion:", e)
  }
}
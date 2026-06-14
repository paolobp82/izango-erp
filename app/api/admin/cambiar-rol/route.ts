import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, getErrorMessage, requireAdminProfile } from "@/lib/auth-server"

const ROLES_VALIDOS = new Set([
  "superadmin",
  "gerente_general",
  "administrador",
  "controller",
  "productor",
  "logistica",
  "practicante",
  "comercial",
  "gerente_produccion",
  "gerente_finanzas",
  "audiovisual",
  "operativo",
  "finanzas",
])

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminProfile()
    if (auth.error) return auth.error

    if (auth.profile.perfil !== "superadmin") {
      return NextResponse.json({ error: "Solo Superadmin puede cambiar roles de usuarios" }, { status: 403 })
    }

    const { user_id, nuevo_perfil } = await request.json()

    if (!user_id || !nuevo_perfil) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }

    if (!ROLES_VALIDOS.has(nuevo_perfil)) {
      return NextResponse.json({ error: "Rol no válido" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: usuarioActual, error: usuarioError } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, perfil")
      .eq("id", user_id)
      .single()

    if (usuarioError || !usuarioActual) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const perfilAnterior = usuarioActual.perfil

    const { error: updateError } = await supabaseAdmin
      .from("perfiles")
      .update({ perfil: nuevo_perfil })
      .eq("id", user_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    await supabaseAdmin.from("trazabilidad").insert({
      accion: "cambiar_rol",
      modulo: "admin_usuarios",
      entidad_id: user_id,
      entidad_tipo: "perfil",
      descripcion: `${auth.profile.nombre || ""} ${auth.profile.apellido || ""} cambió el rol de ${usuarioActual.nombre || ""} ${usuarioActual.apellido || ""} de ${perfilAnterior} a ${nuevo_perfil}`,
      usuario_id: auth.profile.id,
      usuario_nombre: `${auth.profile.nombre || ""} ${auth.profile.apellido || ""}`.trim(),
      datos_anteriores: { perfil: perfilAnterior },
      datos_nuevos: { perfil: nuevo_perfil },
    })

    return NextResponse.json({
      success: true,
      message: "Rol actualizado correctamente",
      perfil_anterior: perfilAnterior,
      perfil_nuevo: nuevo_perfil,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROLES_TRANSVERSALES_PROYECTO = ["superadmin", "gerente_general", "gerente_produccion"]

export function rolProyecto(perfil: any) {
  return String(perfil?.perfil || perfil || "").trim().toLowerCase()
}

export function productorVigenteProyecto(proyecto: any) {
  return proyecto?.productor_id || proyecto?.proyecto?.productor_id || null
}

export function esRolTransversalProyecto(perfil: any) {
  return ROLES_TRANSVERSALES_PROYECTO.includes(rolProyecto(perfil))
}

export function esProductorAsignadoProyecto(perfil: any, proyecto: any, usuarioId?: string | null) {
  const rol = rolProyecto(perfil)
  const idUsuario = usuarioId || perfil?.id
  if (rol !== "productor" || !idUsuario) return false
  return productorVigenteProyecto(proyecto) === idUsuario
}

export function puedeAccederProyecto(perfil: any, proyecto: any, usuarioId?: string | null) {
  const rol = rolProyecto(perfil)
  if (!rol || !proyecto) return false
  if (esRolTransversalProyecto(perfil)) return true
  if (rol === "productor") return esProductorAsignadoProyecto(perfil, proyecto, usuarioId)
  return true
}

export function puedeOperarProyecto(perfil: any, proyecto: any, usuarioId?: string | null) {
  const rol = rolProyecto(perfil)
  if (!rol || !proyecto) return false
  if (esRolTransversalProyecto(perfil)) return true
  if (rol === "productor") return esProductorAsignadoProyecto(perfil, proyecto, usuarioId)
  return false
}

export const puedeVerProyecto = puedeAccederProyecto
export const puedeEditarProyecto = puedeOperarProyecto
export const puedeCrearCotizacionProyecto = puedeOperarProyecto
export const puedeEditarCotizacionProyecto = puedeOperarProyecto
export const puedeCrearRQProyecto = puedeOperarProyecto
export const puedeEditarRQProyecto = puedeOperarProyecto
export const puedeGestionarOperacionProyecto = puedeOperarProyecto

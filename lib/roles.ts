export const ROLES_VALIDOS = [
  "superadmin",
  "gerente_general",
  "administrador",
  "controller",
  "productor",
  "logistica",
  "practicante",
  "comercial",
  "gerente_produccion",
  "audiovisual",
] as const

export type RolUsuario = typeof ROLES_VALIDOS[number]

export const ROLES_VALIDOS_SET = new Set<string>(ROLES_VALIDOS)

export function esRolValido(rol: unknown): rol is RolUsuario {
  return typeof rol === "string" && ROLES_VALIDOS_SET.has(rol)
}


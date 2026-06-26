export const ALCANCES_PERMISO = [
  "TOTAL",
  "EQUIPO",
  "PROPIO",
  "ASIGNADO",
  "LECTURA",
  "NINGUNO",
] as const

export type AlcancePermiso = typeof ALCANCES_PERMISO[number]

const ALIASES_ALCANCE: Record<string, AlcancePermiso> = {
  T: "TOTAL",
  TOTAL: "TOTAL",
  E: "EQUIPO",
  EQUIPO: "EQUIPO",
  P: "PROPIO",
  PROPIO: "PROPIO",
  PROPIA: "PROPIO",
  PROPIAS: "PROPIO",
  A: "ASIGNADO",
  ASIGNADO: "ASIGNADO",
  L: "LECTURA",
  LECTURA: "LECTURA",
  N: "NINGUNO",
  NINGUNO: "NINGUNO",
  "SIN ACCESO": "NINGUNO",
}

export function normalizarAlcance(valor: unknown): AlcancePermiso {
  const key = String(valor || "").trim().toUpperCase()
  return ALIASES_ALCANCE[key] || "NINGUNO"
}

export function esAccesoTotal(valor: unknown) {
  return normalizarAlcance(valor) === "TOTAL"
}

export function esSoloLectura(valor: unknown) {
  return normalizarAlcance(valor) === "LECTURA"
}

export function esPropio(valor: unknown) {
  return normalizarAlcance(valor) === "PROPIO"
}

export function esEquipo(valor: unknown) {
  return normalizarAlcance(valor) === "EQUIPO"
}

export function esAsignado(valor: unknown) {
  return normalizarAlcance(valor) === "ASIGNADO"
}

export function esSinAcceso(valor: unknown) {
  return normalizarAlcance(valor) === "NINGUNO"
}

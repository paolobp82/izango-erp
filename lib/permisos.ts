import {
  esAccesoTotal,
  esAsignado,
  esEquipo,
  esPropio,
  esSinAcceso,
  esSoloLectura,
  normalizarAlcance,
  type AlcancePermiso,
} from "./permisos/alcance"
import {
  MATRIZ_ACCIONES,
  MATRIZ_INFORMACION_SENSIBLE,
  MATRIZ_MODULOS,
  PERFILES_OFICIALES,
  type AccionPermiso,
  type InformacionSensible,
  type ModuloPermiso,
  type PerfilUsuario,
} from "./permisos/matriz"
import {
  esProductorAsignadoProyecto,
  productorVigenteProyecto,
} from "./permisos/proyectos"

export type {
  AccionPermiso,
  AlcancePermiso,
  InformacionSensible,
  ModuloPermiso,
  PerfilUsuario,
}

export {
  esAccesoTotal,
  esAsignado,
  esEquipo,
  esPropio,
  esSinAcceso,
  esSoloLectura,
}

export type ContextoPermiso = {
  usuarioId?: string | null
  equipoIds?: Array<string | null | undefined>
  proyectoIds?: Array<string | null | undefined>
  registro?: RegistroConPropiedad | null
  proyecto?: RegistroConPropiedad | null
}

export type RegistroConPropiedad = {
  id?: string | null
  usuario_id?: string | null
  user_id?: string | null
  perfil_id?: string | null
  creado_por?: string | null
  created_by?: string | null
  solicitado_por?: string | null
  productor_id?: string | null
  comercial_id?: string | null
  responsable_id?: string | null
  responsable_principal_id?: string | null
  responsable_audiovisual_id?: string | null
  asignado_a?: string | null
  assigned_to?: string | null
  participante_ids?: Array<string | null | undefined> | null
  participantes?: Array<string | { id?: string | null } | null | undefined> | null
  proyecto_id?: string | null
  proyecto?: RegistroConPropiedad | null
}

type PerfilEntrada = PerfilUsuario | string | { perfil?: string | null } | null | undefined

const perfilesValidos = new Set<string>(PERFILES_OFICIALES)

export function normalizarPerfil(perfil: PerfilEntrada): PerfilUsuario | null {
  const valor = typeof perfil === "string" ? perfil : perfil?.perfil
  const normalizado = String(valor || "").trim().toLowerCase()
  return perfilesValidos.has(normalizado) ? normalizado as PerfilUsuario : null
}

export function alcanceModulo(perfil: PerfilEntrada, modulo: ModuloPermiso): AlcancePermiso {
  const rol = normalizarPerfil(perfil)
  if (!rol) return "NINGUNO"
  return normalizarAlcance(MATRIZ_MODULOS[modulo]?.[rol])
}

export function puedeVerModulo(perfil: PerfilEntrada, modulo: ModuloPermiso) {
  return !esSinAcceso(alcanceModulo(perfil, modulo))
}

export function puedeEjecutarAccion(
  perfil: PerfilEntrada,
  modulo: ModuloPermiso,
  accion: AccionPermiso,
  contexto?: ContextoPermiso
) {
  const rol = normalizarPerfil(perfil)
  if (!rol) return false

  const alcance = normalizarAlcance(MATRIZ_ACCIONES[modulo]?.[accion]?.[rol] ?? MATRIZ_MODULOS[modulo]?.[rol])
  if (esSinAcceso(alcance)) return false
  if (esAccesoTotal(alcance)) return true
  if (esSoloLectura(alcance)) return accion === "ver"

  const registro = contexto?.registro || contexto?.proyecto
  if (esPropio(alcance)) return esPropioPorModulo(rol, modulo, registro, contexto)
  if (esAsignado(alcance)) return esRegistroAsignadoAUsuario(registro, contexto?.usuarioId)
  if (esEquipo(alcance)) return perteneceAlEquipo(registro, contexto)

  return false
}

export function puede(
  perfil: PerfilEntrada,
  modulo: ModuloPermiso,
  accion: AccionPermiso,
  contexto?: ContextoPermiso
) {
  return puedeEjecutarAccion(perfil, modulo, accion, contexto)
}

export function puedeVerInformacionSensible(perfil: PerfilEntrada, tipoInformacion: InformacionSensible) {
  const rol = normalizarPerfil(perfil)
  if (!rol) return false
  return !esSinAcceso(MATRIZ_INFORMACION_SENSIBLE[tipoInformacion]?.[rol])
}

export function dashboardScope(perfil: PerfilEntrada) {
  const alcance = alcanceModulo(perfil, "dashboard")
  return {
    alcance,
    total: esAccesoTotal(alcance),
    equipo: esEquipo(alcance),
    propio: esPropio(alcance),
    asignado: esAsignado(alcance),
    lectura: esSoloLectura(alcance),
    sinAcceso: esSinAcceso(alcance),
  }
}

export function esResponsableDelProyecto(registro: RegistroConPropiedad | null | undefined, usuarioId?: string | null): boolean {
  if (!registro || !usuarioId) return false
  const ids = idsPropiedad(registro)
  return ids.includes(usuarioId) || esResponsableDelProyecto(registro.proyecto, usuarioId)
}

export function perteneceAlEquipo(registro: RegistroConPropiedad | null | undefined, contexto?: ContextoPermiso): boolean {
  if (!registro || !contexto) return false
  const equipoIds = new Set((contexto.equipoIds || []).filter(Boolean).map(String))
  const proyectoIds = new Set((contexto.proyectoIds || []).filter(Boolean).map(String))

  if (contexto.usuarioId && esResponsableDelProyecto(registro, contexto.usuarioId)) return true
  if (idsPropiedad(registro).some(id => equipoIds.has(id))) return true
  if (registro.proyecto_id && proyectoIds.has(registro.proyecto_id)) return true

  return perteneceAlEquipo(registro.proyecto, contexto)
}

export function filtrarPorAlcance<T extends RegistroConPropiedad>(
  rows: T[],
  perfil: PerfilEntrada,
  modulo: ModuloPermiso,
  contexto?: ContextoPermiso
) {
  const alcance = alcanceModulo(perfil, modulo)
  if (esSinAcceso(alcance)) return []
  if (esAccesoTotal(alcance) || esSoloLectura(alcance)) return rows

  return rows.filter(row => {
    const ctx = { ...contexto, registro: row }
    if (esPropio(alcance)) return esPropioPorModulo(normalizarPerfil(perfil), modulo, row, contexto)
    if (esAsignado(alcance)) return esRegistroAsignadoAUsuario(row, contexto?.usuarioId)
    if (esEquipo(alcance)) return perteneceAlEquipo(row, ctx)
    return false
  })
}

const ROLES_AUDIOVISUAL_ACCESO_TOTAL: PerfilUsuario[] = [
  "superadmin",
  "gerente_general",
  "gerente_produccion",
  "controller",
]

const ROLES_AUDIOVISUAL_CREADOR: PerfilUsuario[] = [
  ...ROLES_AUDIOVISUAL_ACCESO_TOTAL,
  "productor",
  "audiovisual",
]

export function filtrarRequerimientosAudiovisualesPorAlcance<T extends RegistroConPropiedad>(
  rows: T[],
  perfil: PerfilEntrada,
  contexto?: ContextoPermiso
) {
  const rol = normalizarPerfil(perfil)
  const usuarioId = contexto?.usuarioId
  if (!rol || !usuarioId) return []
  if (ROLES_AUDIOVISUAL_ACCESO_TOTAL.includes(rol)) return rows

  return rows.filter(row => {
    if (row.responsable_audiovisual_id === usuarioId) return true
    if (row.productor_id === usuarioId) return true
    if (ROLES_AUDIOVISUAL_CREADOR.includes(rol) && row.creado_por === usuarioId) return true
    if (rol === "productor") {
      return esProductorAsignadoProyecto({ id: usuarioId, perfil: rol }, row.proyecto || row, usuarioId)
    }
    return false
  })
}

function esPropioPorModulo(
  rol: PerfilUsuario | null,
  modulo: ModuloPermiso,
  registro: RegistroConPropiedad | null | undefined,
  contexto?: ContextoPermiso
) {
  if (rol === "productor" && moduloDependeDeProyecto(modulo)) {
    const proyectoIds = new Set((contexto?.proyectoIds || []).filter(Boolean).map(String))
    if (registro?.proyecto_id && proyectoIds.has(String(registro.proyecto_id))) return true
    return esProductorAsignadoProyecto({ id: contexto?.usuarioId, perfil: rol }, registro, contexto?.usuarioId)
  }
  return esResponsableDelProyecto(registro, contexto?.usuarioId)
}

function moduloDependeDeProyecto(modulo: ModuloPermiso) {
  return [
    "dashboard",
    "proyectos",
    "proformas",
    "gestor",
    "rq",
    "liquidaciones",
    "caja_chica",
    "envios_materiales",
    "traslados",
    "calendario",
    "reporteria",
  ].includes(modulo)
}

function esRegistroAsignadoAUsuario(registro: RegistroConPropiedad | null | undefined, usuarioId?: string | null): boolean {
  if (!registro || !usuarioId) return false
  const asignados = [
    registro.asignado_a,
    registro.assigned_to,
    registro.responsable_id,
    registro.responsable_principal_id,
    registro.responsable_audiovisual_id,
  ].filter(Boolean).map(String)

  if (asignados.includes(usuarioId)) return true
  if (registro.participante_ids?.filter(Boolean).map(String).includes(usuarioId)) return true
  if (registro.participantes?.some(participante => {
    if (!participante) return false
    return typeof participante === "string" ? participante === usuarioId : participante.id === usuarioId
  })) return true

  return esRegistroAsignadoAUsuario(registro.proyecto, usuarioId)
}

function idsPropiedad(registro: RegistroConPropiedad | null | undefined) {
  if (!registro) return []
  const productorVigente = productorVigenteProyecto(registro)
  if (productorVigente) return [productorVigente].map(String)
  return [
    registro.usuario_id,
    registro.user_id,
    registro.perfil_id,
    registro.creado_por,
    registro.created_by,
    registro.solicitado_por,
    registro.productor_id,
    registro.comercial_id,
    registro.responsable_id,
  ].filter(Boolean).map(String)
}

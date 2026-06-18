export const ACCESO: Record<string, string[]> = {
  superadmin: ["*"],
  gerente_general: ["*"],
  controller: ["*"],

  administrador: [
    "/dashboard","/proyectos","/calendario","/clientes","/crm","/proformas","/buscar-items",
    "/proveedores","/biblioteca","/biblioteca-medios","/rq","/facturacion","/liquidaciones",
    "/inventario","/envios-materiales","/audiovisual","/rrhh/planilla","/rrhh/permisos",
    "/rrhh/horas-extras","/rrhh/vacaciones","/rrhh/faltas-medicas","/ia","/alertas",
    "/perfil","/tareas"
  ],

  gerente_produccion: [
    "/dashboard","/tareas","/calendario","/alertas","/crm","/clientes","/proformas",
    "/buscar-items","/biblioteca","/biblioteca-medios","/proyectos","/gestor","/audiovisual",
    "/proveedores","/rq","/inventario","/inventario/ordenes","/envios-materiales",
    "/facturacion","/liquidaciones","/rrhh/planilla","/rrhh/permisos","/rrhh/horas-extras",
    "/rrhh/vacaciones","/rrhh/faltas-medicas","/perfil","/ia"
  ],

  productor: [
    "/dashboard","/tareas","/calendario","/alertas","/crm","/clientes","/proformas",
    "/buscar-items","/biblioteca","/biblioteca-medios","/proyectos","/gestor","/audiovisual",
    "/proveedores","/rq","/inventario","/inventario/ordenes","/envios-materiales",
    "/liquidaciones","/rrhh/planilla","/rrhh/permisos","/rrhh/horas-extras",
    "/rrhh/vacaciones","/rrhh/faltas-medicas","/perfil","/ia"
  ],

  audiovisual: ["/dashboard","/tareas","/audiovisual","/biblioteca-medios","/perfil"],

  logistica: [
    "/dashboard","/calendario","/clientes","/inventario","/envios-materiales","/rq",
    "/caja-chica","/ia","/alertas","/rrhh/vacaciones","/rrhh/horas-extras",
    "/rrhh/permisos","/rrhh/faltas-medicas","/rrhh/trabajadores","/perfil","/tareas"
  ],

  comercial: [
    "/dashboard","/proyectos","/calendario","/clientes","/crm","/proformas","/buscar-items",
    "/biblioteca-medios","/caja-chica","/ia","/rrhh/vacaciones","/rrhh/horas-extras",
    "/rrhh/permisos","/rrhh/faltas-medicas","/rrhh/trabajadores","/perfil","/tareas"
  ],

  practicante: [
    "/dashboard","/proyectos","/calendario","/gestor","/clientes","/crm","/proformas",
    "/buscar-items","/biblioteca","/biblioteca-medios","/caja-chica","/ia",
    "/rrhh/vacaciones","/rrhh/horas-extras","/rrhh/permisos","/rrhh/faltas-medicas",
    "/rrhh/trabajadores","/perfil","/tareas"
  ],
}

export const ROLES_ACCESO_TOTAL = ["superadmin", "gerente_general", "controller"]

export function tieneAccesoTotal(perfil?: string | null) {
  return !!perfil && ROLES_ACCESO_TOTAL.includes(perfil)
}

export function puedeAccederRuta(perfil: string | null | undefined, ruta: string) {
  if (!perfil) return false

  const accesos = ACCESO[perfil] || []
  if (accesos.includes("*")) return true

  return accesos.some((a) => ruta === a || ruta.startsWith(a + "/"))
}

export function puedeVerFinanzasCorporativas(perfil?: string | null) {
  return tieneAccesoTotal(perfil)
}

export function puedeVerInformacionSensible(perfil?: string | null) {
  return tieneAccesoTotal(perfil)
}

export function esRolOperativo(perfil?: string | null) {
  return ["gerente_produccion", "productor", "logistica", "comercial", "audiovisual", "practicante"].includes(perfil || "")
}

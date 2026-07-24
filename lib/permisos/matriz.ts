import type { AlcancePermiso } from "./alcance"

export type PerfilUsuario =
  | "superadmin"
  | "gerente_general"
  | "controller"
  | "gerente_produccion"
  | "productor"
  | "comercial"
  | "logistica"
  | "audiovisual"
  | "administrador"
  | "practicante"

export type ModuloPermiso =
  | "dashboard"
  | "crm"
  | "clientes"
  | "proformas"
  | "gestor"
  | "proyectos"
  | "rq"
  | "compras"
  | "proveedores"
  | "inventario"
  | "ordenes_inventario"
  | "envios_materiales"
  | "traslados"
  | "liquidaciones"
  | "facturacion"
  | "caja_chica"
  | "conciliacion"
  | "flujo_caja"
  | "centro_costos_rentabilidad"
  | "finanzas"
  | "rrhh"
  | "biblioteca"
  | "biblioteca_medios"
  | "calendario"
  | "tareas"
  | "ia"
  | "alertas"
  | "reporteria"
  | "configuracion"
  | "usuarios"

export type AccionPermiso =
  | "ver"
  | "crear"
  | "editar"
  | "eliminar"
  | "duplicar"
  | "exportar"
  | "cambiar_productor"
  | "aprobar_produccion"
  | "aprobar_gerencia"
  | "aprobar_cliente"
  | "iniciar"
  | "enviar_facturacion"
  | "marcar_facturado"
  | "rechazar"
  | "reabrir"
  | "ver_costos"
  | "ver_rentabilidad"
  | "ver_facturacion"
  | "cerrar_operativo"
  | "cerrar_financiero"
  | "aprobar"
  | "rechazar"
  | "pagar"
  | "cancelar"
  | "convertir"
  | "rendir"
  | "crear_editar"
  | "eliminar"
  | "cobrar"
  | "operar"
  | "editar_cerrar"

export type InformacionSensible =
  | "precio_cliente"
  | "costo_presupuestado"
  | "costo_real"
  | "margen_proyecto"
  | "margen_pct"
  | "rentabilidad_empresa"
  | "facturas"
  | "cobranza"
  | "caja_chica_consolidada"
  | "flujo_caja"
  | "sueldos"
  | "horas_extras"
  | "prestamos"
  | "informacion_bancaria"
  | "documentos_internos"
  | "margenes"
  | "rentabilidad"
  | "utilidad_empresa"
  | "caja_consolidada"
  | "facturacion_consolidada"

export const PERFILES_OFICIALES: PerfilUsuario[] = [
  "superadmin",
  "gerente_general",
  "controller",
  "gerente_produccion",
  "productor",
  "comercial",
  "logistica",
  "audiovisual",
  "administrador",
  "practicante",
]

export const MODULOS_PERMISO: ModuloPermiso[] = [
  "dashboard",
  "crm",
  "clientes",
  "proformas",
  "gestor",
  "proyectos",
  "rq",
  "compras",
  "proveedores",
  "inventario",
  "ordenes_inventario",
  "envios_materiales",
  "traslados",
  "liquidaciones",
  "facturacion",
  "caja_chica",
  "conciliacion",
  "flujo_caja",
  "centro_costos_rentabilidad",
  "finanzas",
  "rrhh",
  "biblioteca",
  "biblioteca_medios",
  "calendario",
  "tareas",
  "ia",
  "alertas",
  "reporteria",
  "configuracion",
  "usuarios",
]

type MatrizModulos = Record<ModuloPermiso, Record<PerfilUsuario, AlcancePermiso>>
type MatrizAcciones = Partial<Record<ModuloPermiso, Partial<Record<AccionPermiso, Record<PerfilUsuario, AlcancePermiso>>>>>
type MatrizSensible = Record<InformacionSensible, Record<PerfilUsuario, AlcancePermiso>>

const sinAcceso: Record<PerfilUsuario, AlcancePermiso> = {
  superadmin: "NINGUNO",
  gerente_general: "NINGUNO",
  controller: "NINGUNO",
  gerente_produccion: "NINGUNO",
  productor: "NINGUNO",
  comercial: "NINGUNO",
  logistica: "NINGUNO",
  audiovisual: "NINGUNO",
  administrador: "NINGUNO",
  practicante: "NINGUNO",
}

export const MATRIZ_MODULOS: MatrizModulos = {
  dashboard: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "EQUIPO", productor: "PROPIO", comercial: "EQUIPO", logistica: "EQUIPO", audiovisual: "EQUIPO", administrador: "EQUIPO", practicante: "PROPIO" },
  crm: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "LECTURA", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  clientes: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "TOTAL", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "LECTURA", administrador: "LECTURA", practicante: "NINGUNO" },
  proformas: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "LECTURA", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "TOTAL", logistica: "LECTURA", audiovisual: "LECTURA", administrador: "LECTURA", practicante: "NINGUNO" },
  gestor: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "LECTURA", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "LECTURA", logistica: "LECTURA", audiovisual: "LECTURA", administrador: "LECTURA", practicante: "NINGUNO" },
  proyectos: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "LECTURA", logistica: "NINGUNO", audiovisual: "ASIGNADO", administrador: "LECTURA", practicante: "NINGUNO" },
  rq: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "LECTURA", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  compras: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "NINGUNO", logistica: "LECTURA", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  proveedores: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "TOTAL", comercial: "NINGUNO", logistica: "TOTAL", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  inventario: { superadmin: "TOTAL", gerente_general: "LECTURA", controller: "LECTURA", gerente_produccion: "TOTAL", productor: "TOTAL", comercial: "NINGUNO", logistica: "TOTAL", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  ordenes_inventario: { superadmin: "TOTAL", gerente_general: "LECTURA", controller: "LECTURA", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "TOTAL", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  envios_materiales: { superadmin: "TOTAL", gerente_general: "LECTURA", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "TOTAL", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  traslados: { superadmin: "TOTAL", gerente_general: "LECTURA", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "TOTAL", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  liquidaciones: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  facturacion: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "LECTURA", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "TOTAL", practicante: "NINGUNO" },
  caja_chica: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  conciliacion: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  flujo_caja: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  centro_costos_rentabilidad: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  finanzas: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  rrhh: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "PROPIO", productor: "PROPIO", comercial: "PROPIO", logistica: "PROPIO", audiovisual: "PROPIO", administrador: "PROPIO", practicante: "PROPIO" },
  biblioteca: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "TOTAL", comercial: "TOTAL", logistica: "TOTAL", audiovisual: "TOTAL", administrador: "TOTAL", practicante: "TOTAL" },
  biblioteca_medios: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "LECTURA", gerente_produccion: "LECTURA", productor: "LECTURA", comercial: "LECTURA", logistica: "LECTURA", audiovisual: "TOTAL", administrador: "LECTURA", practicante: "LECTURA" },
  calendario: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "TOTAL", comercial: "TOTAL", logistica: "TOTAL", audiovisual: "TOTAL", administrador: "TOTAL", practicante: "TOTAL" },
  tareas: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "PROPIO", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "PROPIO", logistica: "PROPIO", audiovisual: "PROPIO", administrador: "PROPIO", practicante: "PROPIO" },
  ia: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "TOTAL", comercial: "TOTAL", logistica: "TOTAL", audiovisual: "TOTAL", administrador: "TOTAL", practicante: "TOTAL" },
  alertas: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "PROPIO", logistica: "PROPIO", audiovisual: "PROPIO", administrador: "PROPIO", practicante: "PROPIO" },
  reporteria: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "EQUIPO", productor: "PROPIO", comercial: "EQUIPO", logistica: "EQUIPO", audiovisual: "EQUIPO", administrador: "LECTURA", practicante: "NINGUNO" },
  configuracion: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  usuarios: { superadmin: "TOTAL", gerente_general: "PROPIO", controller: "PROPIO", gerente_produccion: "PROPIO", productor: "PROPIO", comercial: "PROPIO", logistica: "PROPIO", audiovisual: "PROPIO", administrador: "PROPIO", practicante: "PROPIO" },
}

export const MATRIZ_ACCIONES: MatrizAcciones = {
  crm: {
    ver: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "LECTURA", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
    crear: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    editar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    eliminar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    convertir: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  },
  proyectos: {
    ver: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "LECTURA", logistica: "NINGUNO", audiovisual: "ASIGNADO", administrador: "LECTURA", practicante: "NINGUNO" },
    crear: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    editar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "LECTURA", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
    eliminar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    duplicar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    exportar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "LECTURA", logistica: "NINGUNO", audiovisual: "ASIGNADO", administrador: "LECTURA", practicante: "NINGUNO" },
    cambiar_productor: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    aprobar_produccion: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    aprobar_gerencia: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    aprobar_cliente: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    iniciar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    cerrar_operativo: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    enviar_facturacion: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    marcar_facturado: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    rechazar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    reabrir: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    ver_costos: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
    ver_rentabilidad: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    ver_facturacion: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "LECTURA", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "TOTAL", practicante: "NINGUNO" },
    cerrar_financiero: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  },
  proformas: {
    ver: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "LECTURA", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "TOTAL", logistica: "LECTURA", audiovisual: "LECTURA", administrador: "LECTURA", practicante: "NINGUNO" },
    crear: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    editar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    eliminar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    exportar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "LECTURA", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "TOTAL", logistica: "LECTURA", audiovisual: "LECTURA", administrador: "LECTURA", practicante: "NINGUNO" },
    aprobar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "TOTAL", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    aprobar_cliente: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "TOTAL", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  },
  rq: {
    ver: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "LECTURA", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
    crear: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
    editar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
    aprobar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    rechazar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    pagar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    cancelar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
    rendir: { superadmin: "TOTAL", gerente_general: "NINGUNO", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    eliminar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  },
  liquidaciones: {
    ver: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
    crear: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
    aprobar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  },
  facturacion: {
    ver: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "LECTURA", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "TOTAL", practicante: "NINGUNO" },
    crear_editar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "TOTAL", practicante: "NINGUNO" },
    cobrar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "TOTAL", practicante: "NINGUNO" },
  },
  inventario: {
    operar: { superadmin: "TOTAL", gerente_general: "NINGUNO", controller: "NINGUNO", gerente_produccion: "NINGUNO", productor: "NINGUNO", comercial: "NINGUNO", logistica: "TOTAL", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  },
  envios_materiales: {
    operar: { superadmin: "TOTAL", gerente_general: "NINGUNO", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "TOTAL", comercial: "NINGUNO", logistica: "TOTAL", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  },
  traslados: {
    operar: { superadmin: "TOTAL", gerente_general: "NINGUNO", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "TOTAL", comercial: "NINGUNO", logistica: "TOTAL", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  },
  tareas: {
    ver: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "EQUIPO", productor: "PROPIO", comercial: "PROPIO", logistica: "PROPIO", audiovisual: "PROPIO", administrador: "PROPIO", practicante: "PROPIO" },
    editar_cerrar: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "EQUIPO", productor: "PROPIO", comercial: "PROPIO", logistica: "PROPIO", audiovisual: "PROPIO", administrador: "PROPIO", practicante: "PROPIO" },
  },
}

export const MATRIZ_INFORMACION_SENSIBLE: MatrizSensible = {
  precio_cliente: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "LECTURA", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  costo_presupuestado: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  costo_real: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "TOTAL", productor: "PROPIO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "LECTURA", practicante: "NINGUNO" },
  margen_proyecto: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "NINGUNO", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "NINGUNO", practicante: "NINGUNO" },
  margen_pct: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  rentabilidad_empresa: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  facturas: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "NINGUNO", comercial: "LECTURA", logistica: "NINGUNO", audiovisual: "NINGUNO", administrador: "TOTAL", practicante: "NINGUNO" },
  cobranza: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", administrador: "TOTAL" },
  caja_chica_consolidada: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  flujo_caja: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  sueldos: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  horas_extras: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "EQUIPO", administrador: "LECTURA" },
  prestamos: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  informacion_bancaria: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  documentos_internos: { superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL", gerente_produccion: "LECTURA", productor: "PROPIO", comercial: "NINGUNO", logistica: "PROPIO", audiovisual: "PROPIO", administrador: "LECTURA", practicante: "NINGUNO" },
  margenes: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  rentabilidad: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  utilidad_empresa: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  caja_consolidada: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
  facturacion_consolidada: { ...sinAcceso, superadmin: "TOTAL", gerente_general: "TOTAL", controller: "TOTAL" },
}



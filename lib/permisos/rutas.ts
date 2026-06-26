import { puedeVerModulo, type ModuloPermiso, type PerfilUsuario } from "@/lib/permisos"

type RutaModulo = {
  prefix: string
  modulo?: ModuloPermiso
  perfiles?: PerfilUsuario[]
}

const RUTAS_MODULOS: RutaModulo[] = [
  { prefix: "/dashboard", modulo: "dashboard" },
  { prefix: "/tareas", modulo: "tareas" },
  { prefix: "/calendario", modulo: "calendario" },
  { prefix: "/alertas", modulo: "alertas" },
  { prefix: "/crm", modulo: "crm" },
  { prefix: "/clientes", modulo: "clientes" },
  { prefix: "/buscar-items", modulo: "biblioteca" },
  { prefix: "/biblioteca-medios", modulo: "biblioteca_medios" },
  { prefix: "/biblioteca", modulo: "biblioteca" },
  { prefix: "/proyectos", modulo: "proyectos" },
  { prefix: "/gestor", modulo: "gestor" },
  // TODO permisos: la matriz v1 no tiene modulo audiovisual dedicado; se limita a roles operativos del flujo audiovisual.
  { prefix: "/audiovisual", perfiles: ["superadmin", "gerente_general", "gerente_produccion", "productor", "audiovisual"] },
  { prefix: "/proveedores", modulo: "proveedores" },
  { prefix: "/rq", modulo: "rq" },
  { prefix: "/inventario/ordenes", modulo: "ordenes_inventario" },
  { prefix: "/inventario", modulo: "inventario" },
  { prefix: "/logistica/mi-trabajo", modulo: "traslados" },
  { prefix: "/envios-materiales", modulo: "envios_materiales" },
  { prefix: "/envio-materiales", modulo: "envios_materiales" },
  { prefix: "/logistica/traslados", modulo: "traslados" },
  { prefix: "/facturacion", modulo: "facturacion" },
  { prefix: "/liquidaciones", modulo: "liquidaciones" },
  { prefix: "/caja-chica", modulo: "caja_chica" },
  { prefix: "/gastos-oficina", modulo: "finanzas" },
  { prefix: "/flujo-caja", modulo: "flujo_caja" },
  { prefix: "/conciliacion", modulo: "conciliacion" },
  { prefix: "/centro-costos", modulo: "centro_costos_rentabilidad" },
  { prefix: "/finanzas/centro-costos", modulo: "centro_costos_rentabilidad" },
  { prefix: "/finanzas", modulo: "finanzas" },
  { prefix: "/prestamos", modulo: "finanzas" },
  { prefix: "/rrhh", modulo: "rrhh" },
  { prefix: "/reporteria", modulo: "reporteria" },
  { prefix: "/trazabilidad", modulo: "reporteria" },
  { prefix: "/admin/usuarios", modulo: "usuarios" },
  { prefix: "/perfil", modulo: "usuarios" },
  { prefix: "/ia", modulo: "ia" },
]

export function moduloPorRuta(ruta: string): ModuloPermiso | null {
  return buscarRuta(ruta)?.modulo || null
}

export function puedeVerRuta(perfil: string | null | undefined, ruta: string) {
  const regla = buscarRuta(ruta)
  if (!regla) return false
  if (regla.perfiles) return regla.perfiles.includes(perfil as PerfilUsuario)
  if (!regla.modulo) return false
  return puedeVerModulo(perfil, regla.modulo)
}

function buscarRuta(ruta: string) {
  const path = ruta.split("#")[0]?.split("?")[0] || ruta
  return RUTAS_MODULOS
    .filter(regla => path === regla.prefix || path.startsWith(regla.prefix + "/"))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]
}

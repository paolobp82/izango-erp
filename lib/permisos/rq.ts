/* eslint-disable @typescript-eslint/no-explicit-any */
export function rolNormalizadoPerfil(perfil: any) {
  return String(perfil?.perfil || "").trim().toLowerCase()
}

export function rqEstadoFinal(estado: string) {
  return ["pagado", "cerrado", "cancelado", "rechazado"].includes(String(estado || ""))
}

export function rolesEditoresRQPorEstado(estado: string) {
  const mapa: Record<string, string[]> = {
    pendiente_aprobacion: ["productor", "gerente_produccion", "gerente_general", "controller", "superadmin"],
    aprobado_produccion: ["gerente_produccion", "gerente_general", "controller", "superadmin"],
    aprobado: ["gerente_general", "controller", "superadmin"],
    programado: ["controller", "superadmin"],
  }

  return mapa[String(estado || "")] || []
}

export function puedeEditarRQPorEstado(perfil: any, rq: any) {
  if (!perfil || !rq) return false
  if (rqEstadoFinal(rq.estado)) return false
  return rolesEditoresRQPorEstado(rq.estado).includes(rolNormalizadoPerfil(perfil))
}

export function mensajeEdicionRQPorEstado(perfil: any, rq: any) {
  if (!rq) return "Selecciona un RQ para editar."
  if (rqEstadoFinal(rq.estado)) return "Este RQ ya está cerrado financieramente y no puede editarse."

  const rol = rolNormalizadoPerfil(perfil)
  const roles = rolesEditoresRQPorEstado(rq.estado)

  if (roles.includes(rol)) return ""

  const labels: Record<string, string> = {
    productor: "Productor",
    gerente_produccion: "Gerente Producción",
    gerente_general: "Gerente General",
    controller: "Controller",
    superadmin: "Superadmin",
  }

  return "Este estado solo puede ser editado por: " + roles.map(r => labels[r] || r).join(", ") + "."
}

export function estadoRQTrasEdicion(rq: any, perfil: any) {
  const estado = String(rq?.estado || "")
  const rol = rolNormalizadoPerfil(perfil)

  if (estado === "aprobado_produccion" && ["gerente_produccion", "gerente_general", "controller", "superadmin"].includes(rol)) {
    return "pendiente_aprobacion"
  }

  if (estado === "aprobado" && ["gerente_general", "controller", "superadmin"].includes(rol)) {
    return "aprobado_produccion"
  }

  if (estado === "programado" && ["controller", "superadmin"].includes(rol)) {
    return "aprobado"
  }

  return estado
}

export function requiereReaprobacionRQ(rq: any, perfil: any) {
  return estadoRQTrasEdicion(rq, perfil) !== String(rq?.estado || "")
}

import type { AuthProfile } from "@/lib/auth-server"

const PROJECT_REPORT_ROLES = new Set([
  "superadmin",
  "gerente_general",
  "administrador",
  "controller",
  "gerente_produccion",
  "gerente_finanzas",
])

const HR_REPORT_ROLES = new Set(["superadmin", "gerente_general", "administrador", "controller"])

type ProjectAccess = {
  productor_id?: string | null
  comercial_id?: string | null
}

type WorkerAccess = {
  user_id?: string | null
}

export function canAccessProjectReport(profile: AuthProfile, project: ProjectAccess) {
  return (
    PROJECT_REPORT_ROLES.has(profile.perfil) ||
    project.productor_id === profile.id ||
    project.comercial_id === profile.id
  )
}

export function canAccessWorkerReport(profile: AuthProfile, worker: WorkerAccess) {
  return HR_REPORT_ROLES.has(profile.perfil) || worker.user_id === profile.id
}

export function canRequestRqCancellation(profile: AuthProfile, project: ProjectAccess) {
  return (
    ["superadmin", "gerente_general", "gerente_produccion", "controller"].includes(profile.perfil) ||
    project.productor_id === profile.id
  )
}

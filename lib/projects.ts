export function projectIsDeleted(project: any) {
  return Boolean(project?.deleted_at)
}

export function rowBelongsToDeletedProject(row: any) {
  return Boolean(row?.proyecto_id && (!row.proyecto || projectIsDeleted(row.proyecto)))
}

export async function softDeleteProject(supabase: any, projectId: string) {
  const { error: rpcError } = await supabase.rpc("soft_delete_project", { p_project_id: projectId })
  if (!rpcError) return { error: null }

  const deletedAt = new Date().toISOString()
  const { error } = await supabase
    .from("proyectos")
    .update({ deleted_at: deletedAt })
    .eq("id", projectId)

  if (error) return { error }

  await Promise.all([
    supabase
      .from("tareas")
      .update({ estado: "cancelada" })
      .eq("proyecto_id", projectId)
      .in("estado", ["pendiente", "en_progreso", "en_revision"]),
    supabase
      .from("proyecto_tareas")
      .update({ estado: "bloqueada" })
      .eq("proyecto_id", projectId)
      .in("estado", ["pendiente", "en_progreso"]),
    supabase
      .from("audiovisual_requerimientos")
      .update({
        estado: "cancelado",
        deleted_at: deletedAt,
        cancelado_at: deletedAt,
        cancelado_motivo: "Proyecto eliminado",
      })
      .eq("proyecto_id", projectId)
      .is("deleted_at", null)
      .in("estado", ["pendiente", "en_progreso", "en_revision"]),
    supabase
      .from("requerimientos_pago")
      .update({ estado: "rechazado" })
      .eq("proyecto_id", projectId)
      .in("estado", ["pendiente_aprobacion", "aprobado_produccion"]),
  ])

  return { error: null }
}

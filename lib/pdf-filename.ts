const INVALID_WINDOWS_FILENAME_CHARS = /[<>:"/\\|?*]/g

function cleanFilenameSegment(value: unknown, fallback: string) {
  const cleaned = String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(INVALID_WINDOWS_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, "")

  if (!cleaned || cleaned === "undefined" || cleaned === "null" || cleaned === "[object Object]") {
    return fallback
  }

  return cleaned
}

export function buildPresupuestoPdfFilename({
  numeroPresupuesto,
  cliente,
  nombreProyecto,
  version,
}: {
  numeroPresupuesto?: string | number | null
  cliente?: string | null
  nombreProyecto?: string | null
  version?: string | number | null
}) {
  const numero = cleanFilenameSegment(numeroPresupuesto, "Presupuesto")
  const clienteNombre = cleanFilenameSegment(cliente, "Cliente")
  const proyectoNombre = cleanFilenameSegment(nombreProyecto, "Proyecto")
  const versionValue = cleanFilenameSegment(version, "1").replace(/^v/i, "")

  return `${numero} - ${clienteNombre} - ${proyectoNombre} - V${versionValue}.pdf`
}

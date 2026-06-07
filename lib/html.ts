export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function escapeAttribute(value: unknown) {
  return escapeHtml(value).replace(/`/g, "&#96;")
}

export function escapeUrl(value: unknown) {
  const raw = String(value ?? "")
  try {
    const url = new URL(raw)
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return "#"
    return escapeAttribute(url.toString())
  } catch {
    return "#"
  }
}

export function htmlPage(title: string, body: string) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title></head>${body}</html>`
}

export type SortDirection = "asc" | "desc"

export type SortState = {
  key: string
  direction: SortDirection
}

export function nextSortState(current: SortState, key: string): SortState {
  if (current.key !== key) return { key, direction: "asc" }
  return { key, direction: current.direction === "asc" ? "desc" : "asc" }
}

function normalizeSortValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "number") return value
  if (value instanceof Date) return value.getTime()
  const text = String(value)
  const numeric = Number(text)
  if (text.trim() !== "" && Number.isFinite(numeric)) return numeric
  const timestamp = Date.parse(text)
  if (/^\d{4}-\d{2}-\d{2}/.test(text) && Number.isFinite(timestamp)) return timestamp
  return text.toLocaleLowerCase("es-PE")
}

export function sortRows<T>(rows: T[], sort: SortState, getValue: (row: T, key: string) => unknown) {
  if (!sort.key) return [...rows]
  const direction = sort.direction === "asc" ? 1 : -1
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const av = normalizeSortValue(getValue(a.row, sort.key))
      const bv = normalizeSortValue(getValue(b.row, sort.key))
      if (av === null && bv === null) return a.index - b.index
      if (av === null) return 1
      if (bv === null) return -1
      if (av < bv) return -1 * direction
      if (av > bv) return 1 * direction
      return a.index - b.index
    })
    .map(item => item.row)
}

export function sortIndicator(sort: SortState, key: string) {
  if (sort.key !== key) return "↕"
  return sort.direction === "asc" ? "↑" : "↓"
}

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, Search, X } from "lucide-react"
import { V2Popover } from "@/components/v2/system"
import { puedeVerRuta } from "@/lib/permisos/rutas"
import { V2_NAVIGATION, isV2Admin, type V2NavItem } from "./v2-navigation.config"
import { DEFAULT_SELECTED_V2_SHORTCUTS, V2_SHORTCUTS_STORAGE_KEY } from "./v2-shortcuts.config"
import styles from "./V2ThemeScope.module.css"

function loadStoredShortcuts(): string[] {
  if (typeof window === "undefined") return DEFAULT_SELECTED_V2_SHORTCUTS
  try {
    const raw = window.localStorage.getItem(V2_SHORTCUTS_STORAGE_KEY)
    // Sin valor guardado (primera visita): mostrar los defaults.
    // Valor guardado (incluso "[]" si el usuario los quito todos): respetar la eleccion del usuario.
    if (raw === null) return DEFAULT_SELECTED_V2_SHORTCUTS
    return JSON.parse(raw)
  } catch {
    return DEFAULT_SELECTED_V2_SHORTCUTS
  }
}

function matchesQuery(sectionLabel: string, item: V2NavItem, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    item.label.toLowerCase().includes(needle) ||
    sectionLabel.toLowerCase().includes(needle) ||
    item.href.toLowerCase().includes(needle)
  )
}

export function V2TopbarShortcuts({ perfil }: { perfil?: string | null }) {
  const pathname = usePathname()
  const [selectedHrefs, setSelectedHrefs] = useState<string[]>(loadStoredShortcuts)
  const [query, setQuery] = useState("")

  useEffect(() => {
    try {
      window.localStorage.setItem(V2_SHORTCUTS_STORAGE_KEY, JSON.stringify(selectedHrefs))
    } catch {
      // no-op si localStorage no esta disponible
    }
  }, [selectedHrefs])

  // Catalogo de rutas visibles para el perfil actual, agrupado por seccion.
  // Misma fuente de navegacion que usa el sidebar (V2_NAVIGATION) y el mismo mecanismo de permisos (puedeVerRuta).
  const visibleSections = useMemo(() => {
    return V2_NAVIGATION.map((section) => ({
      section: section.section,
      items: section.items.filter((item) => (item.adminOnly ? isV2Admin(perfil) : puedeVerRuta(perfil, item.href))),
    })).filter((section) => section.items.length > 0)
  }, [perfil])

  const itemsByHref = useMemo(() => {
    const map = new Map<string, V2NavItem>()
    visibleSections.forEach((section) => section.items.forEach((item) => map.set(item.href, item)))
    return map
  }, [visibleSections])

  const filteredSections = useMemo(() => {
    if (!query.trim()) return visibleSections
    return visibleSections
      .map((section) => ({
        section: section.section,
        items: section.items.filter((item) => matchesQuery(section.section, item, query)),
      }))
      .filter((section) => section.items.length > 0)
  }, [visibleSections, query])

  const selectedShortcuts = selectedHrefs
    .map((href) => itemsByHref.get(href))
    .filter((item): item is V2NavItem => Boolean(item))

  function addShortcut(href: string) {
    setSelectedHrefs((prev) => (prev.includes(href) ? prev : [...prev, href]))
  }

  function removeShortcut(href: string) {
    setSelectedHrefs((prev) => prev.filter((item) => item !== href))
  }

  return (
    <nav aria-label="Atajos personales" className={styles.shortcutsBar}>
      <div className={styles.shortcutsScroll}>
        {selectedShortcuts.map((shortcut) => {
          const Icon = shortcut.icon
          const active = pathname === shortcut.href || pathname.startsWith(`${shortcut.href}/`)
          return (
            <span className={`${styles.shortcutChip} ${active ? styles.shortcutChipActive : ""}`} key={shortcut.href}>
              <Link className={styles.shortcutChipLink} href={shortcut.href}>
                {Icon ? <Icon size={13} strokeWidth={2.6} /> : null}
                {shortcut.label}
              </Link>
              <button
                aria-label={`Quitar atajo ${shortcut.label}`}
                className={styles.shortcutChipRemove}
                onClick={() => removeShortcut(shortcut.href)}
                type="button"
              >
                <X size={11} strokeWidth={3} />
              </button>
            </span>
          )
        })}
      </div>

      <div className={styles.shortcutAddWrap}>
        <V2Popover
          align="start"
          ariaLabel="Agregar atajo"
          placement="bottom"
          onOpenChange={(open) => {
            if (!open) setQuery("")
          }}
          trigger={
            <button aria-label="Agregar atajo" className={styles.iconButton} title="Agregar atajo" type="button">
              <Plus size={16} />
            </button>
          }
        >
          <div className={styles.shortcutPanel}>
            <div className={styles.shortcutSearchWrap}>
              <Search className={styles.shortcutSearchIcon} size={13} />
              <input
                aria-label="Buscar modulo"
                className={styles.shortcutSearchInput}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar modulo..."
                type="text"
                value={query}
              />
            </div>

            <div className={styles.shortcutSectionList}>
              {filteredSections.length === 0 ? (
                <p className={styles.shortcutEmpty}>Sin resultados para tu busqueda.</p>
              ) : (
                filteredSections.map((section) => (
                  <div className={styles.shortcutSectionGroup} key={section.section}>
                    <p className={styles.shortcutSectionTitle}>{section.section}</p>
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const isSelected = selectedHrefs.includes(item.href)
                      return (
                        <button
                          className={`${styles.shortcutOption} ${isSelected ? styles.shortcutOptionActive : ""}`}
                          key={item.href}
                          onClick={() => (isSelected ? removeShortcut(item.href) : addShortcut(item.href))}
                          type="button"
                        >
                          <span className={styles.shortcutOptionLabel}>
                            {Icon ? <Icon size={14} strokeWidth={2.4} /> : null}
                            {item.label}
                          </span>
                          {isSelected ? <X size={12} strokeWidth={2.8} /> : <Plus size={12} strokeWidth={2.8} />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </V2Popover>
      </div>
    </nav>
  )
}

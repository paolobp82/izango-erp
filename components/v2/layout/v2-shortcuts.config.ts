export const V2_SHORTCUTS_STORAGE_KEY = "izango-v2-shortcuts"

// Atajos que se muestran la primera vez que el usuario abre el shell (sin configuracion propia aun).
// Una vez que el usuario agrega o quita algo, su seleccion queda en localStorage y estos defaults dejan de aplicarse.
export const DEFAULT_SELECTED_V2_SHORTCUTS: string[] = ["/dashboard", "/crm"]

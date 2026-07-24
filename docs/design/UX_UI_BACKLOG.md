# Backlog Detallado del Izango SIG V2

Este documento recopila las incidencias, deudas técnicas y oportunidades de mejora detectadas incidentalmente en el sistema que se encuentran **fuera del alcance del rediseño puramente estético y visual V2**.

---

## 1. BACKLOG DE FASE 8

### ID-801: Inconsistencias cromáticas menores en Dark Mode
* **Sprint**: 8.1
* **Ruta**: `/admin/design-system-v2`
* **Tipo**: Visual
* **Prioridad**: BAJA
* **Descripción**: Ciertas clases secundarias de inputs o botones heredados del ThemeProvider V1 no cambian de color de texto en modo oscuro, dificultando la lectura marginal.
* **Criterio de Cierre**: Todos los campos de texto del panel del design system legibles en contraste oscuro.

### ID-802: Tooltips sin retardo de salida
* **Sprint**: 8.3
* **Ruta**: General (`V2Tooltip`)
* **Tipo**: Usabilidad
* **Prioridad**: BAJA
* **Descripción**: El tooltip parpadea si el puntero se mueve rápidamente sobre múltiples iconos de acción.
* **Criterio de Cierre**: Añadir un pequeño debounce o retardo al ocultar el componente V2Tooltip.

---

## 2. BACKLOG DE FASE 9

### ID-901: Loops potenciales en carga inicial de proyectos
* **Sprint**: 9.1
* **Ruta**: `/proyectos`
* **Tipo**: Defecto Funcional
* **Prioridad**: MEDIA
* **Descripción**: Si `supabase.auth.getUser()` falla silenciosamente o la sesión expira a mitad de sesión, `load` puede entrar en reintentos infinitos si no se maneja el estado de error de forma explícita.
* **Criterio de Cierre**: Añadir validación de catch blocks y control de timeouts.

### ID-902: Unificación de Estado "Pendiente de Facturación"
* **Sprint**: 9.1
* **Ruta**: `/proyectos` y `/rq`
* **Tipo**: Reglas de Negocio
* **Prioridad**: MEDIA
* **Descripción**: El KPI de "Pendiente de Facturación" en Proyectos V2 actualmente lee únicamente registros con `estado === "liquidado"`. Sin embargo, en otros módulos se contemplan también proyectos en estado `pendiente_facturacion`. Se requiere una definición formal del negocio para unificar el conteo.
* **Criterio de Cierre**: Unificar el conteo de proyectos basándose en la directiva unificada del Controller financiero.

---

## 3. DEUDA FUERA DE ALCANCE

### ID-1001: Bypass de RLS en consultas de perfiles de Sidebar
* **Ruta**: `/admin/usuarios` y layouts
* **Tipo**: Seguridad
* **Prioridad**: ALTA
* **Descripción**: Ciertas queries client-side leen la tabla completa de `perfiles`. Aunque la base de datos restringe la visibilidad por RLS, se deben asegurar filtros explícitos por id para evitar cargas completas inútiles.
* **Criterio de Cierre**: Agregar filtros `.eq("id", user.id)` en todas las queries de perfil del sidebar.

### ID-1002: Carga redundante de Perfil en Layouts
* **Ruta**: Global (`AppLayout` y `V2AppShell`)
* **Tipo**: Rendimiento
* **Prioridad**: ALTA
* **Descripción**: La coexistencia de dos shells monta tanto el Sidebar legacy como el V2, disparando dos consultas idénticas a la tabla de `perfiles` en cada refresco de página.
* **Criterio de Cierre**: Centralizar la carga de perfil en un contexto compartido (UserSessionContext).

---

## 4. TAREAS TRANSVERSALES DE DISEÑO V2

### DSV2-DUP-01: Dos componentes `V2FilterBar` con el mismo nombre exportado
* **Ruta**: `components/v2/filters/V2FilterBar.tsx` vs `components/v2/system/V2FilterBar.tsx`
* **Tipo**: Duplicación de arquitectura / riesgo de import incorrecto
* **Prioridad**: P1
* **Descripción**: Dos componentes distintos exportan el nombre `V2FilterBar` desde rutas de import distintas (`@/components/v2/filters` vs `@/components/v2/system`), con props completamente diferentes. El de `filters/` es el realmente usado por 14+ pantallas (Proveedores, Clientes, Proyectos, RRHH, etc.); el de `system/` no tiene consumidores reales bajo ese nombre, pero sí bajo su alias `V2Toolbar` (Dashboard, `/admin/ui-v2-shell`). Adicionalmente, `components/v2/system/V2Toolbar.tsx` es un archivo huérfano: `system/index.ts` reexporta `V2Toolbar` desde `V2FilterBar.tsx` (no desde `V2Toolbar.tsx`), así que ese archivo nunca se ejecuta.
* **Primitive objetivo**: Decidir un único `V2FilterBar` (probablemente el de `filters/`, por uso real) y renombrar/eliminar el de `system/`; eliminar o re-conectar `V2Toolbar.tsx`.
* **Esfuerzo**: Medio (toca imports en ~4 consumidores del alias `V2Toolbar`, no en los 14+ de `V2FilterBar` real).
* **Riesgo**: Bajo funcionalmente (no hay bug visual activo hoy), alto en mantenibilidad (trampa para el próximo desarrollador).
* **Estado**: PENDIENTE — documentado en Sprint 3, no resuelto (fuera del criterio de cambio mínimo justificado de ese sprint).

### DSV2-LEGACY-03: Modal "Migración de RQs" 100% legacy
* **Ruta**: `/proyectos/[id]` (tab Costos/RQ, modal condicionado por `showMigracionRQ`)
* **Archivo**: `app/proyectos/[id]/page.tsx` (~líneas 1520-1640)
* **Tipo**: Superficie con hex, sin primitives V2
* **Prioridad**: P2
* **Descripción**: Modal completo (comparación V1/V2, tabla de RQs afectados) con colores hardcodeados (`#111827`, `#e5e7eb`, `#fafafa`, `#f0fdf4`, `#92400e`, `#dc2626`) y sin `V2Modal`/`V2DataTable`/`V2Button`.
* **Primitive objetivo**: `V2Modal` + `V2DataTable` + `V2Button` + tokens.
* **Esfuerzo**: Medio-alto. **Riesgo**: Medio (lógica de comparación de versiones, cuidar no alterarla). **Estado**: PENDIENTE.

### DSV2-LEGACY-04: Modal "Pre-cuadre de costos" 100% legacy
* **Ruta**: `/proyectos/[id]` (modal condicionado por `showPreCuadre`)
* **Archivo**: `app/proyectos/[id]/page.tsx` (~líneas 1660-1750)
* **Tipo**: Superficie con hex, formulario con controles nativos sin primitive
* **Prioridad**: P2
* **Descripción**: Formulario de ítems/proveedores/costos con `<input>`/`<select>` nativos estilados a mano (hex directo) en vez de `V2Input`/`V2Select`/`V2FormField`.
* **Primitive objetivo**: `V2Modal` + `V2FormField` + `V2Input` + `V2Select`.
* **Esfuerzo**: Alto (formulario dinámico de líneas). **Riesgo**: Alto (cálculos de costeo — requiere pruebas funcionales exhaustivas antes de tocar). **Estado**: PENDIENTE.

### DSV2-LEGACY-05: 82 usos de `className="btn-*"` fuera de `V2Button`
* **Ruta**: Transversal — 18 archivos (`caja-chica`, `audiovisual/requerimientos`, `centro-costos`, `conciliacion`, `comercial/dashboard`, `gastos-oficina`, `tareas`, `finanzas/tesoreria`, `prestamos`, `rq`, `proveedores`, `proyectos/nuevo`, `facturacion`, `rrhh/planilla`, `proyectos/[id]`, `proyectos/[id]/cotizaciones/[cotId]`, entre otros)
* **Tipo**: Duplicación de botón (CSS utilitario en `globals.css` en vez del primitive)
* **Prioridad**: P1
* **Descripción**: `.btn-primary`/`.btn-secondary` (definidas en `app/globals.css`, ya consumen tokens `--v2-*` correctamente) se siguen usando como `<button className="btn-...">` en vez de `V2Button`, perdiendo `loading`, `disabled` semántico, `leadingIcon`/`trailingIcon` y variantes (`success`/`successSoft`/`danger`).
* **Primitive objetivo**: `V2Button`.
* **Esfuerzo**: Alto (18 archivos). **Riesgo**: Bajo (los colores ya son correctos vía tokens; es una migración de marcado, no de tema). **Estado**: PENDIENTE — priorizar los módulos más activos primero (Facturación, RQ, Caja Chica).

### DSV2-LEGACY-06: Clases `.badge-*` en `globals.css` sin contraste `on-*` y sin consumidores reales
* **Ruta**: `app/globals.css` (líneas 156-162)
* **Tipo**: Deuda de contraste latente + CSS muerto
* **Prioridad**: P3
* **Descripción**: `.badge-success/-warning/-info/-danger/-purple` usan `color: var(--v2-text)` sobre un `background` semántico sólido — en Dark, texto claro sobre `--v2-success:#00e676` (verde muy claro) sería casi ilegible. Hoy no tienen consumidores (`className="badge-*"` no aparece en ningún `.tsx`), por lo que el riesgo es cero mientras sigan sin usarse.
* **Primitive objetivo**: `V2Badge` (ya resuelve esto correctamente con sus propias clases).
* **Esfuerzo**: Bajo. **Riesgo**: Ninguno (código muerto). **Estado**: PENDIENTE — considerar eliminar las clases en vez de arreglarlas, si se confirma que no hay uso planeado.

### DSV2-TOKEN-02: Dos fuentes de tokens `--v2-*` sin relación documentada
* **Ruta**: `components/design-system/theme/theme.css` (`:root`, fallback global para páginas no envueltas en el shell V2) vs `components/v2/layout/V2ThemeScope.module.css` (`.themeScope`, el set más completo, usado por todas las pantallas envueltas en `V2AppShell`)
* **Tipo**: Arquitectura de tokens / riesgo de divergencia
* **Prioridad**: P1
* **Descripción**: Ambos archivos definen tokens con el mismo nombre (`--v2-success`, `--v2-danger`, etc.) y hoy están mayormente sincronizados — pero nada impide que diverjan de nuevo (ya había ocurrido con `--v2-indigo`, corregido en este sprint — ver `V2_COMPONENT_GUIDE.md` §5.4). No hay ningún comentario cruzado entre ambos archivos que documente la relación de fallback.
* **Primitive objetivo**: N/A (decisión de arquitectura, no de componente).
* **Esfuerzo**: Bajo (agregar comentarios cruzados) a Medio (si se decide consolidar en una sola fuente). **Riesgo**: Bajo. **Estado**: PENDIENTE — mínimo viable: comentar en cada archivo que el otro existe y debe mantenerse en sync.

### DSV2-DUP-02: Dashboard reimplementa barras de progreso ya cubiertas por primitives
* **Ruta**: `components/v2/dashboard/DashboardV2.module.css` (`.financialBar`/`.financialTrack`/`.statusBar`)
* **Tipo**: CSS duplicado
* **Prioridad**: P2
* **Descripción**: Estas clases reimplementan visualmente lo que `V2FinancialSummary`/`V2StatusBreakdown` (en `components/v2/system`) ya definen como primitives con su propia CSS (`.financialBar`/`.statusBreakdownBar` en `V2System.module.css`), con valores casi idénticos. Sugiere que `DashboardV2Module.tsx` construye estas barras a mano en vez de consumir los primitives existentes.
* **Primitive objetivo**: `V2FinancialSummary` / `V2StatusBreakdown`.
* **Esfuerzo**: Medio. **Riesgo**: Bajo. **Estado**: PENDIENTE.

### DSV2-SEARCH-01: Unificación del sistema de búsqueda
* **Ruta**: Global (Buscador global del shell, `/crm`, `/clientes`, `/proyectos`, `/proveedores`, `/biblioteca`, `/biblioteca-medios`, `/rq`, `/facturacion`, `/rrhh/trabajadores`, `/inventario`, `/gestor`, `/admin/usuarios`)
* **Tipo**: Consistencia UX/UI / Diseño Transversal
* **Prioridad**: MEDIA
* **Descripción**: Actualmente el ERP posee distintos buscadores con diferencias en apariencia, altura, iconografía, placeholder, estado focus, botón de limpieza, debounce, ejecución mediante Enter, búsqueda inmediata, búsqueda local o remota, loading y comportamiento responsivo. Se requiere definir un estándar transversal y un componente visual V2 reutilizable con contratos de interacción unificados.
* **Tipos de búsqueda definidos**:
  * A. Global Search
  * B. List Search
  * C. Select/Search Autocomplete
  * D. Catalog Search
  * E. Remote Search
  * F. Local Filter Search
* **Criterio de Cierre**: Todos los buscadores equivalentes deben respetar: misma altura (32px), mismo radio, mismo icono de búsqueda, mismo padding, mismo comportamiento al hacer focus/limpieza, misma respuesta al teclado (debounce o Enter), misma nomenclatura en placeholders y misma experiencia responsiva en mobile y tablet.


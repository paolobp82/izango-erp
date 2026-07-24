# Auditoria UI Translation - Google AI Studio a SIG Izango 360

Fecha: 2026-07-16
Rama local: codex/module-template-system-v1
Alcance: Sprint 3 UI Translation desde Google AI Studio

## 1. Resumen ejecutivo

Google AI Studio queda establecido como referencia visual aprobada para lenguaje de interfaz, densidad, jerarquia, App Shell, tarjetas, tablas, toolbars, fichas 360 y estados visuales. El repositorio SIG Izango 360 sigue siendo la unica fuente funcional: Next.js, Supabase, permisos, rutas, componentes reales y reglas de negocio.

La traduccion visual debe hacerse por tokens y componentes existentes. No se debe copiar la app Vite ni sus datos mock. La primera implementacion debe limitarse al App Shell y al piloto `app/clientes/page.tsx`, preservando consultas, acciones, permisos, importacion/exportacion, paginacion y rutas reales.

## 2. Stack del proyecto visual AI Studio

| Elemento | Evidencia | Decision |
|---|---|---|
| React 19 | `docs/design/ai-studio-reference/package.json` | Referencia compatible conceptualmente, no se copia runtime. |
| Vite 6 | `package.json`, `vite.config.ts` | Descartar. SIG usa Next.js 16. |
| Tailwind CSS v4 | `src/index.css` | Descartar como dependencia. Traducir a tokens CSS del SIG. |
| Lucide React | imports en `src/App.tsx` y modulos | Reutilizable si ya existe o es aceptado por el proyecto. No usar Material Symbols. |
| Motion | `package.json` | No migrar en este sprint. |
| Express | `server.ts` | Descartar. No aplica al SIG. |
| @google/genai | `package.json`, `/api/gemini/insights` | Descartar. No implementar ZIGI ni endpoints Gemini. |
| Estado local | `useState` en `src/App.tsx`, CRM, Proyectos y Finanzas | Descartar como fuente de datos. SIG usa Supabase real. |
| Datos mock | `mockClients`, `mockExtendedProjects` | Descartar. No copiar cifras ni registros. |

## 3. Elementos visuales reutilizables

| Elemento | Patron en AI Studio | Destino SIG | Decision |
|---|---|---|---|
| App Shell | Sidebar fijo de 240px, topbar de 64px, canvas navy/light | `components/layout/Sidebar.tsx`, `components/layout/AppLayout.tsx` | Adaptar. |
| Sidebar | Superficie `#0d1c2d`, grupos densos, activo con borde verde | `Sidebar.tsx` | Adaptar con tokens, preservando permisos y rutas. |
| Topbar | Barra fija, buscador compacto, acciones a derecha | `AppLayout.tsx`, `BusquedaGlobal.tsx`, `Notificaciones.tsx` | Adaptar sin cambiar funcionalidad. |
| Busqueda global | Input oscuro `#122131`, icono Search, ancho 256px | `BusquedaGlobal.tsx` | Adaptar visualmente manteniendo queries reales. |
| Navegacion activa | Texto verde, borde inferior o borde lateral, fondo indigo/navy | `Sidebar.tsx`, tabs reales | Adaptar. |
| KPI cards | Cards compactas, label uppercase 9-11px, valor 18-24px | `SummaryStrip`, `ExecutiveSummary`, `KpiCard` | Reutilizar/adaptar. |
| Toolbars | Filtros compactos, inputs pequenos, acciones agrupadas | `ModuleToolbar`, `FiltersBar` | Reutilizar. |
| Tablas | Header uppercase pequeno, hover suave, filas densas | `DataTable` | Reutilizar/adaptar. |
| Badges | Pills pequenas por estado | `StatusBadge`, `Badge` | Reutilizar. |
| Modales | Overlay oscuro, panel blanco, formulario seccionado | `Drawer`, `Modal`, `FormField` | Adaptar en futuros sprints; no copiar forms AI. |
| Tabs | Borde inferior, activo con verde/brand | `ContextTabs`, tabs de modulos | Reutilizar. |
| Fichas 360 | Header de entidad + metric strip + tabs + secciones | `Detail360Template`, futuros Cliente/Proyecto 360 | Adaptar despues del piloto. |
| Cards | Bordes suaves, radio 8-12px, sombras leves | `Card`, `SectionCard`, `WidgetContainer` | Reutilizar con tokens. |
| Estados loading/empty/error | No esta centralizado en AI, pero hay empty states | `ModuleLoadingState`, `ModuleEmptyState`, `ModuleErrorState` | Reutilizar. |
| Dark Mode | Local `isDarkMode` en App | ThemeProvider SIG | Adaptar via tokens, no copiar estado local. |
| Light Mode | Canvas blanco/slate | ThemeProvider SIG | Adaptar via tokens. |

## 4. Elementos que NO deben migrarse

- Vite, Express, `server.ts` y configuracion de desarrollo del prototipo.
- `@google/genai` y endpoint `/api/gemini/insights`.
- `mockClients`, `mockExtendedProjects` ni cifras en dolares.
- Estado local que sustituye Supabase, por ejemplo `clients`, `activeModule`, `activeClientId`, `paymentRequests`, `projectSettlements`.
- Navegacion local de `src/App.tsx` basada en `activeModule`.
- Selector local de cuentas del prototipo.
- ZIGI Chat Widget en este sprint.
- Funciones demo: crear oportunidad, marcar factura como pagada, crear proyecto mock, aprobar RQ mock, liquidar mock.
- Imagen remota de perfil de usuario del prototipo.
- Material Symbols. Si se usan iconos, deben ser del set permitido en el SIG.
- Clases Tailwind arbitrarias como fuente directa. Deben traducirse a tokens o componentes reales.
- Colores prototipo `#75ff9e` y `#5aff89` como marca principal. Deben mapearse a `#00E676` o variantes documentadas.

## 5. Mapeo archivo a archivo

| AI Studio | Rol visual | SIG destino | Decision |
|---|---|---|---|
| `src/App.tsx` sidebar | Shell, grupos, activo, usuario footer | `components/layout/Sidebar.tsx` | Adaptar. |
| `src/App.tsx` topbar | Busqueda, acciones, notificaciones, tabs superiores | `components/layout/AppLayout.tsx`, `components/BusquedaGlobal.tsx`, `components/Notificaciones.tsx` | Adaptar parcialmente. No copiar tabs locales. |
| `src/App.tsx` cliente 360 | Header entidad, metric strip, tabs, detalle | Futuro `app/clientes/[id]` o detalle 360 | Recrear futuro. No aplica al listado actual. |
| `src/components/CRMModule.tsx` | Directorio de cuentas, KPIs, toolbar, tabla compacta | `app/clientes/page.tsx`, futuro `app/crm/page.tsx` | Adaptar para Clientes; auditar para CRM futuro. |
| `src/components/DashboardModule.tsx` | Dashboard ejecutivo bento, briefing, KPIs | `app/dashboard/page.tsx` | Solo documentar. No migrar en Sprint 3. |
| `src/components/FinanceModule.tsx` | Tablas financieras, KPIs cobro/pago | `app/finanzas/dashboard/page.tsx` y submodulos Finanzas | Solo documentar. No migrar. |
| `src/components/ProjectsModule.tsx` | Listado, detalle, RQ, liquidacion mock | `app/proyectos/page.tsx`, `app/proyectos/[id]/page.tsx`, `app/rq/page.tsx`, `app/liquidaciones/page.tsx` | Solo documentar. No copiar logica. |
| `src/components/SettingsModule.tsx` | Configuracion y formularios | `app/perfil`, `app/admin`, configuracion futura | Solo documentar. No migrar. |
| `src/components/Modals.tsx` | Modal visual seccionado | `Drawer`, `Modal`, `FormField` del SIG | Adaptar patron en futuros sprints. |
| `src/index.css` | Fuente, scrollbars, microinteraccion nav | `app/globals.css` | Adaptar tokens y scrollbars. |
| `src/types.ts` | Modelo mock visual | `types/index.ts` y modelos reales | Descartar como modelo funcional. |

## 6. Matriz de decision

| Patron | Decision | Motivo |
|---|---|---|
| Paleta navy de shell | Adaptar | Alinea el look aprobado, pero debe tokenizarse. |
| Verde prototipo `#75ff9e` | Descartar como primary | La paleta oficial define `#00E676`. |
| Sidebar 240px | Reutilizar | Coincide con App Shell real y densidad esperada. |
| Topbar 64px | Reutilizar | Ya existe en `AppLayout`. |
| Boton quick create del prototipo | Descartar | En SIG depende de rutas/permisos reales. |
| Tabs de `activeModule` | Descartar | La navegacion real es por rutas Next.js y sidebar. |
| KPI strip compacto | Adaptar | Ya existe `SummaryStrip`. |
| Tabla compacta CRM | Adaptar | Usar `DataTable`; no duplicar tabla. |
| Modal AI Studio | Recrear futuro | Debe usar `Drawer/FormField` y datos reales. |
| Cliente VIP/LTV | Descartar en Clientes listado | No existe fuente real actual en `clientes`. |
| Acciones mock de oportunidad | Descartar | No corresponden a Clientes real. |
| ZIGI AI | Descartar en este sprint | Fuera de alcance. |
| Motion/animaciones | Descartar por ahora | No introducir librerias ni comportamiento visual nuevo. |

## 7. Tokens visuales a extraer

Fuente visual observada:

- Canvas dark: `#051424`.
- Sidebar dark: `#0d1c2d`.
- Superficie elevada dark: `#122131`.
- Card dark actual/prototipo: `#0d1c2d` / `#2C3A4C` segun zona.
- Bordes dark: `#3b4a3d` o slate oscuro.
- Texto dark principal: `#D4E4FA`.
- Texto dark secundario: `#BACBB9`.
- Brand prototipo: `#75ff9e` y `#5aff89`, a mapear a official `#00E676`.
- Light canvas: `#f8fafc` / blanco.
- Header tabla light: `#f9fafb`.
- Border light: `#e2e8f0` / `#DCE3EE`.

Tokens semanticos requeridos para `app/globals.css`:

- `--brand-primary`, `--brand-primary-hover`, `--brand-primary-active`.
- `--canvas`.
- `--surface-sidebar`, `--surface-topbar`, `--surface-card`, `--surface-card-elevated`, `--surface-table-header`, `--surface-table-row`, `--surface-table-row-hover`, `--surface-active`.
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`.
- `--border-subtle`, `--border-strong`.
- `--status-success`, `--status-warning`, `--status-danger`, `--status-info`, `--status-neutral`.
- `--sidebar-active-bg`, `--sidebar-active-text`, `--sidebar-active-border`.

## 8. Estado del SIG real antes de implementar

| Archivo | Estado observado | Riesgo |
|---|---|---|
| `app/globals.css` | Ya contiene Hanken Grotesk, tokens `--iz-*`, dark/light y utilidades legacy. | Requiere agregar alias semanticos sin romper consumidores actuales. |
| `components/layout/Sidebar.tsx` | Usa permisos reales `puedeVerRuta`, rutas reales, collapse, usuario real y version. | Tiene colores hardcodeados y conserva `#75FF9E`. Debe tokenizarse con cuidado. |
| `components/layout/AppLayout.tsx` | Carga perfil real, protege auth route, topbar real con busqueda y notificaciones. | No debe copiar top tabs de AI Studio. |
| `components/BusquedaGlobal.tsx` | Busqueda real Supabase con permisos por alcance en proyectos. | No cambiar queries ni comportamiento; solo visual si aplica. |
| `components/Notificaciones.tsx` | Polling real cada 30s y acciones reales de lectura/eliminacion. | No tocar logica. Solo visual si aplica. |
| `app/clientes/page.tsx` | Usa Supabase real, `ImportExport`, paginacion local, acciones reales, `ListPageTemplate`. | Faltan busqueda/filtros si no existian; no inventar datos. |
| `components/design-system` | Ya tiene templates y componentes base. | Evitar duplicar componentes o redisenar globalmente sin validacion. |

## 9. Plan exacto posterior a esta auditoria

1. Crear alias semanticos en `app/globals.css` manteniendo los tokens `--iz-*` existentes.
2. Tokenizar App Shell real: `Sidebar`, `AppLayout`, `BusquedaGlobal`, `Notificaciones`, sin alterar rutas, permisos, logout ni consultas.
3. Ajustar `DataTable`, `SummaryStrip` y botones solo si el piloto Clientes lo requiere, usando tokens.
4. Migrar visualmente solo `app/clientes/page.tsx`:
   - descripcion aprobada;
   - KPIs reales disponibles: Total, Activos, Inactivos;
   - tabla compacta con acciones existentes;
   - import/export intacto;
   - paginacion intacta;
   - sin datos inventados.
5. Crear `docs/design/ai-studio-ui-translation-map.md` con componentes fuente/destino, tokens, decisiones y pendientes.
6. Actualizar `docs/product/DECISIONS.md` solo si existe o si corresponde crear la decision documental.
7. Validar TypeScript, build, diff check, ESLint focalizado y revision visual local.

## 10. Riesgos y controles

| Riesgo | Control |
|---|---|
| Romper permisos del sidebar | No tocar `puedeVerRuta` ni `ALL_NAV` salvo estilos. |
| Romper busqueda global | No cambiar queries ni filtrado. |
| Introducir datos mock | No copiar `mockClients` ni valores del prototipo. |
| Divergencia dark/light | Validar tokens en ambos temas. |
| Duplicar componentes | Usar `DataTable`, `SummaryStrip`, `ModuleToolbar`, `PageHeader`. |
| Redisenar mas de lo permitido | Limitar implementacion a shell y Clientes. |
| Cambios locales previos | No revertir. Trabajar encima con diff acotado y reporte claro. |

## 11. Conclusion

La referencia AI Studio debe tratarse como especificacion visual implementada, no como codigo funcional reutilizable. El SIG ya tiene una base de Design System y templates suficiente para traducir el lenguaje visual sin copiar la app Vite. La implementacion segura es incremental: tokens semanticos, App Shell real, piloto Clientes y validacion visual lado a lado antes de tocar CRM, Dashboard, Finanzas o Proyecto 360.

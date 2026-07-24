# Mapa UI Translation - AI Studio a SIG Izango 360

Fecha: 2026-07-16
Sprint: 3 - UI Translation desde Google AI Studio

## 1. Principio rector

Google AI Studio / Stitch es la fuente oficial de verdad visual. El codigo exportado es una especificacion de diseño implementada, no una base funcional para copiar. El SIG real en Next.js + Supabase conserva la verdad funcional: rutas, permisos, consultas, acciones y reglas de negocio.

## 2. Componentes de referencia y destino

| Referencia AI Studio | Patron visual | Destino SIG | Estado |
|---|---|---|---|
| `src/App.tsx` sidebar | Navegacion lateral navy, 240px, grupos, activo lateral | `components/layout/Sidebar.tsx` | Traducido parcialmente con tokens. |
| `src/App.tsx` topbar | Barra fija 64px, busqueda compacta, acciones derecha | `components/layout/AppLayout.tsx`, `BusquedaGlobal`, `Notificaciones` | Traducido parcialmente. |
| `src/components/CRMModule.tsx` | Listado comercial, KPIs, toolbar compacta, tabla densa | `app/clientes/page.tsx` | Piloto aplicado con datos reales. |
| `src/components/DashboardModule.tsx` | Dashboard ejecutivo bento | `app/dashboard/page.tsx` | Pendiente. No migrar en este sprint. |
| `src/components/FinanceModule.tsx` | KPIs financieros y ledger compacto | `app/finanzas/dashboard/page.tsx` | Pendiente. No migrar en este sprint. |
| `src/components/ProjectsModule.tsx` | Proyecto operativo 360, RQ, liquidacion | `app/proyectos`, `app/rq`, `app/liquidaciones` | Pendiente. No migrar en este sprint. |
| `src/components/SettingsModule.tsx` | Configuracion y formularios | `app/perfil`, `app/admin` | Pendiente. |
| `src/components/Modals.tsx` | Modal seccionado con overlay | `Drawer`, `Modal`, `FormField` | Pendiente. |
| `src/index.css` | Fuente, scrollbars y microinteracciones | `app/globals.css` | Tokens semanticos incorporados. |

## 3. Tokens extraidos

| Token SIG | Light | Dark | Fuente visual |
|---|---|---|---|
| `--brand-primary` | `#00E676` | `#00E676` | Paleta oficial, reemplaza `#75ff9e`. |
| `--brand-primary-hover` | `#00D66D` | `#00D66D` | Variante calculada. |
| `--brand-primary-active` | `#00C965` | `#00C965` | Variante calculada. |
| `--canvas` | `#FFFFFF` | `#051424` | App canvas AI Studio. |
| `--surface-sidebar` | `#0D1C2D` | `#0D1C2D` | Sidebar AI Studio. |
| `--surface-topbar` | `#FFFFFF` | `#051424` | Topbar AI Studio. |
| `--surface-card` | `#FFFFFF` | `#2C3A4C` | Cards del SIG y referencia. |
| `--surface-card-elevated` | `#F6F8FB` | `#122131` | Inputs/topbar dark AI Studio. |
| `--surface-table-header` | `#F6F8FB` | `#273647` | Tablas compactas. |
| `--surface-table-row-hover` | `#F6F8FB` | `#273647` | Hover tablas. |
| `--text-primary` | `#0B1220` | `#D4E4FA` | Texto base. |
| `--text-secondary` | `#52637A` | `#BACBB9` | Texto secundario. |
| `--border-subtle` | `#DCE3EE` | `#3B4A3D` | Bordes shell/cards. |
| `--sidebar-active-bg` | indigo translucido | indigo translucido | Estado activo AI Studio. |
| `--sidebar-active-text` | `#00E676` | `#00E676` | Brand oficial. |

## 4. Decisiones aplicadas

- Se conservaron los tokens existentes `--iz-*` para no romper componentes previos.
- Se agregaron alias semanticos para traducir visualmente desde AI Studio sin hardcodear colores en cada modulo.
- El sidebar conserva rutas, permisos, usuario real, collapse y logout reales.
- La topbar conserva busqueda global y notificaciones reales.
- Clientes conserva Supabase, import/export, acciones, paginacion y eliminacion.
- La busqueda compacta en Clientes es client-side sobre los datos ya cargados; no agrega consultas nuevas.
- Los KPIs de Clientes solo usan datos reales disponibles: total, activos e inactivos.

## 5. Elementos descartados

- Mock data.
- Endpoint Gemini y ZIGI.
- Dolares del prototipo.
- `activeModule` y navegacion local.
- Formularios mock de oportunidad, facturas y proyectos.
- Material Symbols.
- Imagen remota de perfil del prototipo.
- Motion y animaciones nuevas.

## 6. Dependencias funcionales preservadas

| Modulo | Dependencias preservadas |
|---|---|
| Sidebar | `puedeVerRuta`, perfil autenticado, `supabase.auth.signOut`, version branding. |
| AppLayout | carga de usuario, perfiles, redirects de login, busqueda global, notificaciones. |
| BusquedaGlobal | queries reales a proyectos/clientes/proveedores/facturas/leads/items y filtro por alcance. |
| Notificaciones | polling, marcar leida, marcar todas, eliminar, navegar por enlace. |
| Clientes | `clientes.select(*)`, importacion, exportacion, paginacion, eliminar, links a cliente/proyectos/nuevo proyecto. |

## 7. Diferencias pendientes

- Falta comparacion visual lado a lado con capturas Dark/Light en localhost.
- El sidebar aun usa simbolos textuales como iconos; se debe evaluar migracion controlada a iconografia real en otro sprint.
- `ImportExport` conserva su UI propia y no fue migrado visualmente.
- Acciones de fila en Clientes siguen como botones compactos, no menu contextual, para no arriesgar funciones existentes.
- El listado Clientes no tiene detalle 360 en esta ruta; la ficha 360 queda para sprint posterior.
- No se migraron Dashboard, CRM completo, Proyectos, Finanzas ni Settings.

## 8. Proximos modulos recomendados

1. Validar visualmente Clientes y App Shell con Paolo.
2. Ajustar diferencias residuales de tokens si aparecen en capturas.
3. Migrar CRM completo usando los patrones ya validados.
4. Migrar Dashboard Ejecutivo solo despues de congelar KPIs y permisos visuales.
5. Migrar Proyecto 360 por secciones, no como reescritura completa.

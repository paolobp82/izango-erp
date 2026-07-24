# BASELINE UX/UI Y CONTRATO DE ARQUITECTURA VISUAL V2 — IZANGO ERP 360

---

## 1. ESTADO DEL BASELINE
* **BASELINE**: CONGELADO
* **FASE**: 7 CERRADA
* **PRÓXIMO SPRINT**: 8.1 — LISTADOS OPERATIVOS
* **REFERENCIA DE FREEZE**: [UX_UI_FREEZE_V2.md](file:///C:/Users/user/Desktop/izango-erp/docs/design/UX_UI_FREEZE_V2.md)

---

## 2. PROPÓSITO
Este documento formaliza la **arquitectura del Layout global, la gobernanza de componentes V2 y la matriz de arquetipos** para Izango ERP 360, alineada con el lenguaje de diseño consolidado en `docs/design/sig-design-language-v2.md` y congelado en `docs/design/UX_UI_FREEZE_V2.md`.

---

## 3. ARQUITECTURA DEL SHELL ÚNICO (`AppLayout` & `V2AppShell`)

Para eliminar la duplicidad del DOM y resolver el parpadeo de Sidebars/Headers:

1. **`AppLayout` como Coordinador de Shell**:
   - Detecta la ruta activa mediante la lista oficial de rutas migradas (`v2Routes`).
   - Carga la sesión del usuario una sola vez en el nivel superior.
   - En rutas V1 (heredadas): Renderiza el layout legacy.
   - En rutas V2 (migradas): Renderiza directamente `<V2AppShell>` sin overlay de `z-index: 9000`.

2. **Dimensiones del Shell V2**:
   - Sidebar: `260px` expandido / `64px` compacto.
   - Topbar: `64px` de altura fija.
   - Fondo: `#051424` Dark Mode Enterprise.

---

## 4. CATALOGACIÓN DE COMPONENTES REUTILIZABLES V2

| COMPONENTE | RUTA EN REPOSITORIO | API PRINCIPAL | REGLA DE ADOPCIÓN |
|---|---|---|---|
| **`V2AppShell`** | `components/v2/layout/V2AppShell.tsx` | `children` | Envoltorio raíz de rutas V2. |
| **`V2PageHeader`** | `components/v2/system/V2PageHeader.tsx` | `title, subtitle, actions` | Cabecera estándar de página. |
| **`V2KpiCard`** | `components/v2/system/V2KpiCard.tsx` | `label, value, trend, tone` | Reemplaza a `KpiCard` V1. |
| **`V2FilterBar`** | `components/v2/filters/V2FilterBar.tsx` | `searchValue, quickFilters, onSearchChange` | Toolbar fija de 32px. |
| **`V2DataTable`** | `components/v2/system/V2Table.tsx` | `columns, rows, loading, empty` | Grilla densa (36px fila). |
| **`V2StatusBadge`**| `components/v2/system/V2Badge.tsx` | `tone, label` | Badges redondeados (`9999px`). |
| **`V2Button`** | `components/v2/system/V2Button.tsx` | `variant, size, icon` | Botones sharp (`4px` radius). |
| **`V2Drawer`** | `components/v2/system/V2Drawer.tsx` | `isOpen, onClose, title` | Form (420px) / Detalle (480px). |
| **`V2Modal`** | `components/v2/system/V2Modal.tsx` | `isOpen, onClose, title` | Confirmaciones críticas. |

---

## 5. ARQUETIPOS OFICIALES DE PANTALLA

1. **Listado Operativo / Financiero (`V2ListPageTemplate`)**:
   - Cabecera (`V2PageHeader`) + Tira KPIs (`V2KpiCard`) + Toolbar Filtros (`V2FilterBar`) + Tabla Densa (`V2DataTable`) + Paginación (`V2Pagination`).
2. **Ficha 360 / Detalle (`V2DetailPageTemplate`)**:
   - Cabecera compacta + Pestañas (`V2Tabs`) + Bento grid en `V2SectionCard` + Drawer de detalles (`480px`).
3. **Formulario Completo (`V2FormPageTemplate`)**:
   - Cabecera contextual + Secciones agrupadas + Barra fija inferior de acciones.
4. **Dashboard de Analítica (`V2DashboardPageTemplate`)**:
   - KPIs en grilla + visualizaciones principales + sidebar secundario opcional.

---

## 6. REGLAS OBLIGATORIAS DE RECONEXIÓN CON LA CAPA MADRE

Formalizadas tras el sprint de reconexión del detalle de Proyecto (`app/proyectos/[id]/page.tsx`) con `components/v2/system` y `components/v2/projects`:

1. **Las acciones primarias cambian de color según el tema** (Dark: verde limón de marca + texto/icono negro; Light: verde oscuro institucional + texto/icono blanco). Se resuelve exclusivamente vía `--v2-primary`/`--v2-on-primary` (alias `--v2-accent`/`--v2-accent-ink`) en `V2ThemeScope.module.css`. Ningún componente ni pantalla define estos colores de forma local.
2. **Los estados semánticos no cambian según el tema.** `success`/`warning`/`danger`/`info` (badges, `V2AlertCard`, `V2StatusBadge`) conservan su significado y paleta en Dark y Light.
3. **El workflow conserva su paleta propia.** Los círculos/steppers de flujo de negocio (p. ej. `FLUJO` en Proyectos: naranja, morado, azul, gris) no se sustituyen por el verde primario del tema ni se unifican con los badges de estado.
4. **No se permiten bordes estructurales permanentes** en cards, paneles, toolbars, tablas, drawers, modales, filtros, shell, header o tabs. La separación visual se resuelve con superficie, spacing, sombra sutil, jerarquía tipográfica y hover. Excepción: `focus-visible`, error/warning, selección, drag-and-drop y demás indicadores semánticos puntuales.
5. **No se permiten colores de acción definidos inline.** Ningún `style={{ background: "#..." }}` ni `color: "#..."` en botones o CTAs; siempre `V2Button` (o `.btn-primary`/`.btn-secondary`, que ya leen de los mismos tokens).
6. **No se permiten nuevos botones primarios fuera del primitive `V2Button`.** Cualquier CTA principal (Crear Proyecto, Nueva Cotización, Preparar pre-cuadre, Resumen Estratégico, Confirmar, Guardar, Aprobar) usa `variant="primary"`.
7. **El CSS de módulo (`*.module.css` de una pantalla o dominio) solo define composición** (grid, layout, responsive, gaps, distribución) cuando ya existe un primitive global equivalente para color/tipografía/sombra/foco. No debe redefinir colores de botón, texto global, radios, bordes, focus ring ni estados semánticos — eso vive únicamente en `V2System.module.css` / `V2ThemeScope.module.css`.
8. **Una pantalla no se considera migrada si su contenido sigue siendo visualmente legacy**, aunque esté envuelta por un shell V2 (`V2AppShell`/`V2DetailPageTemplate`). Envolver contenido legacy sin adoptar los primitives (`V2SectionCard`, `V2Button`, `V2Badge`, etc.) no cuenta como migración.

### Anti-patrones (rechazar en revisión)

```tsx
// ❌ Color de acción inline — no responde al tema
<button style={{ background: "#0F6E56", color: "#fff" }}>Confirmar</button>

// ✅ Usa el primitive; el color sigue la regla de tema automáticamente
<V2Button variant="primary">Confirmar</V2Button>
```

```css
/* ❌ Borde estructural permanente en una card en estado normal */
.miCard { border: 1px solid #e5e7eb; }

/* ✅ Separación por superficie + sombra sutil, sin borde */
.miCard { background: var(--v2-surface); box-shadow: var(--v2-shadow-sm); }
```

- Colores de estado (success/warning/danger/info) reutilizados como color de una acción/CTA (confunde "esto es un estado" con "esto es un botón").
- Duplicar tokens de color/radio/sombra dentro del CSS de un módulo cuando el primitive ya los expone vía `var(--v2-...)`.

---

## 7. GOBERNANZA TRANSVERSAL V2 (SPRINT 3 — HARDENING)

### 7.0 Nota sobre el estado "CONGELADO" (§1)

Este documento y `UX_UI_FREEZE_V2.md` declaran el baseline **CONGELADO** desde el cierre de Fase 7, con la regla explícita: *"Queda estrictamente prohibido modificar archivos de `components/v2` durante la Fase 8. Cualquier cambio requiere un ticket de auditoría formal."* Los sprints 2 a 3 de este ciclo (reconexión del detalle de Proyecto, hotfixes visuales, hardening transversal) **sí modificaron** `components/v2/system`, `components/v2/layout` y `components/v2/projects`, bajo instrucción explícita y escrita del responsable de producto en cada sprint. Se documenta aquí para que quede como registro formal — cada sprint escrito (2, 2.1, 2.2, Hotfix UI, Hotfix Visual, 2.3, 2.3.2, 3) actúa como el "ticket de auditoría" que el freeze exige. Se recomienda que un próximo sprint decida explícitamente si el freeze se **levanta** para Fase 8 o si se **actualiza** su alcance, en vez de dejarlo contradicho tácitamente.

### 7.1 Reglas obligatorias (transversales, no solo Proyecto)

1. Ningún módulo nuevo puede usar hex directo salvo excepción documentada (ej. un tono verdaderamente único sin equivalente semántico, declarado en este documento).
2. Ningún botón HTML nativo (`<button>` sin clase V2) debe usarse para acciones de aplicación si existe `V2Button`/`V2IconButton`.
3. Ninguna alerta local debe crearse si `V2AlertCard` cubre el patrón (mensaje + acción única). Si el patrón requiere un control interactivo adicional (select, formulario embebido), documentar la excepción en vez de forzar el primitive.
4. Ningún grupo de acciones debe duplicar `V2QuickActions` (ver `layout="equal"|"auto"|"weighted"` antes de escribir `grid-template-columns` a mano).
5. Ningún grid label/value debe duplicar `ProjectInfoCardV2` (o el primitive equivalente) — usar `columns`/`density` antes de crear una clase de composición nueva.
6. Toda nueva variante visual (de botón, badge, alerta, etc.) debe evaluarse primero como extensión genérica de un primitive existente, nunca como clase exclusiva de una pantalla.
7. Los layouts locales (`*.module.css` de una pantalla/dominio) solo pueden definir: composición, grid, gap, responsive, alineación específica.
8. Los layouts locales NO deben definir: colores semánticos, tipografía global, variantes de botones, focus, estados base, sistema de cards (ver regla 7 de §6).
9. Toda corrección transversal (a un token o primitive en `components/v2/system` o `components/v2/layout`) debe incluir una búsqueda explícita de consumidores (`rg` por nombre del token/prop) antes de darse por cerrada.
10. Toda deuda detectada durante un sprint debe registrarse en `UX_UI_BACKLOG.md`, no solo mencionarse en el reporte de cierre del sprint.
11. Toda ruta migrada debe validarse (al menos por código, y visualmente cuando haya entorno disponible) en Light, Dark, desktop, tablet y mobile.
12. **No igualar alturas de cards por defecto.** `align-items: stretch` es el valor por defecto de CSS Grid/Flex y produce estiramientos no intencionales entre celdas vecinas con distinta cantidad de contenido (bugs reales encontrados y corregidos en Sprint 2.3/2.3.2: `.infoGrid`, `.summaryGrid`, `.clienteGrid`). Todo grid/flex de composición nueva debe declarar `align-items: start` explícitamente salvo que exista una razón funcional documentada para igualar alturas (ej. una barra de progreso rellenando su contenedor, un drawer ocupando el alto completo del viewport).
13. Bordes estructurales permanentes quedan prohibidos salvo excepción funcional documentada (ver §6 regla 4 y su lista de excepciones semánticas).

### 7.2 Familia semántica `--v2-indigo` (oficializada en Sprint 3)

`--v2-indigo` ya tenía ~10 consumidores reales (indicador de tendencia neutra en KPIs, texto de acción de `V2AlertCard`, vista de demostración en `/admin/design-system-v2`, estado "Adicional" de RQs) pero **nunca estaba definido dentro de `.themeScope`** (`V2ThemeScope.module.css`) — heredaba por cascada de CSS custom properties el `--v2-indigo` de `components/design-system/theme/theme.css` (`:root`), que por error apuntaba a un **verde de marca** (`#0F6E56`/`#71F1B3`), no a un indigo. Se definió formalmente `--v2-indigo`/`--v2-indigo-bg` (con valor indigo real, `#6366F1` Light / `#818CF8` Dark) en ambos archivos de tokens.

**Decisión documentada**: se mantiene como token de **color genérico** (`--v2-indigo`), no como token de negocio (`--v2-additional`), porque ya se usa para al menos 3 significados distintos y no relacionados (tendencia neutra de KPI, acento de acción en alertas, estado "Adicional" de RQ) — es una familia visual reutilizable, no un estado de negocio único. No se agregó `--v2-on-indigo` porque ningún consumidor actual pinta texto sobre un fondo sólido de indigo (todos lo usan como color de texto/borde/punto, o como fondo suave `-bg` con el mismo tono como texto).
- Envolver una tabla, select o card legacy en un componente V2 sin adoptar sus estilos internos ("migración de contenedor" disfrazada de migración completa).

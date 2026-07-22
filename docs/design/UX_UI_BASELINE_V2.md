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
- Envolver una tabla, select o card legacy en un componente V2 sin adoptar sus estilos internos ("migración de contenedor" disfrazada de migración completa).

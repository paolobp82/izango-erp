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

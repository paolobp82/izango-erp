# MANUAL DE LENGUAJE DE DISEÑO V2 OFICIAL — IZANGO ERP 360
## ESPECIFICACIÓN NORMATIVA Y CONTRATO DE ARQUITECTURA VISUAL

---

## 1. PROPÓSITO Y ALCANCE

Este documento establece la **especificación técnica normativamente congelada del Design System V2 de Izango ERP 360**. Governing a la totalidad de las interfaces del sistema (Comercial, Operaciones, Finanzas, RRHH), este manual reemplaza cualquier interpretación arbitraria previa y consolida las reglas de `DESIGN.md` con los patrones técnicos extraídos del baseline de Google Stitch.

---

## 2. ARQUITECTURA DE TEMA Y SUPERFICIES (DARK ENTERPRISE BASELINE)

El lenguaje visual de Izango SIG V2 adopta como estándar exclusivo el **Dark Mode Enterprise (`#051424`)** para evitar fatiga visual en entornos densos de administración operativa y financiera.

### Matriz de Tokens de Superficie (Layering Tonal):
* **`surface` / `background`:** `#051424` (Fondo general de la aplicación).
* **`surface-container-lowest`:** `#010f1f` (Fondo de sidebars y barras de control base).
* **`surface-container-low`:** `#0d1c2d` (Fondo de paneles secundarios y contenedores colapsables).
* **`surface-container`:** `#122131` (Superficie estándar para tarjetas, tables y listas).
* **`surface-container-high`:** `#1c2b3c` (Tarjetas destacadas y cabeceras de tabla).
* **`surface-container-highest` / `surface-bright`:** `#273647` (Superficie para overlays, drawers y modales).
* **`on-surface`:** `#d4e4fa` (Texto principal de alto contraste sobre superficies oscuras).
* **`on-surface-variant`:** `#bacbb9` (Texto secundario, etiquetas y metadatos).

---

## 3. SEMÁNTICA DE COLOR Y TOKENS DE ESTADO

* **Marca Primaria (`primary`):** `#75ff9e` en Dark / `#03E373` en Light (ver Regla de Acciones Primarias abajo).
* **Contenedor Primario (`primary-container`):** `#00e676` (Fondo para botones de acción principal y estados activos).
* **Texto sobre Primario (`on-primary`):** `#000000` en Dark / `#FFFFFF` en Light (ver Regla de Acciones Primarias abajo).
* **Borde Principal (`outline`):** `#859585` (Línea de contención sutil de 1px).
* **Borde Secundario (`outline-variant`):** `#3b4a3d` (Divisor de celdas y rejillas internas).
* **Éxito (`success`):** `#00e676` (Proyectos activos, cobros completados, RQs pagados).
* **Advertencia (`warning`):** `#f59e0b` (Aprobaciones pendientes, montos en revisión).
* **Peligro / Error (`error` / `danger`):** `#ffb4ab` / `#93000a` (Alertas críticas, RQs rechazados, desvíos presupuestales).
* **Información (`info`):** `#2563eb` (Estados intermedios, notas informativas).

### 3.1 Regla de Acciones Primarias y CTAs (obligatoria)

El color de fondo y de texto/ícono de toda acción primaria o CTA (p. ej. Crear Proyecto, Nueva Cotización, Preparar pre-cuadre, Resumen Estratégico, Confirmar, Guardar, Aprobar) depende del tema activo:

| Tema  | Background (`primary` / `accent`) | Texto (`on-primary` / `accent-ink`) | Ícono |
|-------|------------------------------------|--------------------------------------|-------|
| Dark  | Brand Lime `#75ff9e`               | Negro `#000000`                      | Negro `#000000` |
| Light | Brand Green `#03E373`              | Blanco `#FFFFFF`                     | Blanco `#FFFFFF` |

Esta regla **no aplica** a los círculos de estado del workflow ni a los badges de estado (success/warning/danger/info), que conservan sus colores semánticos definidos arriba. Toda pantalla nueva y toda migración a V2 debe respetar esta tabla automáticamente vía los tokens `--v2-primary`/`--v2-on-primary` (o sus alias `--v2-accent`/`--v2-accent-ink`) — no se deben hardcodear colores de CTA.

---

## 4. TIPOGRAFÍA NORMATIVA (**HANKEN GROTESK**)

El sistema utiliza **exclusivamente la familia tipográfica Hanken Grotesk**, optimizada para alta densidad de información:

| ROL DE TEXTO | TAMAÑO (FONT-SIZE) | PESO (FONT-WEIGHT) | ALTURA DE LÍNEA (LINE-HEIGHT) | LETTER-SPACING |
|---|---|---|---|---|
| **Display** | 48px | Bold (700) | 56px | `-0.02em` |
| **Headline Large** | 32px | SemiBold (600) | 40px | `-0.01em` |
| **Headline Medium**| 24px | SemiBold (600) | 32px | `0` |
| **Title Large** | 18px | SemiBold (600) | 24px | `0` |
| **Body Large** | 16px | Regular (400) | 24px | `0` |
| **Body Medium** | 14px | Regular (400) | 20px | `0` |
| **Label Medium** | 12px | Medium (500) | 16px | `0.05em` |

---

## 5. REGLAS DE LAYOUT, GRID Y DIMENSIONES FIJAS

* **Sidebar Expandido:** **`260px`** de ancho fijo.
* **Sidebar Compacto:** **`64px`** de ancho fijo en modo colapsado.
* **Topbar Global:** **`64px`** de altura fija con borde inferior `#3b4a3d`.
* **Margen de Página:** **`24px`** en Desktop (`>1024px`), **`16px`** en Mobile (`<768px`).
* **Gutter Grid:** **`24px`** de espacio horizontal entre columnas.
* **Grilla Principal:** Grid híbrida fluida-fija de **12 columnas**.

---

## 6. RADIOS (BORDER RADIUS) Y FORMA

* **Controles Interactivos (Inputs, Selects, Botones, Cards):** Corner radius técnico estricto de **`4px`** (`0.25rem`).
* **Insignias de Estado (Status Badges / Chips):** Forma píldora completamente redondeada de **`9999px`**.
* **Modales y Drawers:** Corner radius de **`4px`** en contenedores de diálogo para preservar la estética limpia corporativa.

---

## 7. ELEVACIÓN, PROFUNDIDAD Y BORDES

* **Elevación Plana:** Se prohíbe el uso de sombras proyectadas pesadas (`box-shadow`). La profundidad se logra mediante la alternancia de contrastes tonales entre `surface` (`#051424`) y `surface-container` (`#122131`).
* **Bordes:** Todos los contenedores de datos utilizan un borde continuo de `1px solid var(--v2-border)` (`#859585` u `#3b4a3d`).

---

## 8. CONTRATOS DE COMPONENTES V2

1. **`V2AppShell`**: Envoltorio único que coordina la sesión y selecciona el shell visual sin superposición de `z-index`.
2. **`V2PageHeader`**: Cabecera unificada de página con título en Hanken Grotesk 24px/32px, subtítulo y acciones secundarias.
3. **`V2KpiCard`**: Tarjeta métrica compacta con valor de 20px, etiqueta uppercase de 10px y borde semántico.
4. **`V2FilterBar`**: Toolbar fija de 32px de altura con chips de filtros activos y trigger para `V2FilterDrawer`.
5. **`V2DataTable`**: Tabla densa de 36px por fila con hover semántico. En móviles (`<768px`) se transforma automáticamente en tarjetas verticales apiladas.
6. **`V2StatusBadge`**: Chip con radio `9999px` y tonos semánticos unificados (`success`, `warning`, `error`, `info`).
7. **`V2Button`**: Botón interactivo con radio de 4px, altura de 32px (compact) o 36px (normal).
8. **`V2Drawer`**: Panel lateral deslizable de `420px` (formularios) o `480px` (detalles 360).

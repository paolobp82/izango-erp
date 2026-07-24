# IZANGO SIG — UX/UI V2 Freeze

---

## 1. IDENTIFICACIÓN DE BASELINE
* **Nombre**: IZANGO SIG — UX/UI V2 Freeze
* **Versión**: V2.0
* **Estado**: CONGELADO
* **Rama**: `codex/react-translation-layer`
* **Commit base**: `b062c1a`

---

## 2. CATALOGACIÓN DE COMPONENTES CONGELADOS
Los siguientes componentes se encuentran estabilizados y congelados. Está prohibido alterar sus interfaces (Props) o rediseñar sus estilos visuales durante la Fase 8.

### 2.1 Shell / Layout
* **`V2AppShell`** (`components/v2/layout/V2AppShell.tsx`): Estructura contenedora que maneja Sidebar, Topbar y enrutamiento visual.
* **`V2Content`** (`components/v2/layout/V2Content.tsx`): Contenedor de contenido interno del shell.
* **`V2Sidebar`** (`components/v2/layout/V2Sidebar.tsx`): Barra lateral de navegación con soporte compacto/expandido y control de acceso.
* **`V2Topbar`** (`components/v2/layout/V2Topbar.tsx`): Barra superior con información de usuario, notificaciones y búsqueda.
* **`V2ThemeScope`** (`components/v2/layout/V2ThemeScope.tsx`): Inyección de CSS variables de modo oscuro/claro de manera localizada.

### 2.2 Interacción (Form & Controls)
* **`V2Button`** (`components/v2/system/V2Button.tsx`): Botón interactivo con variantes `primary`, `secondary`, `ghost`, `danger`.
* **`V2IconButton`** (`components/v2/system/V2IconButton.tsx`): Botón para albergar exclusivamente iconos interactivos.
* **`V2Input`** (`components/v2/system/V2Input.tsx`): Campo de entrada de texto estandarizado con bordes finos.
* **`V2Select`** (`components/v2/system/V2Select.tsx`): Campo de selección con flecha personalizada y estados densificados.
* **`V2Badge`** (`components/v2/system/V2Badge.tsx`): Emblema para estados y tags redondeados.

### 2.3 Datos y Tablas
* **`V2DataTable`** (`components/v2/system/V2Table.tsx`): Grilla de visualización tabular compacta (36px de fila) con paginación y ordenamiento.
* **`V2Pagination`** (`components/v2/system/V2Pagination.tsx`): Controles de navegación de páginas en tablas.
* **`V2FilterBar`** (`components/v2/filters/V2FilterBar.tsx`): Barra flex de filtros de 32px de altura con soporte para filtros rápidos y unificados.

### 2.4 Overlays y Diálogos
* **`V2Drawer`** (`components/v2/system/V2Drawer.tsx`): Panel deslizante lateral derecho para flujos de detalle o edición contextual.
* **`V2Modal`** (`components/v2/system/V2Modal.tsx`): Caja de diálogo modal centralizada para confirmaciones críticas.
* **`V2Popover`** (`components/v2/system/V2Popover.tsx`): Tarjeta flotante para menús de acciones secundarias.
* **`V2Tooltip`** (`components/v2/system/V2Tooltip.tsx`): Tooltip flotante al pasar el ratón.
* **`V2Toast`** (`components/v2/system/V2Toast.tsx`): Sistema de notificaciones emergentes (toaster) en pantalla.

### 2.5 Utilidades y Tarjetas
* **`V2SectionCard`** (`components/v2/system/V2SectionCard.tsx`): Caja de contención con título y bordes suaves para dividir secciones.
* **`V2KpiCard`** (`components/v2/system/V2KpiCard.tsx`): Tarjeta individual de KPI con semántica de colores (tones).
* **`V2TrendIndicator`** (`components/v2/system/V2TrendIndicator.tsx`): Indicador de flecha de incremento/decremento.
* **`V2Skeleton`** (`components/v2/system/V2Skeleton.tsx`): Estado de carga simulado para elementos textuales y de grilla.

---

## 3. TEMPLATES NORMATIVOS CONGELADOS
Toda pantalla de la Fase 8 debe heredar estrictamente de uno de los siguientes 4 templates:

1. **`V2ListPageTemplate`** (Listado estándar):
   * **Arquetipo**: Listas de datos operativos o maestros.
   * **Componentes**: `V2PageHeader` + `V2FilterBar` + `V2DataTable` + `V2Pagination`.
2. **`V2DetailPageTemplate`** (Ficha o detalle):
   * **Arquetipo**: Vista 360 de una entidad (e.g. proyecto, cliente, requerimiento).
   * **Componentes**: Cabecera compacta + `V2Tabs` + Bento layout de `V2SectionCard`.
3. **`V2FormPageTemplate`** (Formularios y creación):
   * **Arquetipo**: Creación o edición de perfiles/entidades.
   * **Componentes**: Formulario de secciones divididas + Acciones fijas al fondo.
4. **`V2DashboardPageTemplate`** (Dashboards y analítica):
   * **Arquetipo**: Panel de KPIs ejecutivos y gráficos agregados.
   * **Componentes**: Header + KPIs en grilla responsive + Slots de gráficos + Sidebar opcional.

---

## 4. RUTAS CERRADAS Y CONGELADAS (FASE 7)
* **`/proveedores`**: Migrada visualmente al arquetipo listado estándar (`V2ListPageTemplate`). Commit `4fbf211`.
* **`/admin/usuarios`**: Migrada visualmente al arquetipo listado estándar (`V2ListPageTemplate`). Commit `efe59f3`.
* **`/biblioteca`**: Migrada visualmente al arquetipo listado estándar (`V2ListPageTemplate`). Commit `b062c1a`.

---

## 5. REGLAS DE CONGELAMIENTO Y OPERACIÓN
1. **Regresión Cero**: Queda estrictamente prohibido modificar archivos de `components/v2` durante la Fase 8. Cualquier cambio requiere un ticket de auditoría formal.
2. **Coexistencia de Estilos**: No mezclar componentes V1 en layouts V2.
3. **Lógica Intacta**: La migración es 100% visual y estética. Está prohibido alterar la lógica de Supabase, RLS, permisos, API routes, autenticación o cálculos numéricos.
4. **Alineación de Casing**: Toda importación en Next.js debe respetar el casing real del sistema de archivos para evitar fallos de compilación en Vercel.

---

## 6. PLANIFICACIÓN DE LA FASE 8 (PENDIENTE)

### 8.1 Listados Operativos
* `/buscar-items`
* `/inventario`
* `/inventario/ordenes`
* `/inventario/ubicaciones`
* `/logistica/mi-trabajo`
* `/logistica/traslados`
* `/alertas`
* `/envios-materiales`

### 8.2 Listados Financieros
* `/caja-chica`
* `/rq`
* `/liquidaciones`
* `/facturacion`
* `/centro-costos`
* `/rrhh/planilla`
* `/rrhh/horas-extras`
* `/rrhh/permisos`
* `/rrhh/faltas-medicas`

### 8.3 Detalles
* `/clientes/[id]`
* `/biblioteca-medios`
* `/ia`
* `/proyectos/[id]`

### 8.4 Formularios
* `/clientes/nuevo`
* `/proyectos/nuevo`

### 8.5 Dashboards
* `/dashboard`
* `/reporteria`
* `/gestor`

---

## 7. CRITERIOS DE SALIDA OBLIGATORIOS (SPRINT GATE)
Todo sprint de la Fase 8 debe satisfacer obligatoriamente:
1. `npm run build` local exitoso (0 errores).
2. Build exitoso desde un clon limpio (`git worktree` local).
3. Focalized ESLint en verde (0 errores, 0 warnings en archivos del sprint).
4. Verificación visual adaptativa (375px / 768px / 1280px) sin desbordes.
5. `VERCEL: READY` en preview de Vercel.

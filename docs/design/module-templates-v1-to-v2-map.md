# Mapa de Traducción de Plantillas de Módulo V1 a V2

Este documento sirve como la especificación técnica de traducción y matriz de compatibilidad para migrar la arquitectura de plantillas de página de alto nivel de **Izango ERP V1** a **IZANGO SIG V2**.

---

## 1. Matriz de Traducción V1 → V2

### 1. ListPageTemplate
- **Propósito**: Estructurar listados densos de entidades con KPIs y toolbar de filtrado.
- **Props**: `header` (ReactNode), `summary` (ReactNode), `toolbar` (ReactNode), `table` (ReactNode).
- **Slots**: `header` (título principal), `summary` (KPIs), `toolbar` (controles), `table` (tabla de datos).
- **Comportamiento**: Flujo vertical con espaciado constante (`gap: var(--v2-space-5)`).
- **Dependencias**: V1: `pageLayout`. V2: `V2System.module.css` y `V2ThemeScope.module.css`.
- **Módulos que la usan**: `app/clientes/page.tsx`, `app/admin/design-system/page.tsx`.
- **Equivalente V2**: `V2ListPageTemplate`.
- **Brechas**: En V2, el espaciado debe alinearse a la grilla y permitir carga asíncrona de skeletons.
- **Riesgo de regresión**: Muy bajo, los parámetros son reactivos estándar.
- **Compatibilidad de API**: 100% compatible.

### 2. Detail360Template
- **Propósito**: Fichas detalladas con pestañas de navegación contextual.
- **Props**: `header` (ReactNode), `tabs` (ReactNode), `children` (ReactNode).
- **Slots**: `header` (título entidad/badge), `tabs` (pestañas), `children` (contenido).
- **Comportamiento**: Layout vertical donde las pestañas tienen un borde inferior unificado.
- **Módulos que la usan**: `app/proyectos/[id]/page.tsx` (V1).
- **Equivalente V2**: `V2Detail360Template`.
- **Brechas**: Ajustar pestañas al estilo V2 (resaltado verde acento y bordes sutiles).
- **Riesgo de regresión**: Medio, verificar integración de rutas.
- **Compatibilidad de API**: 100% compatible.

### 3. ModuleDashboardTemplate
- **Propósito**: Panel general del módulo con KPIs y widgets en cuadrícula responsiva.
- **Props**: `header` (ReactNode), `summary` (ReactNode), `widgets` (ReactNode).
- **Slots**: `header` (bienvenida), `summary` (tira de KPIs), `widgets` (grilla).
- **Comportamiento**: Grilla auto-ajustable con un ancho mínimo de `280px` por widget.
- **Módulos que la usan**: `app/comercial/dashboard/page.tsx` (V1).
- **Equivalente V2**: `V2ModuleDashboardTemplate`.
- **Brechas**: Convertir widgets en Bento Grid V2 usando `V2SectionCard` y `V2ChartCard`.
- **Riesgo de regresión**: Bajo.
- **Compatibilidad de API**: 100% compatible.

### 4. KanbanPageTemplate
- **Propósito**: Interfaz basada en columnas verticales para clasificar tareas o leads.
- **Props**: `header` (ReactNode), `toolbar` (ReactNode), `columns` (ReactNode).
- **Slots**: `header` (título), `toolbar` (búsqueda), `columns` (columnas kanban).
- **Comportamiento**: Contenedor horizontal con scroll interno para no desbordar el shell.
- **Módulos que la usan**: `app/crm/page.tsx` (V1).
- **Equivalente V2**: `V2KanbanPageTemplate`.
- **Brechas**: Manejar el desbordamiento horizontal y touch events de forma nativa en V2.
- **Riesgo de regresión**: Medio.
- **Compatibilidad de API**: 100% compatible.

### 5. WorkCenterTemplate
- **Propósito**: Pantalla dividida con cola de trabajo a la izquierda y detalle del item seleccionado a la derecha.
- **Props**: `header` (ReactNode), `summary` (ReactNode), `queue` (ReactNode), `detail` (ReactNode).
- **Slots**: `header` (título), `summary` (contadores), `queue` (cola), `detail` (detalle).
- **Comportamiento**: Grilla responsiva de dos columnas (`minmax(0, 1fr) minmax(300px, 420px)`).
- **Módulos que la usan**: `app/trazabilidad/page.tsx` (V1).
- **Equivalente V2**: `V2WorkCenterTemplate`.
- **Brechas**: En móvil colapsar a 1 columna.
- **Riesgo de regresión**: Bajo.
- **Compatibilidad de API**: 100% compatible.

### 6. FullFormTemplate
- **Propósito**: Formularios extensos con barra de navegación lateral y acciones persistentes abajo.
- **Props**: `header` (ReactNode), `navigator` (ReactNode), `children` (ReactNode), `actions` (ReactNode).
- **Slots**: `header` (título), `navigator` (anclas), `children` (formulario), `actions` (botones sticky).
- **Comportamiento**: Barra lateral de navegación fija de 220px a la izquierda del contenido.
- **Módulos que la usan**: `app/proyectos/nuevo/page.tsx` (V1).
- **Equivalente V2**: `V2FullFormTemplate`.
- **Brechas**: Usar `V2QuickActions` y `V2FormField` estructurados en lugar de clases manuales.
- **Riesgo de regresión**: Bajo.
- **Compatibilidad de API**: 100% compatible.

### 7. FinancialTableTemplate
- **Propósito**: Reportes financieros y balances complejos.
- **Props**: `header` (ReactNode), `summary` (ReactNode), `columns` (any[]), `rows` (any[]), `rowKey` (any).
- **Slots**: `header` (título), `summary` (totales), `columns` (columnas), `rows` (filas).
- **Comportamiento**: Renderizado directo de tablas de balances.
- **Módulos que la usan**: `app/finanzas/cuentas-por-cobrar/page.tsx` (V1).
- **Equivalente V2**: `V2FinancialTableTemplate`.
- **Brechas**: Utilizar `V2DataTable` interno con alineación monetaria correcta.
- **Riesgo de regresión**: Bajo.
- **Compatibilidad de API**: Requiere adaptación. Se actualizaron los props `columns` a `V2TableColumn<T>[]` y `rowKey` a `getRowKey: (row: T) => string` para integrarse con `V2DataTable`. Los módulos financieros que consuman esta plantilla requerirán un ajuste menor en su invocación.

### 8. SettingsPageTemplate
- **Propósito**: Formularios de configuración con pestañas superiores y layouts centrados.
- **Props**: `header` (ReactNode), `tabs` (ReactNode), `children` (ReactNode).
- **Slots**: `header` (título), `tabs` (pestañas), `children` (configuraciones).
- **Comportamiento**: Envolver el contenido en una tarjeta centradora para evitar anchos excesivos.
- **Módulos que la usan**: `app/perfil/page.tsx` (V1).
- **Equivalente V2**: `V2SettingsPageTemplate`.
- **Brechas**: Integrar layouts limpios y consistentes.
- **Riesgo de regresión**: Bajo.
- **Compatibilidad de API**: 100% compatible.

---

## 2. Arquitectura V1 vs V2

### Arquitectura V1
* **Estilo**: Estilos inline manuales en TypeScript y variables globales en `globals.css` (`var(--iz-space-*)`).
* **Componentes**: Acoplados al sistema de diseño original (`components/design-system/base.tsx`).

### Arquitectura V2
* **Ubicación**: `components/v2/templates/`
* **Estilo**: Modularizado en `V2ModuleTemplates.module.css` consumiendo tokens semánticos de `V2ThemeScope.module.css` (`var(--v2-space-*)`, `var(--v2-radius-*)`, `var(--v2-border)`).
* **Componentes**: Reutiliza exclusivamente componentes desacoplados de `components/v2/system/` (como `V2DataTable`, `V2Tabs`, `V2ExecutiveHeader`, etc.).

---

## 3. Mapeo de APIs
Se conserva la misma firma de props y tipado TypeScript de la V1 para permitir migraciones transparentes:
- `ListPageTemplate` ➔ `V2ListPageTemplate` (Estructura de props idéntica)
- `Detail360Template` ➔ `V2Detail360Template` (Estructura de props idéntica)
- `ModuleDashboardTemplate` ➔ `V2ModuleDashboardTemplate` (Estructura de props idéntica)
- `KanbanPageTemplate` ➔ `V2KanbanPageTemplate` (Estructura de props idéntica)
- `WorkCenterTemplate` ➔ `V2WorkCenterTemplate` (Estructura de props idéntica)
- `FullFormTemplate` ➔ `V2FullFormTemplate` (Estructura de props idéntica)
- `FinancialTableTemplate` ➔ `V2FinancialTableTemplate` (Adaptó `columns` y `rowKey/getRowKey` a la firma V2)
- `SettingsPageTemplate` ➔ `V2SettingsPageTemplate` (Estructura de props idéntica)

---

## 4. Decisiones de Compatibilidad
- **Estructura de props de 7 plantillas**: Siete de las ocho plantillas conservaron su estructura de props al 100% para facilitar la migración directa.
- **Excepción de V2FinancialTableTemplate**: Esta plantilla adaptó su API de columnas y rowKey (`getRowKey`) para acoplarse eficientemente a `V2DataTable`, por lo que los módulos financieros que la utilicen requerirán una adaptación durante su proceso de migración.
- **Sin Lógica de Negocio**: Ninguna plantilla realiza peticiones HTTP, consultas a Supabase ni validación de roles; todo se recibe como slots/props reactivos.

---

## 5. Diferencias Visuales Permitidas
- **Estética Dark**: Soporte integrado a nivel de layout y componentes para el tema oscuro.
- **Densidad de Información**: Reducción del espacio de márgenes inútiles de la V1 para acomodar más registros en resoluciones de 1366px y 1440px.

---

## 6. Responsabilidades de las Plantillas
- **Gestión de Grillas**: Definición del flujo flex o grid responsivo del módulo.
- **Independencia Operacional**: Aislar la estructura de la página de la lógica de carga de datos del backend.

---

## 7. Cuándo usar cada plantilla
- **V2ListPageTemplate**: Listados principales con filtros y resúmenes métricos.
- **V2Detail360Template**: Vistas detalladas de una entidad específica (ej. Proyecto 360).
- **V2ModuleDashboardTemplate**: Dashboards e informes con gráficos.
- **V2KanbanPageTemplate**: Seguimiento visual por estados (CRM/Leads).
- **V2FullFormTemplate**: Formularios largos y complejos.
- **V2SettingsPageTemplate**: Opciones de configuración.

## 8. Cuándo NO usar cada plantilla
- No utilizar `V2ListPageTemplate` si no se requiere una tabla principal de datos (usar `V2ModuleDashboardTemplate` o similar).
- No utilizar plantillas complejas si el formulario entra en un panel lateral (usar `V2Drawer` directamente).

---

## 9. Checklist de Migración de un Módulo
1. [ ] Reemplazar imports de `components/design-system` a `components/v2/templates`.
2. [ ] Validar parámetros recibidos por las plantillas.
3. [ ] Reemplazar componentes atómicos (ej. `Button`, `DataTable` a `V2Button`, `V2DataTable`).
4. [ ] Asegurar que el módulo esté envuelto en `V2AppShell`.
5. [ ] Ejecutar `npm run build` y resolver errores tipados.

## 10. Orden Recomendado de Migración
1. **Administración / Perfiles**: Menor riesgo de impacto.
2. **Clientes / Leads (CRM)**: Alta prioridad.
3. **Proyectos**: Módulo principal.
4. **Finanzas y Tesorería**: Alta complejidad de cálculos.

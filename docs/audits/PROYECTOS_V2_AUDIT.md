# Auditoría Funcional y Técnica — Módulo Proyectos V2

## 1. Resumen Ejecutivo
El módulo **Proyectos** es el núcleo operativo de **Izango ERP 360**. Conecta la preventa comercial (CRM y Cotizaciones) con la ejecución en campo (Pre-cuadre, Requerimientos de Pago/RQ, Audiovisual) y el cierre financiero (Facturación y Liquidaciones). 

Actualmente, el módulo funciona de forma monolítica, principalmente en la vista de detalle `app/proyectos/[id]/page.tsx` (160KB). Aunque es robusto a nivel de reglas de negocio, carece de una interfaz de usuario coherente con el sistema de diseño V2, sufre de acoplamiento extremo, falta de modularización, y presenta fricciones operativas que afectan el rendimiento y la experiencia del usuario (como la ausencia de un buscador de texto y la densidad excesiva).

---

## 2. Estado Actual (Archivos y Rutas)
El módulo está compuesto por las siguientes rutas y componentes principales en el repositorio:

* **Listado de Proyectos**: [app/proyectos/page.tsx](file:///C:/Users/user/Desktop/izango-erp/app/proyectos/page.tsx) (~24KB)
  * Vista de tabla simple. Filtros rápidos para Estados, selectores de Cliente, Entidad y Productor.
* **Creación de Proyectos**: [app/proyectos/nuevo/page.tsx](file:///C:/Users/user/Desktop/izango-erp/app/proyectos/nuevo/page.tsx) (~11.7KB)
  * Formulario clásico con campos: Código (auto-correlativo `IZ-XXXX`), Entidad (Perú/Selva), Nombre, Cliente, Productor, Descripción del Requerimiento, Presupuesto Referencial y Fechas.
* **Detalle 360 del Proyecto**: [app/proyectos/[id]/page.tsx](file:///C:/Users/user/Desktop/izango-erp/app/proyectos/%5Bid%5D/page.tsx) (~160KB)
  * Vista masiva estructurada en 11 secciones ancladas en una barra de navegación interna (sticky nav).
* **Edición/Visualización de Cotizaciones**:
  * [app/proyectos/[id]/cotizaciones/[cotId]/page.tsx](file:///C:/Users/user/Desktop/izango-erp/app/proyectos/%5Bid%5D/cotizaciones/%5BcotId%5D/page.tsx) (~82KB)
  * [app/proyectos/[id]/cotizaciones/[cotId]/preview/page.tsx](file:///C:/Users/user/Desktop/izango-erp/app/proyectos/%5Bid%5D/cotizaciones/%5BcotId%5D/preview/page.tsx)
* **Lógica del Negocio Centralizada**:
  * Reglas de Ciclo de Vida: [lib/core/lifecycle/proyectos.ts](file:///C:/Users/user/Desktop/izango-erp/lib/core/lifecycle/proyectos.ts)
  * Reglas de Validación: [lib/core/business-rules/proyectos.ts](file:///C:/Users/user/Desktop/izango-erp/lib/core/business-rules/proyectos.ts)
  * Validación de Cierre: [lib/proyecto-cierre-financiero.ts](file:///C:/Users/user/Desktop/izango-erp/lib/proyecto-cierre-financiero.ts)
  * Matriz de Autorización: [lib/permisos/proyectos.ts](file:///C:/Users/user/Desktop/izango-erp/lib/permisos/proyectos.ts) y [lib/permisos/matriz.ts](file:///C:/Users/user/Desktop/izango-erp/lib/permisos/matriz.ts)

---

## 3. Mapa Funcional
El flujo del proyecto abarca las siguientes fases y reglas de negocio:

### A. Creación y Vinculación
* **Código**: Se autogenera un correlativo prefijado como `IZ-` sumado al número máximo de proyecto registrado en la BD.
* **Cliente**: Es obligatorio asociar el proyecto a un cliente (`cliente_id`).
* **CRM**: El CRM puede convertir un Lead ganado directamente en un Proyecto y Cliente.
* **Cotizaciones (Proformas)**: Se pueden crear múltiples versiones de cotizaciones (V1, V2...). Cada cotización tiene items detallados por familias.

### B. Aprobación y Pre-Cuadre (Inicio Operativo)
* **Aprobación de Cotización**: La cotización debe ser aprobada por el Cliente. Una vez aprobada:
  1. Su ID se asigna en `cotizacion_aprobada_id` en el registro de `proyectos`.
  2. El estado del proyecto cambia a `aprobado_cliente`.
* **Pre-Cuadre**: Con el proyecto en `aprobado_cliente`, el Productor abre la interfaz de **Pre-Cuadre** para:
  1. Dividir o ajustar items del presupuesto del proyecto.
  2. Asignar obligatoriamente un **Proveedor** (`proveedor_id`) a cada ítem.
  3. Al hacer clic en **"Confirmar y generar RQs"**:
     * Se insertan registros automáticos en `requerimientos_pago` (RQs) por cada item con proveedor en estado `pendiente_aprobacion`.
     * El proyecto se cambia de estado a `en_curso` de forma automática.
* **RQ de Adicionales**: Si el proyecto ya está `en_curso`, el Productor puede volver a abrir el Pre-Cuadre para generar RQs adicionales (marcados con `es_adicional: true`).

### C. Migración de RQs por Cambio de Versión
Si una cotización ya estaba aprobada y se genera y aprueba una **nueva versión de cotización**:
1. El sistema ejecuta una comparación detallada (`compararVersionContraAprobada`) entre items de la versión anterior vs la versión nueva.
2. Identifica ítems eliminados, mantenidos, modificados o nuevos.
3. Evalúa el impacto sobre los RQs ya generados y pagados.
4. Sugiere y ejecuta acciones de migración automáticas.

### D. Condiciones de Cierre
* **Cierre Operativo**: El proyecto avanza de `en_curso` a `terminado` y luego a `liquidado`.
* **Cierre Financiero** (`cerrado_financiero`): Requiere cumplir estrictamente:
  1. Que el estado actual sea `facturado`.
  2. Que la factura de tipo `final` asociada esté cobrada (`facturaFinalCobrada === true`).
  3. Que la liquidación del proyecto esté cerrada (`liquidacionCerrada === true`).
  4. Que cuente con aprobación explícita del Controller (`aprobadoController === true`).

---

## 4. Flujo Operativo por Rol
1. **Comercial / Negocios**:
   * *Acción*: Convierte Leads en Clientes y Proyectos. Crea la primera versión de la cotización (`borrador`).
   * *Decisión*: Fijar el presupuesto referencial y alcance técnico del cliente.
2. **Gerente de Producción**:
   * *Acción*: Revisa y asigna Productores. Valida la viabilidad técnica y aprueba la versión interna (pasa de `pendiente_aprobacion` a `aprobado_produccion`).
   * *Decisión*: ¿El equipo asignado es el correcto? ¿Los costos de cotización tienen un margen saludable?
3. **Productor**:
   * *Acción*: Ejecuta el proyecto. Realiza el **Pre-cuadre** inicial asignando proveedores, solicita requerimientos de pago (RQs), gestiona tareas y marca el proyecto como `terminado`.
   * *Decisión*: Distribución del presupuesto entre contratistas, control de costos reales.
4. **Controller**:
   * *Acción*: Revisa y aprueba RQs. Audita la liquidación final del proyecto, coteja las facturas del cliente y emite su aprobación para el cierre financiero.
   * *Decisión*: Desviación presupuestaria, consistencia de RQs contra el facturado del cliente.
5. **Gerencia General / Finanzas / Superadmin**:
   * *Acción*: Aprobación comercial final del presupuesto. Seguimiento de KPI de rentabilidad y ejecución del cierre financiero una vez cobrada la factura.

---

## 5. Estados y Transiciones de Proyectos
El ciclo de vida del proyecto está gobernado por el motor `LifecycleEngine` usando la definición `PROYECTOS_LIFECYCLE_DEFINITION`:

| Clave de Estado | Etiqueta Visible | Significado Operativo | Responsable |
|---|---|---|---|
| `pendiente_aprobacion` | Pendiente aprobación | Creado, esperando validación técnica. | Gerente Producción |
| `aprobado_produccion` | Aprobado Producción | Validado técnicamente por producción. | Gerente General |
| `aprobado_gerencia` | Aprobado Gerencia | Validado por gerencia, listo para cliente. | Comercial / Cliente |
| `aprobado_cliente` | Aprobado Cliente | El cliente aceptó el presupuesto. Listo para pre-cuadre. | Productor |
| `en_curso` | En curso | Pre-cuadre inicial completado, RQs emitidos, en ejecución. | Productor |
| `terminado` | Terminado | Ejecución finalizada. En espera de facturas de proveedores. | Productor |
| `liquidado` | Liquidado | Liquidación completada y auditada por el Controller. | Controller |
| `pendiente_facturacion` | Pendiente facturación | Liquidado, en cola para emisión de factura final. | Controller |
| `facturado` | Facturado | Factura emitida y enviada al cliente para cobro. | Controller |
| `cerrado_financiero` | Cerrado Financiero | Requisitos de cobro, liquidación y Controller cumplidos. | Superadmin |
| `rechazado` | Rechazado | Proyecto desestimado o rechazado internamente. | GG / Prod. Gerencia |
| `cancelado` | Cancelado | Proyecto abortado durante la ejecución. | GG / Prod. Gerencia |

### Precisiones sobre Estados Finales (`cerrado_financiero`, `cancelado`, `rechazado`):
* **Cambios de datos generales**: Bloqueados. No se permiten ediciones del formulario principal del proyecto.
* **Reapertura**: Bloqueada mediante transiciones directas del flujo operativo. Solo se permite reabrir mediante una acción administrativa explícita del Controller o Superadmin (`puedeEjecutarAccion(perfil, "proyectos", "reabrir", ...)`).
* **Edición Financiera**: Bloqueada. No se pueden generar RQs, modificar el presupuesto, emitir nuevas facturas de cliente o liquidar.
* **Adjuntos**: Lectura permitida. No se pueden subir nuevos documentos de evidencia operativa o facturación.
* **Trazabilidad/Acciones**: Se registran acciones administrativas en el historial de trazabilidad únicamente si son de carácter de reapertura.

---

## 6. Relaciones con Otros Módulos
* **CRM**: Recepción de Leads ganados que se convierten en proyectos.
* **Clientes**: Relación `cliente_id` requerida. Acceso a datos de contacto y facturación.
* **Proformas / Cotizaciones**: Cada proyecto tiene múltiples versiones de cotizaciones. Al aprobarse una, esta dicta el presupuesto del proyecto.
* **Gestor**: Carga de items aprobados al Gestor Operativo.
* **Audiovisual**: Generación de RQ o requerimientos específicos de equipamiento audiovisual.
* **Requerimientos de Pago (RQs)**: Generados automáticamente desde el Pre-Cuadre y vinculados a través de `proyecto_id` y `cotizacion_item_id`.
* **Liquidaciones**: Registro de métricas de rentabilidad real vs presupuestada.
* **Facturación**: Vincula las facturas emitidas bajo el `proyecto_id` para monitorear el cobro.
* **Tareas / Calendario**: Tareas de producción asociadas al proyecto.
* **Trazabilidad / Historial**: Registro log de auditoría (`registrarAccion`).

---

## 7. Auditoría de Experiencia de Usuario (Fricciones)
* **Ausencia de Buscador**: En la vista de listado (`app/proyectos/page.tsx`), no existe un input de búsqueda por texto. El usuario debe buscar visualmente o filtrar.
* **Monolito de Detalle (160KB)**: Todo se muestra en la misma página con scroll.
* **Poco Feedback en Pre-Cuadre**: Al hacer la asignación de proveedores, no se cuenta con autocompletados limpios.
* **Indicadores Financieros Escondidos**: El margen del proyecto y la desviación presupuestaria están al final del scroll.

---

## 8. Auditoría Técnica
* **Riesgo de Consulta N+1**: En la carga de cotizaciones, se ejecuta un loop que hace un select por cada cotización id. Esto debe resolverse en una fase posterior.
* **Búsqueda por RUC**: El query actual del listado **no** carga el RUC del cliente, por lo que no es posible buscar por RUC en la primera fase.

---

## 9. KPIs Reales de la Fase 1
Los KPIs representarán el **universo completo de proyectos accesibles para el usuario** (basado en el rol de acceso), no sobre la página visible actual ni sobre el filtro activo, para mantener una visión ejecutiva unificada.

1. **En curso**:
   * *Fórmula*: `proyectos.filter(p => p.estado === 'en_curso').length`
   * *Significado*: Proyectos actualmente activos en ejecución.
2. **Pendientes de liquidación**:
   * *Fórmula*: `proyectos.filter(p => p.estado === 'terminado').length`
   * *Significado*: Proyectos terminados operativamente que esperan conciliación de costos de proveedores.
3. **Pendientes de facturación**:
   * *Fórmula*: `proyectos.filter(p => p.estado === 'liquidado').length`
   * *Significado*: Proyectos con liquidación cerrada que deben pasar a cobro comercial.

> [!NOTE]
> **KPI "Presupuesto Ejecutado" Excluido**: No se implementará en el listado debido a que la consulta actual no cuenta con información de costos/gastos reales de proveedores (`costo_real` de liquidación o montos totales de RQs pagados), por lo que su significado sería ambiguo.

---

## 10. Filtros de la Fase 1
* **Búsqueda por texto**: Busca coincidencias en `p.codigo`, `p.nombre`, y `p.cliente.razon_social`. No buscará por RUC.
* **Cliente**: Selector de cliente basado en el universo de clientes activos del listado.
* **Estado**: Selector rápido de estados.
* **Productor/Responsable**: Selector basado en perfiles asignados a proyectos visibles (filtrados de la consulta de base de datos) para evitar listar usuarios administrativos o inactivos.
* **Entidad (Izango Perú / Izango Selva)**: Representa la **unidad de negocio legal/operativa** responsable de facturar el proyecto.
  * Izango Peru (IZ) -> `entidad === 'peru'`
  * Izango Selva (SEL) -> `entidad === 'selva'`
  * Se mantiene este filtro para segmentar por división operativa.

---

## 11. Alternativa Visual Propuesta
Recomendamos una **Vista Híbrida basada en V2Detail360Template** con una barra lateral izquierda de navegación sticky fija que actúe de ancla de secciones, rediseñando cada sección como una `V2SectionCard`.

---

## 12. Componentes V2 Reutilizables
* `V2ListPageTemplate`: Para el listado de proyectos.
* `V2KpiCard` (density="compact"): Para la cabecera ejecutiva.
* `V2FilterBar` + `V2ActiveFilterChip`: Para filtros de búsqueda y selección.
* `V2DataTable`: Renderizado de listados.
* `V2StatusBadge`: Visualización limpia de estados operativos.
* `V2Pagination`: Control de páginas.

---

## 13. Plan de Migración de Fase 1
* Reemplazar la vista en [app/proyectos/page.tsx](file:///C:/Users/user/Desktop/izango-erp/app/proyectos/page.tsx) utilizando `V2ListPageTemplate`, `V2FilterBar` con buscador integrado, y `V2KpiCard` compactos.
* Crear `app/proyectos/Proyectos.module.css` para estilos locales.
* Mantener intactas las consultas a base de datos y la lógica de borrado suave e importación/exportación de CSV.

# Auditoría y Plan de Migración V2 — Detalle de Proyecto (Proyecto 360)

Fecha: 2026-07-22 (actualizado con análisis de referencias reales)
Rama: `codex/react-translation-layer`
Alcance de esta entrega: **solo auditoría y planificación**. No se modificó código funcional, UI, queries, permisos ni Supabase/RLS.

## Corrección respecto a la versión anterior de este documento

La versión previa de este audit decía que el prototipo "izango-360" y las referencias Stitch no existían en el repositorio. Eso seguía siendo cierto para el repositorio, pero **sí existían como archivos ZIP** en `C:\Users\user\Downloads\izango-360.zip` y `C:\Users\user\Downloads\stitch_erp_interface_optimization (2).zip`. Los localicé, extraje y analicé por completo en esta ronda:

- **`izango-360.zip`**: prototipo funcional React (Vite + Tailwind), con estado 100% en memoria (`useState`, sin Supabase). Revisé `App.tsx`, `types.ts`, `ProjectTabs.tsx`, `ResumenView.tsx`, `CotizacionesView.tsx`, `CostosRQView.tsx`, `ClienteView.tsx`, `TareasLogisticaFacturacionView.tsx`, `RQDrawer.tsx`, `ManageApprovalModal.tsx`, `AssociateClientModal.tsx`. No fue necesario revisar `NewRQModal.tsx`/`NewCotizacionModal.tsx`/`NewProjectModal.tsx` (formularios de creación, mismo lenguaje visual ya capturado en los otros archivos) ni `DashboardView.tsx`/`ClientesDirectoryView.tsx`/`Sidebar.tsx`/`Header.tsx` (chrome de aplicación general, no específico del detalle de proyecto — el SIG real ya tiene su propio shell V2 equivalente).
- **`stitch_erp_interface_optimization (2).zip`**: 4 pantallas Stitch (`izango_360_resumen_de_proyecto_redise_o_elite`, `izango_360_cotizaciones_de_proyecto_redise_o_elite`, `izango_360_cliente_de_proyecto_redise_o_elite`, `izango_360_seguimiento_de_proyecto_redise_o_elite`), cada una con `code.html` + `screen.png`, más `elite_system/DESIGN.md`. Vi las 4 capturas directamente.

**Hallazgo importante**: la captura que se adjuntó en el prompt anterior de esta sesión ("Izango 360 - RQ" con la tarjeta de Estado de flujo + Cotizaciones de Proyecto) **es exactamente** `izango_360_cotizaciones_de_proyecto_redise_o_elite/screen.png`. No era una captura de producto real — es la referencia Stitch. Esto confirma que el Paso 4 de la entrega anterior ya estaba bien encaminado, solo le faltaba el resto del set.

**Hallazgo crítico que debes conocer antes de aprobar la arquitectura**: `elite_system/DESIGN.md` (el propio manual de origen del lenguaje visual V2 del SIG) especifica textualmente:

> *"Level 1 (Surface): Standard cards and sidebar. Defined by a 1px solid `border` token."*
> *"Borders: Always 1px. Never use black borders; always use the specific `border` tokens provided."*
> *"Cards: No shadows. 1px `border` is mandatory."*

Es decir, **el sistema de diseño "oficial" del que nace el V2 del SIG usa bordes de 1px como mecanismo de elevación explícito** — lo opuesto a las últimas rondas de esta misma sesión, donde se pidió explícitamente eliminar todo borde/sombra de 1px en botones, inputs, tablas, KPIs, drawers y shell. No estoy revirtiendo ese trabajo ni cuestionándolo — las instrucciones más recientes y repetidas del usuario son la dirección vigente del proyecto y tienen prioridad sobre el documento de origen. Solo lo señalo porque me pediste explícitamente comparar contra Stitch, y sería deshonesto no mencionar que hay una divergencia real y documentada entre la referencia "oficial" y el rumbo actual del SIG. Si en algún momento se requiere reconciliar ambos, es una decisión de producto, no algo que yo deba resolver unilateralmente aquí.

## 0. Documentos previos reutilizados

- [`docs/proyecto360-architecture-audit.md`](proyecto360-architecture-audit.md) — mapa de permisos, estados, queries Supabase, riesgos e integraciones.
- [`docs/proyecto360-refactor-plan.md`](proyecto360-refactor-plan.md) — mapa línea-por-línea, componentes/hooks candidatos, matriz de riesgos de refactor (fechado 22 jun 2026, cuando el archivo tenía 1,480 líneas; hoy tiene 2,765 — ver nota de vigencia abajo).

**Verificación de vigencia**: reconfirmé contra el código actual (2,765 líneas) que la lista de 10 tabs, `FLUJO`/`FLUJO_BREADCRUMB` y los nombres de función siguen siendo estructuralmente los mismos. Aparecieron estados nuevos no documentados en ninguno de los dos audits previos (`showMigracionRQ`, `cotizacionDestinoMigracionId`, `comparacionPendiente`, `cotizacionPendienteAprobar`) y un modal nuevo de **"Migración de RQs por cambio de versión"** (línea ~1494). Los números de línea de los documentos previos ya no son exactos; el contenido cualitativo sigue siendo válido.

---

## 1. Estado actual

### Ruta real del detalle

| Ruta | Archivo | Rol |
|---|---|---|
| `/proyectos/[id]` | `app/proyectos/[id]/page.tsx` (2,765 líneas) | Proyecto 360 — pantalla maestra única |
| `/proyectos/[id]/cotizaciones/[cotId]` | `.../cotizaciones/[cotId]/page.tsx` | Editor de cotización/proforma |
| `/proyectos/[id]/cotizaciones/[cotId]/preview` | `.../preview/page.tsx` | Preview/PDF de cotización **real** (ver nota en Cotizaciones, Paso 4) |

No existe ningún componente separado `ProjectTabs`, `ProyectoDetalle` ni `DetalleProyecto` en el SIG real — todo vive inline en `page.tsx`.

### Inventario técnico actual

| Indicador | Cantidad aprox. |
|---|---:|
| Llamadas `.from(...)` a Supabase | ~55 |
| Tablas Supabase referenciadas | 13 (incluye `facturas`, cargada pero no expuesta en UI) |
| Tabs de navegación | 10 |
| Modales | 3 (Editar proyecto, Pre-cuadre, Migración de RQs) |
| Componentes V2 usados | 0 |
| Estilos | 100% inline, sin CSS Modules |

### Componentes legacy

Todo `app/proyectos/[id]/page.tsx`: JSX con `style={{}}` inline, colores hex, 15 `alert()`/`confirm()` nativos, 3 modales `position:fixed` hechos a mano.

### Componentes V2 ya disponibles

| Componente | Ubicación | Relevancia |
|---|---|---|
| `V2DetailPageTemplate` | `components/v2/templates/V2DetailPageTemplate.tsx` | Coincide con la estructura objetivo (header+summary+tabs+main/sidebar). **Nunca usado en un módulo real**, solo en `/admin/design-system-v2`. |
| `V2Tabs` | `components/v2/system/V2Tabs.tsx` | Tabs controlados por estado (`value`/`onValueChange`) — confirma que la migración a tabs-por-clic es técnicamente directa. |
| `V2SectionCard`, `V2StatusBadge`, `V2KpiCard`, `V2DataTable`, `V2Button`, `V2IconButton` | `components/v2/system/*` | Ya usados en Dashboard/Proyectos-lista/CRM. |
| `V2IntelligencePanel` | `components/v2/system/V2IntelligencePanel.tsx` | Ya usado en Dashboard V2 para "ZIGI" con datos **reales y deterministas** (`getIntelligenceData()`, no texto generado por IA) — candidato directo para adaptar el bloque "ZIGI AI Insights" del prototipo/Stitch en Cliente, siempre que se alimente de datos reales. |
| `V2Drawer` / `V2FilterDrawer` | `components/v2/system/V2Drawer.tsx` | Manual V2 ya reserva 480px "para detalles 360" — coincide con el patrón `RQDrawer` de la referencia. |
| `V2Modal`, `V2ConfirmDialog` | `components/v2/system/*` | Reemplazo directo de los 15 `alert()`/`confirm()`. |
| `V2AlertCard` | usado en Dashboard V2 | Coincide con la tarjeta "Alertas del sistema" del prototipo/Stitch. |

---

## 2. Render tree real (URL → base de datos)

```
/proyectos/[id]
  → app/proyectos/[id]/page.tsx ("use client")
    → load()
      → auth.getUser() → perfiles
      → puedeVerModulo(perfil, "proyectos")
      → proyectos (+cliente, +productor, +cotizacion_aprobada)
      → cotizaciones (activas) + cotizacion_historial
      → cotizaciones eliminadas (recuperables, 2 días)
      → requerimientos_pago (con fallback por código compartido)
      → liquidaciones (existencia)
      → rq_version_migration_log
    → render: loading / accesoRestringido / contenido
    → contenido:
      → Modal "Migración de RQs" (condicional)
      → Cabecera + barra de acciones + nav sticky (tabsProyecto360)
      → Secciones: Cotizaciones, Costos/RQ, Resumen, Cliente, 6 placeholders
      → Modal Editar proyecto / Modal Pre-cuadre
```

Todas las secciones están montadas simultáneamente; navegación por scroll a ancla.

---

## 3. Inventario de pestañas

(sin cambios respecto al audit anterior; ver tabla completa allí). Resumen, Cotizaciones, Costos/RQ, Cliente: implementadas. Tareas, Logística, Facturación, Liquidación, Archivos, Historial: placeholder.

---

## 4. Comparación real y detallada por vista

Ver matriz completa y operativa en [`PROJECT_DETAIL_V2_MIGRATION_MATRIX.md`](PROJECT_DETAIL_V2_MIGRATION_MATRIX.md). Resumen narrativo por vista:

### Resumen

- **SIG actual**: breadcrumb de 10 estados reales, stepper, avance/regreso/rechazo de estado, selección de versión a aprobar, info económica, alertas simples (texto plano).
- **Prototipo** (`ResumenView.tsx`): bento grid — "Datos base del proyecto" (código, nombre, cliente o CTA "Asociar cliente", productor con avatar de iniciales, entidad, fechas), "Información económica básica" (presupuesto referencial, versión aprobada, monto aprobado, botón "Ver Historial Económico", botón imprimir), "Alertas del sistema" (card roja condicional con CTA "Gestionar Aprobación"), "Próximos Hitos" (timeline — **dato mockeado, no existe tabla `hitos` en Supabase**), "Vinculación de cliente" (ficha resumida o CTA asociar).
- **Stitch** (`izango_360_resumen_de_proyecto_redise_o_elite`): mismo contenido que el prototipo, pero integrado en el layout real de 10 tabs y con el sidebar V2 ya existente (Inicio/Operación/CRM — coincide con `V2_NAVIGATION` ya implementado en esta sesión).
- **Decisión**: Adaptar "Datos base" y "Información económica" (100% datos reales ya cargados: `proyecto.*`, `cotizacion_aprobada.*`). Conservar el stepper de 10 estados (no recortar a 3 pasos visuales sin aprobación explícita de producto). Adoptar "Alertas del sistema" como tarjeta destacada usando `V2AlertCard` (la lógica de alertas ya existe, solo cambia el contenedor). Adoptar "Vinculación de cliente" resumida con acceso al tab Cliente. **Descartar "Próximos Hitos"** — no hay tabla de milestones real; mostrarlo sería inventar datos, violando la regla ya aplicada en toda esta sesión.

### Cotizaciones

- **SIG actual**: tabla de versiones, aprobación cliente vía botón validado (no un select libre), historial, recuperables de 48h, **modal real de "Migración de RQs" al cambiar versión aprobada** (pieza crítica no documentada en versiones previas del audit).
- **Prototipo** (`CotizacionesView.tsx`): tarjetas por versión con checkbox "comparar", **select libre de estado** (riesgo: permite saltarse la máquina de estados real), barra de progreso de margen, iconos ver/editar/duplicar, modal de preview con desglose de IGV recalculado en el cliente, footer "¿Necesitas comparar más versiones?".
- **Stitch** (`izango_360_cotizaciones_de_proyecto_redise_o_elite`, la captura ya vista): mismas tarjetas, más la tarjeta "Estado de flujo" (que en el SIG real pertenece a Resumen, no a Cotizaciones — Stitch las funde en una sola pantalla) y un panel lateral "Acciones rápidas" (Ver Documentos, Reporte PDF) + avatares de equipo.
- **Decisión**: Adoptar el layout de tarjetas por versión (código, estado, total cliente, condición de pago ya son datos reales). **Descartar el select libre de estado** — la transición de estado de una cotización debe seguir pasando por la validación real (`marcarCotizacionAprobadaCliente`), nunca por un `<select>` que la bypasea. **Descartar el modal de preview mockeado** — el SIG ya tiene un preview PDF real y funcional en `/proyectos/[id]/cotizaciones/[cotId]/preview`; duplicarlo con un cálculo de IGV recalculado en el cliente sería peor que lo que ya existe, no mejor. Conservar intacta la lógica de migración de RQ; solo re-empacar visualmente el modal ya existente. Verificar si `margenEstimado`/`montoMargen` por versión ya se calculan en alguna parte real antes de mostrar la barra de progreso (candidato a "dato faltante").

### Costos / RQ

- **SIG actual**: resumen de versión aprobada, disponibilidad de pre-cuadre, conteo/total de RQ, tabla de RQ vinculados, modal de pre-cuadre.
- **Prototipo** (`CostosRQView.tsx`): 3 KPIs (Total RQs, Presupuesto Aprobado, Cantidad de RQs), filtro por categoría, tabla con clic-para-abrir-drawer.
- **Stitch**: no se entregó una pantalla Stitch dedicada a Costos/RQ; la referencia de drawer viene de `RQDrawer.tsx` (visible también en la captura de "Resumen", donde aparece abierto a la derecha).
- **Decisión**: Adoptar el patrón de 3 KPIs (datos reales: `rqsProyecto.length`, suma de `monto_solicitado`, `cotAprobada`). Adoptar el patrón tabla + `V2Drawer` para "Ver Detalle" de un RQ (Datos reales ya existen: `rqCodigo`, `rqIgvDetalle`, `rqTratamientoIgvLabel` — el drawer del prototipo con pestañas General/Finanzas/Documentos/Historial mapea directo sobre esos helpers). Verificar si "categoría" es un campo real de `requerimientos_pago` antes de ofrecer ese filtro. Conservar intacta la lógica crítica de generación/migración de RQ.

### Cliente

- **SIG actual**: ficha rápida, contacto, productor, accesos, resumen del proyecto actual.
- **Prototipo/Stitch** (`ClienteView.tsx` + `izango_360_cliente_de_proyecto_redise_o_elite`): Ficha rápida (razón social, RUC, dirección, contacto, correo, teléfono), "Acciones del cliente" (ver ficha completa / editar / historial / crear proyecto), **"ZIGI AI Insights"** (texto con un dato real de ejemplo — % de incremento de facturación — mezclado con una recomendación genérica), "Proyectos relacionados" (tabla con progreso), "Metadata" (última actualización + estado de sincronización ERP — **decorativo, sin dato real detrás**).
- **Decisión**: Adoptar Ficha rápida + Acciones (mismos datos reales de `proyecto.cliente`). Adoptar "Proyectos relacionados" (dato real: proyectos con el mismo `cliente_id`, ya existe un patrón equivalente en el filtro por cliente de `/proyectos`). **Adaptar con cautela** el bloque ZIGI: solo si se alimenta con datos reales siguiendo el patrón determinista ya usado en Dashboard V2 (`getIntelligenceData()`), nunca con texto generado libremente; si no existe un dato real de "facturación trimestral por cliente" disponible, dejar este bloque fuera de esta migración y tratarlo como iniciativa aparte. **Descartar** la tarjeta de "Metadata" (sync ERP falso) y el facepile de colaboradores "+2" (no hay modelo de multi-responsable por cliente en el SIG real).

### Seguimiento (Tareas / Logística / Facturación / Liquidación / Archivos / Historial)

- **SIG actual**: 6 pestañas separadas, todas placeholder (Tareas y Facturación enlazan externamente; `facturas` ya se consulta en `load()` pero no se usa en ninguna pestaña).
- **Prototipo** (`TareasLogisticaFacturacionView.tsx`) **+ Stitch** (`izango_360_seguimiento_de_proyecto_redise_o_elite`): consolidan las 6 en un solo bento grid de 6 tarjetas (Gestión de Tareas con creación de tarea **local, no persistida en Supabase**; Logística, Facturación, Liquidación, Gestor Documental y Trazabilidad como placeholders explícitos "Fase 1"). Incluye un "ZIGI Insight" flotante ("He detectado que la Fase 1 tiene 3 tareas pendientes...") con botón "Optimizar Tareas".
- **Decisión**: Adoptar el **layout** de bento grid para agrupar visualmente las 6 pestañas (reduce 6 anclas de scroll a un solo grid compacto), pero **sin adoptar la creación de tareas simulada** del prototipo — esa función no existe contra Supabase hoy; mostrarla como si funcionara sería engañoso. El grid debe seguir mostrando placeholders reales (enlaces a `/tareas`, `/facturacion`, `/liquidaciones`, igual que hoy) hasta que exista una iniciativa aparte para completarlas con datos reales. Descartar el "ZIGI Insight" flotante de esta ronda — requiere análisis real cruzando tareas/logística que no existe todavía.

---

## 5. Decisiones que resuelve esta auditoría

### 5.1 Navegación interna — **decisión final, no abierta**

Comparé las tres opciones:

1. Scroll por anclas (actual): todas las secciones montadas, sticky nav con `href="#tab-x"`.
2. Tabs por clic del prototipo: `activeTab` en estado de React (`App.tsx`), sin persistencia en URL — al recargar la página siempre vuelve a `resumen`.
3. Tabs visuales Stitch: mismo patrón visual que el prototipo, en dos variantes de agrupación de tabs ligeramente distintas entre las 4 pantallas (la de Resumen/Cotizaciones usa 10 tabs separados; la de Cliente usa 6; la de Seguimiento usa 6 pero agrupados distinto). Esta inconsistencia entre las propias pantallas Stitch confirma que el número de tabs no está resuelto ahí — se resuelve con el SIG real (10 tabs, ya congelado como tal en el audit previo).

**Decisión**: **Tabs por clic (`V2Tabs`, estado controlado), con el estado de pestaña activa persistido en la URL** vía query param (`?tab=resumen`, usando `useSearchParams` + `router.replace` con `scroll: false`, sin recarga de página). Justificación:

- Coincide con la preferencia arquitectónica que ya indicaste.
- El prototipo interactivo ya demuestra que es viable técnicamente (`App.tsx` hace exactamente esto, solo que sin persistir en URL).
- Persistir en URL es una mejora deliberada sobre el prototipo (que pierde la pestaña activa al recargar) — necesaria porque en producción real se comparten enlaces directos a una pestaña concreta (ej. "revisa el RQ de este proyecto" por Slack/correo).
- **No se desmonta lógica crítica**: `load()` y todo el estado de datos (`proyecto`, `cotizaciones`, `rqsProyecto`, etc.) siguen viviendo en `page.tsx`, fuera del árbol de tabs — cambiar de pestaña solo alterna qué sección se **renderiza**, nunca dispara una nueva carga ni resetea permisos o modales abiertos.
- Se mantienen los **10 tabs reales** del SIG (no los 6-7 consolidados de Stitch/prototipo) — ver decisión de Seguimiento arriba: la consolidación visual de Tareas/Logística/Facturación/Liquidación/Archivos/Historial se resuelve **dentro** de un único tab "Seguimiento" con bento grid, no fusionando su navegación con Resumen/Cotizaciones/Costos-RQ/Cliente. Esto reduce la barra de tabs de 10 a **5 tabs de primer nivel** (Resumen, Cotizaciones, Costos/RQ, Cliente, Seguimiento), que es un cambio real y beneficioso de IA de navegación, pero debe confirmarse contigo antes del Lote 5 (no bloquea el Lote 1).

### 5.2 Header del proyecto

Definición final:

| Elemento | Fuente | Nota |
|---|---|---|
| Breadcrumb | `Proyectos > {código} > {nombre}` | Patrón ya usado en `ProjectTabs.tsx` del prototipo; dato real |
| Código + Nombre | `proyecto.codigo`, `proyecto.nombre` | Real |
| Cliente | `proyecto.cliente?.razon_social` o CTA "Asociar cliente" si es null | Real; el estado "sin cliente" ya se maneja hoy vía el modal de edición |
| Entidad | `proyecto.entidad` (selector Perú/Selva) | Real, editable, ya existe |
| Estado | Badge con `ESTADO_LABEL`/tono, igual que en `/proyectos` (lista) | Real, reutiliza `estadoTone()` ya construido en esa página |
| Productor | Avatar de iniciales + nombre | Real; mismo patrón ya implementado en la tabla de `/proyectos` |
| Acciones principales | Editar, Reporte PDF, (condicional por permiso) Crear cotización | Reales, ya existen como botones sueltos |
| Alertas | Badge/indicador si `alertaSistema`-equivalente (alertas simples ya existentes) | Real |
| Permisos | `puedeEditar`, gates ya calculados en `page.tsx` | Sin cambios, se pasan como props |

### 5.3 Resumen — bloques exactos

1. Estado general (stepper de 10 estados + acciones de avance/rechazo) — **conservar lógica**, adaptar contenedor.
2. Métricas financieras (presupuesto referencial, versión aprobada, monto aprobado) — real, adaptar tarjeta.
3. Cronología / hitos — **descartado** (no hay dato real).
4. Datos del cliente (resumen + CTA) — real, adoptar.
5. Cotización vigente (versión aprobada, resumen) — real, ya existe.
6. RQ (conteo/total, acceso a Costos/RQ) — real, adoptar como tarjeta resumen.
7. Pendientes / alertas — real (alertas simples actuales), adoptar como `V2AlertCard`.
8. Accesos rápidos (Ver Documentos, Reporte PDF) — real, adoptar como sidebar derecho de `V2DetailPageTemplate`.

### 5.4 Cotizaciones — definición exacta

- Versión activa: `proyecto.cotizacion_aprobada_id` — real.
- Historial: `cotizacion_historial` por cotización — real, ya existe (aunque repartido, no consolidado — ver Historial en Paso 3).
- Estados de aprobación: `Borrador/Enviada/Aprobada/Descartada` reales del SIG — **no** el select libre del prototipo.
- Monto: `total_cliente` — real.
- Acciones: ver/editar (navega a `/cotizaciones/[cotId]`), duplicar (ya existe como "nueva versión"), eliminar/recuperar (48h) — reales.
- Comparación entre versiones: **ya existe y es más sofisticada que el prototipo** — el modal real de "Migración de RQs" compara ítems entre versiones al aprobar una distinta a la vigente. No se reemplaza por el simple `alert()` del prototipo.
- Envío al cliente / aprobación/rechazo: `marcarCotizacionAprobadaCliente` real.
- Drawers/modales: migrar el modal de pre-cuadre y el de migración de RQ a `V2Drawer` (patrón de 480px ya reservado en el manual V2).

### 5.5 Costos/RQ — definición exacta

- Presupuesto aprobado: `cotAprobada` — real.
- RQ emitidos / adicionales: `rqsProyecto`, ya diferenciados en el código actual — real.
- Pagado/pendiente: `rqsPendientes`/`rqsPagados` — real.
- Variación: no confirmada como dato real; no inventar, marcar como pendiente de verificación.
- Creación y migración de RQ: lógica crítica real, conservar intacta.
- Liquidación: se crea automáticamente al avanzar a `terminado` — real, sin cambios.
- Alertas: reutilizar el mismo patrón que Resumen.

### 5.6 Cliente — definición exacta

- Empresa: `proyecto.cliente.razon_social`, RUC (verificar si el campo existe en `clientes`) — real donde exista.
- Contactos: verificar si `clientes` tiene contacto/correo/teléfono como campos reales o si viven en otra tabla.
- Datos fiscales: RUC/dirección — verificar existencia real antes de mostrar.
- Responsables: productor asociado al proyecto — real.
- Documentos: no confirmado que exista un repositorio de documentos por cliente — no inventar.
- Acciones: ver ficha (`/clientes/[id]`), editar, ver proyectos relacionados, crear proyecto — todas reales, ya existen como rutas.
- Asociación/cambio de cliente: ya es posible vía el modal de edición de proyecto existente; se puede promover a una acción más visible (como `AssociateClientModal`) sin duplicar lógica.

### 5.7 Seguimiento operativo — definición exacta

- Tareas: enlace real a `/tareas?proyecto_id=...`, sin creación embebida falsa.
- Audiovisual: enlace real a `/audiovisual/requerimientos?proyecto_id=...`.
- Logística/envíos/inventario: sin datos reales embebidos hoy — placeholder con enlaces, si existen, a los módulos reales (`/logistica/traslados`, `/inventario`).
- Facturación: **hay una oportunidad real** — `facturas` ya se consulta en `load()` sin usarse; se puede mostrar un resumen real (facturado/cobrado/pendiente) en este bloque sin agregar una consulta nueva. Documentar esto como candidato de "dato real disponible pero no expuesto".
- Hitos/timeline: no hay dato real — descartar hasta que exista.

---

## 6. Arquitectura objetivo (confirmada, con una corrección)

Confirmo la arquitectura propuesta en la ronda anterior, con el ajuste de nombres pedido (`ProjectCostsSectionV2` en vez de `ProjectCostsRqSectionV2`, `ProjectTrackingSectionV2` reemplaza a los 6 placeholders individuales):

```
components/proyectos/v2/
  ProjectDetailShellV2.tsx        → envuelve V2DetailPageTemplate; NO crea un shell nuevo, es una composición delgada
  ProjectDetailHeaderV2.tsx       → arma title/subtitle/statusBadge/actions para V2PageHeader
  ProjectDetailTabsV2.tsx         → arma items para V2Tabs (5 tabs de primer nivel), sincroniza con ?tab= en la URL
  ProjectDetailContentV2.tsx      → wrapper delgado que decide qué sección mostrar según el tab activo
  sections/
    ProjectSummarySectionV2.tsx
    ProjectQuotesSectionV2.tsx
    ProjectCostsSectionV2.tsx
    ProjectClientSectionV2.tsx
    ProjectTrackingSectionV2.tsx   → bento grid de Tareas/Logística/Facturación/Liquidación/Archivos/Historial
```

**Confirmado explícitamente**: `ProjectDetailShellV2` se monta **dentro** del contenido de página (`children` de `V2AppShell`, ya provisto por `AppLayout.tsx`), nunca envuelve ni duplica sidebar/topbar. No hay shell anidado.

**Sin cambios respecto a la ronda anterior**: `page.tsx` sigue siendo dueño de `load()`, todas las mutaciones y los permisos. Las secciones son "tontas" — reciben datos y callbacks, no hacen fetch propio. No se mueven queries ni se fragmenta lógica en esta ronda; solo se define la arquitectura.

---

## 7. Lote 1 — alcance exacto (confirmado tras el análisis de referencias)

**Incluye únicamente**:

- `ProjectDetailShellV2` (envoltorio de `V2DetailPageTemplate`).
- `ProjectDetailHeaderV2` (breadcrumb, código, nombre, cliente, entidad, estado, productor, acciones principales — ver definición exacta en 5.2).
- Navegación por tabs (`ProjectDetailTabsV2` + `V2Tabs`, con persistencia en `?tab=`) — **5 tabs de primer nivel**: Resumen, Cotizaciones, Costos/RQ, Cliente, Seguimiento.
- Estados `loading` / `error` / `not-found` (usando los slots ya provistos por `V2DetailPageTemplate`: `state="loading"|"error"|"empty"`).
- Preservación completa de la lógica actual: `load()`, todas las mutaciones, todos los permisos, sin tocar ninguna query.
- **Contenido legacy montado temporalmente dentro del nuevo shell**: el JSX interno de cada sección (Resumen, Cotizaciones, Costos/RQ, Cliente, y el bloque de 6 placeholders) se mueve tal cual, sin reescribir, dentro de los slots `main`/`children` del shell nuevo. La única diferencia visual del Lote 1 es el contenedor (header + tabs), no el contenido de las pestañas.

**No incluye**: reescribir ninguna sección con los patrones adoptados de Resumen/Cotizaciones/Costos-RQ/Cliente/Seguimiento (Lotes 2-5), fusionar Tareas/Logística/Facturación/Liquidación/Archivos/Historial en un solo tab "Seguimiento" (eso es una decisión de Lote 5 que requiere tu confirmación explícita antes de tocarla, aunque ya quedó recomendada aquí).

**Riesgo**: Medio. No toca queries ni mutaciones, pero cambia el contenedor visual de toda la página.

**Criterios de aceptación**: los mismos ya definidos en la versión anterior de este documento (datos idénticos, mismos permisos, `npm run build`/`tsc` sin errores, sin doble shell, navegación por tabs funcional con URL persistible).

---

## 8. Matriz de migración (ver documento operativo separado)

Ver [`PROJECT_DETAIL_V2_MIGRATION_MATRIX.md`](PROJECT_DETAIL_V2_MIGRATION_MATRIX.md) para la tabla elemento-por-elemento con origen, referencia prototipo, referencia Stitch, destino V2, lote, estado, dependencia, riesgo y criterio de aceptación.

---

## 9. Riesgos

Hereda la matriz `G.1` de `proyecto360-refactor-plan.md` (P360-01 a P360-15), vigente. Riesgos actualizados de la ronda anterior:

| ID | Riesgo | Severidad | Estado |
|---|---|---|---|
| V2-01 | `V2DetailPageTemplate` nunca usado en producción | Media | Vigente |
| V2-02 | Cambio de anclas a tabs por clic altera hábito de navegación | Media-Alta | **Resuelto**: se adopta tabs por clic con persistencia en URL (sección 5.1) |
| V2-03 | Modal de "Migración de RQs" no documentado en audits previos | Alta | Vigente — dedicar sesión de solo-lectura antes del Lote 3 |
| V2-04 | Dato de "margen estimado" con barra de progreso, sin confirmar si existe | Media | Vigente — verificar antes del Lote 3 |
| V2-05 | Sin las referencias reales, comparación limitada | Media | **Resuelto**: ambas referencias analizadas en esta ronda |
| V2-06 (nuevo) | El DESIGN.md de origen (Stitch Elite) contradice la dirección actual de "sin bordes de 1px" ya aplicada en el SIG | Baja (documentado, no bloqueante) | Ver nota al inicio de este documento — no requiere acción, solo transparencia |
| V2-07 (nuevo) | "ZIGI AI Insights" en Cliente y "ZIGI Insight" flotante en Seguimiento requieren datos reales (no texto generado libremente) para no romper la regla de "no inventar datos" ya aplicada en toda la sesión | Media | Adaptar solo si hay dato real que lo respalde; si no, descartar de esta migración |
| V2-08 (nuevo) | Creación de tareas embebida del prototipo/Stitch en Seguimiento no persiste en Supabase — mostrarla tal cual sería una regresión funcional (parecería guardar pero no lo haría) | Alta si se copia literal | No adoptar la creación embebida; solo el layout del bento grid |

---

## 10. Criterios de aceptación generales

Sin cambios respecto a la ronda anterior (build/tsc limpios, cero cambios a queries/permisos/RLS en cualquier lote, checklist de regresión manual antes de cerrar Lotes 2-3, cero datos inventados, cero tareas transversales).

## 11. Lista exacta de archivos que se tocarían en el Lote 1

**Nuevos**:
- `components/proyectos/v2/ProjectDetailShellV2.tsx`
- `components/proyectos/v2/ProjectDetailHeaderV2.tsx`
- `components/proyectos/v2/ProjectDetailTabsV2.tsx`
- `components/proyectos/v2/ProjectDetailContentV2.tsx`

**Modificados**:
- `app/proyectos/[id]/page.tsx` (solo el envoltorio de layout — cabecera y nav sticky actuales reemplazados por `<ProjectDetailShellV2>`; el contenido de cada sección permanece igual dentro de los slots)

**No tocados en el Lote 1**: `lib/`, `app/proyectos/[id]/cotizaciones/`, Supabase, permisos, cualquier otro módulo.

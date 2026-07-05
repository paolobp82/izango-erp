# Auditoria arquitectura Proyecto 360

## Resumen ejecutivo

Proyecto 360 esta implementado principalmente en `app/proyectos/[id]/page.tsx`. El modulo funciona como una pantalla maestra que concentra lectura del proyecto, control de estados, aprobacion de proformas, comparacion de versiones, migracion de RQs, pre-cuadre, generacion inicial de RQs, creacion de liquidacion, enlaces operativos y placeholders para tabs futuras.

La mayor deuda no es visual sino arquitectonica: reglas de permisos, estados, acciones criticas y queries Supabase estan mezcladas dentro del componente. Esto aumenta el riesgo de que un cambio en Proyecto 360 rompa RQ, liquidaciones, aprobacion cliente o trazabilidad.

Esta auditoria no modifica comportamiento. El objetivo es dejar un mapa claro para migrar por fases hacia:

- Permission Engine
- Configuration Engine
- Lifecycle Engine
- Business Rules Engine

## Mapa del modulo

### Rutas principales

| Ruta | Rol actual |
| --- | --- |
| `app/proyectos/page.tsx` | Listado de proyectos. |
| `app/proyectos/nuevo/page.tsx` | Creacion de proyecto. |
| `app/proyectos/[id]/page.tsx` | Proyecto 360, flujo operativo principal. |
| `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx` | Editor de cotizacion/proforma del proyecto. |
| `app/proyectos/[id]/cotizaciones/[cotId]/preview/page.tsx` | Preview/PDF de cotizacion. |

### Archivo central

`app/proyectos/[id]/page.tsx` concentra:

- Carga de proyecto, cliente y productor.
- Carga de cotizaciones y sus historiales.
- Carga de RQs asociados.
- Comparacion entre versiones de cotizacion.
- Migracion/reasociacion/cancelacion de RQs entre versiones.
- Aprobacion de cotizacion por cliente.
- Cambio de estado del proyecto.
- Pre-cuadre y generacion inicial de RQs.
- Creacion de liquidacion.
- Acciones rapidas hacia Tareas, Audiovisual y Liquidaciones.
- Tabs informativas de Proyecto 360.

## Tabs del Proyecto 360

Los tabs actuales se definen localmente en `tabsProyecto360` dentro de `app/proyectos/[id]/page.tsx`.

| Tab | Ancla | Estado actual |
| --- | --- | --- |
| Resumen | `#tab-resumen` | Activo. |
| Costos / RQ | `#tab-costos-rq` | Activo con tabla de RQs. |
| Proformas | `#tab-proformas` | Activo con versiones de cotizacion. |
| Cliente | `#tab-cliente` | Activo con datos del cliente. |
| Tareas | `#tab-tareas` | Placeholder con enlaces a tareas/audiovisual. |
| Logistica | `#tab-logistica` | Placeholder para envios, inventario y ordenes. |
| Facturacion | `#tab-facturacion` | Placeholder para facturas y cobranza. |
| Liquidacion | `#tab-liquidacion` | Placeholder con enlace a liquidacion. |
| Archivos | `#tab-archivos` | Placeholder documental. |
| Historial | `#tab-historial` | Historial de proformas. |

### Uso recomendado de Configuration Engine

Los tabs deberian venir de configuracion estatica por modulo:

- `proyecto360.tabs`
- orden
- etiqueta
- ancla
- visibilidad por feature flag si aplica

Esto permitiria mantener el orden del layout sin hardcodearlo en el componente.

## Flujo de estados del proyecto

El flujo esta hardcodeado en `FLUJO` y `FLUJO_BREADCRUMB`.

Orden funcional actual:

1. `pendiente_aprobacion`
2. `aprobado_produccion`
3. `aprobado_gerencia`
4. `aprobado_cliente`
5. `en_curso`
6. `terminado`
7. `liquidado`
8. `pendiente_facturacion`
9. `facturado`
10. `cerrado_financiero`

Estados finales adicionales:

- `cancelado`
- `rechazado`

### Acciones por estado detectadas

| Estado | Siguiente | Accion visible | Roles hardcodeados |
| --- | --- | --- | --- |
| `pendiente_aprobacion` | `aprobado_produccion` | Aprobar Produccion | `gerente_produccion`, `gerente_general`, `superadmin` |
| `aprobado_produccion` | `aprobado_gerencia` | Aprobar Gerencia | `gerente_general`, `superadmin` |
| `aprobado_gerencia` | `aprobado_cliente` | Aprobar cliente | `gerente_general`, `superadmin` |
| `aprobado_cliente` | `en_curso` | Preparar pre-cuadre / generar RQs | `gerente_produccion`, `gerente_general`, `productor`, `superadmin` |
| `aprobado` | `en_curso` | Iniciar proyecto | `gerente_produccion`, `gerente_general`, `productor`, `superadmin` |
| `en_curso` | `terminado` | Marcar terminado | `gerente_produccion`, `gerente_general`, `productor`, `superadmin` |
| `terminado` | `liquidado` | Liquidar proyecto | `gerente_produccion`, `gerente_general`, `controller`, `superadmin` |
| `liquidado` | `pendiente_facturacion` | Enviar a facturacion | `controller`, `gerente_general`, `superadmin` |
| `pendiente_facturacion` | `facturado` | Marcar facturado | `controller`, `gerente_general`, `superadmin` |

### Uso recomendado de Lifecycle Engine

El Lifecycle Engine debe reemplazar la logica de `cambiarEstado(nuevoEstado)` y validar:

- Transicion permitida entre estados.
- Roles permitidos por transicion.
- Acciones colaterales requeridas antes/despues.
- Bloqueos como `facturado -> cerrado_financiero`.
- Reaperturas controladas.
- Retrocesos desde breadcrumb.

El estado `cerrado_financiero` aparece en breadcrumb, pero `facturado` no avanza automaticamente hacia el en el flujo actual. Esa regla debe quedar centralizada en lifecycle y business rules, no en botones sueltos.

## Validaciones actuales

### Validaciones de proyecto

- Se exige proyecto cargado antes de renderizar.
- Se validan roles para editar proyecto usando listas locales.
- Al editar datos generales se actualiza directamente `proyectos`.
- En creacion de proyecto (`app/proyectos/nuevo/page.tsx`) se inserta payload y existe fallback si falla la columna `codigo`.

### Validaciones de aprobacion cliente

La aprobacion cliente se distribuye entre:

- `marcarCotizacionAprobadaCliente(cot)` en Proyecto 360.
- `marcarAprobadoPorCliente()` en el editor de cotizacion.
- Logica de comparacion/migracion de versiones de RQ.

Riesgo: existe boton oculto por `false && puedeAprobarCliente` en la tabla de proformas, lo que deja la accion critica dependiente de otros caminos.

### Validaciones de pre-cuadre y RQs

Antes de generar RQs:

- Se busca cotizacion aprobada.
- Se cargan items de cotizacion.
- Se preparan items seleccionables.
- Se genera RQ por item seleccionado.
- Se actualiza proyecto a `en_curso`.

Riesgo: pre-cuadre, generacion de RQ y cambio a `en_curso` estan acoplados en el componente.

### Uso recomendado de Business Rules Engine

Mover a reglas:

- `proyecto.aprobar_cliente`
- `proyecto.generar_rqs_iniciales`
- `proyecto.migrar_rqs_version`
- `proyecto.cancelar_rqs_version`
- `proyecto.rechazar`
- `proyecto.crear_liquidacion`
- `proyecto.cerrar_financiero`

Cada regla deberia responder:

```ts
{
  allowed: boolean,
  reason?: string,
  warnings?: string[],
  nextActions?: string[]
}
```

## Permisos actuales

Los permisos dentro de `app/proyectos/[id]/page.tsx` se calculan localmente:

- `puedeAvanzar`
- `puedeRechazar`
- `puedeEditar`
- `puedeAprobarCliente`

Tambien hay permisos hardcodeados en:

- `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx`
- `app/proyectos/nuevo/page.tsx`

### Matriz detectada en codigo

| Accion | Logica actual |
| --- | --- |
| Avanzar estado | `estadoInfo.roles?.includes(perfil?.perfil)` |
| Rechazar proyecto | `gerente_produccion`, `gerente_general`, `controller`, `superadmin` |
| Editar proyecto | `superadmin`, `gerente_general`, `gerente_produccion`, `controller`, `productor` |
| Aprobar cliente | `superadmin`, `gerente_general` |
| Retroceder estado desde breadcrumb | `superadmin`, `gerente_general`, `controller` |
| Aprobar cliente en editor de cotizacion | `ROLES_APRUEBAN_CLIENTE` local |

### Uso recomendado de Permission Engine

Reemplazar listas locales por:

- `puedeVerModulo(perfil, "proyectos")`
- `puedeEjecutarAccion(perfil, "proyectos", "editar", contexto)`
- `puedeEjecutarAccion(perfil, "proyectos", "cambiar_productor", contexto)`
- `puedeEjecutarAccion(perfil, "proyectos", "cerrar_operativo", contexto)`
- `puedeEjecutarAccion(perfil, "proyectos", "cerrar_financiero", contexto)`
- `puedeEjecutarAccion(perfil, "proformas", "aprobar", contexto)`
- `filtrarPorAlcance(rows, perfil, "proyectos", contexto)`

El Permission Engine debe aplicarse tanto para mostrar botones como antes de ejecutar acciones.

## Queries Supabase detectadas

### Proyecto 360

| Tabla | Uso actual |
| --- | --- |
| `perfiles` | Cargar perfil actual y listas de responsables. |
| `proyectos` | Cargar proyecto, editar datos, cambiar estado, asignar cotizacion aprobada. |
| `clientes` | Cargar cliente asociado y listado para edicion. |
| `cotizaciones` | Cargar versiones, aprobar cliente, bloquear/restaurar/eliminar, crear versiones nuevas. |
| `cotizacion_historial` | Historial por cotizacion. |
| `cotizacion_items` | Comparacion de versiones y pre-cuadre. |
| `cotizacion_subitems` | Detalle de pre-cuadre. |
| `proveedores` | Completar informacion de RQ desde items. |
| `requerimientos_pago` | Cargar RQs, migrar, cancelar, generar nuevos RQs. |
| `rq_version_migration_log` | Registrar migraciones de version. |
| `liquidaciones` | Crear liquidacion al avanzar a liquidado. |
| `liquidacion_items` | Crear items iniciales de liquidacion. |
| `items_biblioteca` | Guardar item en biblioteca. |

### Cotizador de Proyecto 360

| Tabla | Uso actual |
| --- | --- |
| `cotizaciones` | Cargar, guardar, aprobar, bloquear. |
| `cotizacion_items` | Crear/editar items principales. |
| `cotizacion_subitems` | Crear/editar subitems. |
| `requerimientos_pago` | Generar RQs desde cotizacion. |
| `proyectos` | Actualizar cotizacion aprobada y estado. |
| `proveedores` | Seleccion de proveedor. |
| `centro_costos` | Seleccion de centro de costos. |
| `items_biblioteca` | Reuso de items. |

### Observaciones Supabase

- Muchas operaciones criticas son llamadas directas desde componentes cliente.
- Algunas actualizaciones no verifican con una lectura posterior que el cambio haya quedado persistido.
- En entornos con RLS, las operaciones `update/delete/select` pueden fallar por politicas y aparentar inconsistencias si el error no se muestra con suficiente detalle.
- Hay `select("*")` y payloads amplios en pantallas grandes; para migracion futura conviene tipar y reducir selects por seccion.

## Acciones criticas

| Accion | Archivo | Riesgo |
| --- | --- | --- |
| Aprobar cotizacion por cliente | `app/proyectos/[id]/page.tsx`, `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx` | Cambia estado comercial, bloquea cotizacion y define version oficial. |
| Migrar RQs entre versiones | `app/proyectos/[id]/page.tsx` | Puede reasociar, cancelar o crear RQs por diferencias de items. |
| Generar RQs iniciales | `app/proyectos/[id]/page.tsx`, `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx` | Afecta compras, costos y flujo de aprobacion. |
| Cambiar estado del proyecto | `app/proyectos/[id]/page.tsx` | Dispara pre-cuadre, liquidacion, facturacion o cierre. |
| Rechazar proyecto | `app/proyectos/[id]/page.tsx` | Cancela o deja pendientes derivados operativos. |
| Crear liquidacion | `app/proyectos/[id]/page.tsx` | Abre costo real y cierre financiero. |
| Editar datos generales | `app/proyectos/[id]/page.tsx` | Puede cambiar productor, cliente, entidad y trazabilidad. |
| Restaurar/eliminar cotizacion | `app/proyectos/[id]/page.tsx` | Impacta versiones disponibles y aprobaciones. |

## Integraciones

### Gestor / Tareas

- Proyecto 360 enlaza a `/tareas?proyecto_id=...`.
- `lib/gestor.ts` trabaja con `proyecto_tareas`.
- El tab `Tareas` aun es placeholder.

Riesgo: las tareas asociadas no se muestran dentro de Proyecto 360; gerencia debe salir del modulo para ver ejecucion.

### RQ

- Es la integracion mas fuerte.
- Proyecto 360 carga RQs por `proyecto_id`.
- Genera RQs iniciales desde pre-cuadre.
- Migra/cancela/reasocia RQs cuando cambia la version aprobada.
- En rollback puede marcar RQs pendientes como `rechazado`.

Riesgo: la logica de RQ vive tanto en Proyecto 360 como en el modulo RQ. Debe centralizarse en Business Rules y Lifecycle.

### Audiovisual

- Proyecto 360 enlaza a `/audiovisual/requerimientos?proyecto_id=...`.
- El tab de tareas menciona requerimientos audiovisuales.

Riesgo: no hay resumen audiovisual embebido en Proyecto 360; solo navegacion.

### Inventario / Logistica

- Existe tab `Logistica` como placeholder.
- Enlaza conceptualmente envios, inventario y ordenes, pero no carga datos dentro del detalle.

Riesgo: costos logisticos y entregas pueden quedar fuera de la vista 360 si no se consolidan.

### Facturacion

- Existe tab `Facturacion` como placeholder.
- Proyecto 360 enlaza a facturacion por `proyecto_id`.

Riesgo: el cierre financiero depende de facturacion, pero Proyecto 360 no muestra todavia la verdad completa de facturado/cobrado/pendiente.

### Liquidaciones

- Proyecto 360 crea una liquidacion al avanzar hacia `liquidado`.
- Enlaza a `/liquidaciones?proyecto_id=...`.
- El tab `Liquidacion` es placeholder.

Riesgo: Proyecto 360 puede disparar creacion de liquidacion desde estado sin que todas las reglas financieras esten centralizadas.

### Caja Chica

- No se encontro integracion directa fuerte en `app/proyectos/[id]/page.tsx`.

Riesgo: costos de caja chica asociados al proyecto pueden no verse desde Proyecto 360 si solo viven en liquidaciones/finanzas.

### CRM

- No se encontro lectura directa de `crm_leads` en Proyecto 360.
- La relacion viene por cliente/proyecto y por rutas externas.

Riesgo: la trazabilidad lead -> cliente -> proyecto no queda visible dentro del detalle 360.

## Dependencias tecnicas

| Dependencia | Uso |
| --- | --- |
| `lib/supabase` | Cliente Supabase del frontend. |
| `lib/permisos.ts` | Motor transversal ya disponible para migracion futura. |
| `lib/permisos/matriz.ts` | Matriz de modulos, acciones e informacion sensible. |
| `lib/projects.ts` | Soft delete y propagacion en modulos relacionados. |
| `lib/gestor.ts` | Gestion de tareas/proyecto_tareas. |
| `lib/roles.ts` | Roles oficiales. |
| `components/layout/Sidebar.tsx` | Navegacion por permisos. |
| `components/design-system/*` | Base futura para estandarizar UI sin redisenar. |

## Riesgos principales

| Severidad | Riesgo | Impacto |
| --- | --- | --- |
| Alta | Estados y permisos hardcodeados en varios archivos. | Inconsistencias entre Proyecto 360, cotizador, RQ y liquidaciones. |
| Alta | Aprobacion cliente repartida entre Proyecto 360 y cotizador. | Puede aprobarse una version sin ejecutar la misma validacion/migracion. |
| Alta | Generacion/migracion de RQs vive dentro del componente. | Riesgo financiero y operativo al cambiar cotizaciones. |
| Alta | Boton de aprobar cliente en tabla oculto por `false && puedeAprobarCliente`. | UX bloqueada o flujo dependiente de caminos alternos. |
| Media | Tabs de integracion son placeholders. | La vista 360 no es aun una unica fuente operativa. |
| Media | Queries Supabase amplias y dispersas. | Dificulta errores visibles, performance y RLS. |
| Media | Liquidacion se crea desde cambio de estado. | Riesgo de crear liquidacion sin reglas financieras completas. |
| Media | No hay integracion directa visible con Caja Chica/CRM. | Costos y origen comercial pueden perderse en la vista 360. |
| Baja | Labels y colores estan hardcodeados. | Dificulta consistencia visual y traduccion funcional. |

## Plan de migracion por fases

### Fase 1: Contratos sin cambio funcional

- Crear definicion documentada de estados, tabs y acciones.
- No cambiar comportamiento.
- Identificar pruebas manuales por estado.

### Fase 2: Configuration Engine

Mover a configuracion:

- `FLUJO_BREADCRUMB`
- labels/colores de estado
- `tabsProyecto360`
- labels de responsables
- estados visuales de RQ
- textos de acciones principales

Resultado esperado: UI igual, constantes fuera del componente.

### Fase 3: Permission Engine

Reemplazar:

- `puedeAvanzar`
- `puedeRechazar`
- `puedeEditar`
- `puedeAprobarCliente`
- permisos del editor de cotizacion
- visibilidad de tabs sensibles

Validar que:

- Productor ve solo proyectos propios.
- Comercial no ve costos/rentabilidad interna.
- Logistica/Audiovisual no ven informacion financiera.
- Controller puede cerrar/controlar finanzas sin ser operador universal.

### Fase 4: Lifecycle Engine

Centralizar:

- `cambiarEstado`
- retrocesos de breadcrumb
- aprobacion cliente como transicion controlada
- `aprobado_cliente -> en_curso` con pre-cuadre obligatorio
- `liquidado -> pendiente_facturacion`
- cierre financiero
- reaperturas si aplican

Resultado esperado: toda transicion pasa por una unica validacion.

### Fase 5: Business Rules Engine

Centralizar reglas de:

- aprobar cliente
- comparar versiones
- migrar/reasociar/cancelar RQs
- generar RQs iniciales
- crear liquidacion
- rechazar proyecto
- cerrar financieramente

Resultado esperado: el componente pregunta si puede ejecutar, recibe razon/warnings/nextActions y luego ejecuta.

### Fase 6: Separacion tecnica

Dividir `app/proyectos/[id]/page.tsx` en:

- hook de carga `useProyecto360Data`
- hook de acciones `useProyecto360Actions`
- componente `ProjectWorkflowPanel`
- componente `ProjectTabs`
- componente `ProjectQuotesSection`
- componente `ProjectRQSection`
- componente `ProjectClientSection`
- componente `ProjectIntegrationPlaceholders`

No iniciar esta fase antes de estabilizar motores.

### Fase 7: Consolidacion 360 real

Completar tabs con datos reales:

- tareas
- audiovisual
- logistica/inventario/envios
- facturacion/cobranza
- liquidacion/costos reales
- caja chica
- origen CRM

## Checklist de regresion manual futura

1. Crear proyecto desde cero.
2. Aprobar produccion.
3. Aprobar gerencia.
4. Aprobar cliente desde proforma.
5. Cambiar version aprobada y revisar comparador de RQs.
6. Generar pre-cuadre y RQs iniciales.
7. Ver RQs en modulo RQ.
8. Rechazar proyecto con RQs pendientes.
9. Marcar proyecto terminado.
10. Crear/ver liquidacion.
11. Pasar a pendiente de facturacion.
12. Validar que facturacion/cobranza permita cierre financiero.

## Recomendacion

No conviene refactorizar visualmente Proyecto 360 todavia. Primero debe migrarse la decision de permisos, estados y reglas criticas a los motores transversales. Cuando esas decisiones esten fuera del componente, la division en componentes sera mucho mas segura y con menor riesgo para produccion.

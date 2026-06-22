# Auditoría UX y código - Izango ERP 360

Fecha: 21 de junio de 2026

Rama: `codex/auditoria-ux-codigo-erp`

Alcance: `app/`, `components/`, `lib/`, `middleware.ts` y `app/globals.css`.

Esta fase es exclusivamente documental. No se modificó lógica funcional, cálculos, permisos, migraciones ni diseño.

## A. Resumen ejecutivo

El ERP compila correctamente y TypeScript no reporta errores, pero la base de código presenta deuda acumulada que impide usar ESLint como barrera de calidad. El build generó 72 rutas y `npx tsc --noEmit` pasó; `npm run lint` falló con 957 errores y 123 advertencias en 73 archivos.

Los riesgos principales son:

1. Una acción de cancelación de RQ modifica datos con `service role` mediante una petición `GET`.
2. Los módulos financieros usan definiciones no totalmente uniformes para facturación, costos y margen.
3. Hay operaciones de inventario y cotizaciones compuestas por múltiples escrituras cliente sin transacción atómica.
4. Varias pantallas críticas ejecutan consultas N+1 o descargan tablas completas para paginar en memoria.
5. Existen rutas duplicadas, respaldos versionados y archivos alias que incrementan la superficie de mantenimiento.
6. La experiencia visual está dividida entre componentes financieros nuevos y CRUD históricos con estilos locales.

Métricas observadas:

| Indicador | Resultado |
|---|---:|
| Archivos TS/TSX auditados | 107 |
| Líneas TS/TSX aproximadas | 24,411 |
| Rutas generadas por build | 72 |
| Errores ESLint | 957 |
| Advertencias ESLint | 123 |
| Archivos con incidencias ESLint | 73 |
| `any` detectados por ESLint | 868 |
| `any` encontrados por búsqueda textual | 867 |
| Variables/imports no usados | 67 |
| Advertencias de dependencias de hooks | 47 |
| Consultas con `select("*")` o selección amplia equivalente | 150 |
| Usos de `alert()` / `confirm()` | 166 |
| Logs de consola | 42 |

## B. Hallazgos críticos

### AUD-001 - Mutación privilegiada mediante GET

El endpoint de resolución de cancelaciones recibe `token` y `accion` por URL, crea un cliente administrativo y actualiza RQ, proyecto y solicitud durante un `GET`.

Evidencia: `app/api/cancelar-rqs/resolver/route.ts:26`, `:35`, `:51-63`.

Riesgo: previsualizadores de correo, escáneres antiphishing o navegación accidental pueden consumir el enlace y ejecutar una decisión. El token evita acceso casual y el estado evita repetición, pero no elimina el riesgo de mutación automática.

Recomendación: en una fase separada, hacer que el GET solo muestre confirmación y ejecutar la mutación mediante POST con token de un solo uso, expiración y registro del actor/contexto.

### AUD-002 - Definiciones financieras divergentes

Se encontraron fórmulas diferentes para conceptos equivalentes:

- Dashboard excluye `anulada` y `cancelada` mediante constantes.
- Facturación excluye únicamente `anulada` en algunos totales y considera pendiente solo `emitida`.
- Reporte PDF suma todas las facturas sin excluir estados anulados/cancelados.
- Rentabilidad toma `liquidaciones.costo_real`.
- Centro de Costos Financiero define costo real como RQ pagado + caja chica aprobada.
- Dashboard Financiero calcula rentabilidad mensual restando solo RQ pagados.
- Liquidaciones aplica umbrales de margen diferentes en distintos bloques.

Evidencia:

- `lib/finance.ts:1-4`
- `app/dashboard/page.tsx:133-137`
- `app/facturacion/page.tsx:180-187`
- `app/api/reporte-pdf/route.ts:61-67`
- `app/finanzas/rentabilidad/page.tsx:31-47`
- `app/finanzas/centro-costos/page.tsx:129-146`
- `app/finanzas/dashboard/page.tsx:84-86`
- `app/liquidaciones/page.tsx:332-334`, `:517-520`

Riesgo: dos usuarios pueden obtener totales o semáforos distintos para el mismo proyecto según el módulo consultado.

Recomendación: no cambiar fórmulas sin aprobación de Controller. Crear primero un diccionario financiero firmado que defina estados válidos, base de venta, costo real, cobrado, pendiente y margen.

### AUD-003 - Operaciones de inventario no atómicas

La ejecución de una orden recorre ítems y realiza lecturas, actualizaciones/inserciones de stock y movimientos individualmente desde el cliente. Si una operación intermedia falla, pueden quedar stock y movimientos parcialmente aplicados.

Evidencia: `app/inventario/ordenes/page.tsx:104-130`.

Riesgo: inconsistencia de inventario, especialmente en traslados con múltiples ítems o concurrencia.

Recomendación: mover el flujo a una función SQL/RPC transaccional en una fase específica de integridad, manteniendo las reglas actuales.

### AUD-004 - ESLint no funciona como control de calidad

`npm run lint` reporta 957 errores y 123 advertencias. El 90% aproximado corresponde a `no-explicit-any`, pero también hay reglas de pureza, efectos, dependencias y variables no usadas.

Evidencia destacada:

- `app/proyectos/[id]/page.tsx`: 63 errores.
- `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx`: 63 errores.
- `app/finanzas/dashboard/page.tsx`: 49 errores.
- `app/dashboard/page.tsx`: 49 errores.
- `app/tareas/page.tsx`: 44 errores y 14 advertencias.

Riesgo: nuevas regresiones quedan ocultas dentro del volumen histórico y lint no puede bloquear CI.

Recomendación: saneamiento incremental por carpeta y reglas, nunca una corrección global automática.

## C. Hallazgos medios

### AUD-005 - Autorización de rutas dependiente de cliente y RLS

El middleware valida autenticación para todas las rutas, pero aplica autorización por rol únicamente a `/finanzas/*`. Otros módulos dependen de controles internos de página y de las políticas RLS de Supabase.

Evidencia: `middleware.ts:52-72`.

Riesgo: no implica exposición confirmada, pero una pantalla nueva o una consulta agregada sin control local correcto dependerá completamente de RLS.

Recomendación: inventariar políticas RLS y crear una matriz ruta/rol/RLS. Las rutas sensibles deberían tener control de acceso server-side equivalente.

### AUD-006 - Perfil sin lista permitida al crear usuarios

El endpoint de creación acepta `perfil` del cuerpo y lo inserta directamente. El endpoint de cambio de rol sí utiliza `ROLES_VALIDOS`.

Evidencia: `app/api/admin/crear-usuario/route.ts:9-20`; comparación con `app/api/admin/cambiar-rol/route.ts:4-18`, `:35`.

Riesgo: un administrador autorizado puede crear por error perfiles desconocidos que no encajen con navegación, permisos o RLS.

Recomendación: reutilizar una lista compartida de roles válidos sin alterar quién puede crear usuarios.

### AUD-007 - Consultas N+1 en Proyectos y Cotizaciones

El detalle de proyecto consulta el historial una vez por cotización y subítems una vez por ítem. El editor de cotización repite la carga por ítem.

Evidencia:

- `app/proyectos/[id]/page.tsx:91-97`
- `app/proyectos/[id]/page.tsx:230-246`
- `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx:179-194`

Riesgo: latencia creciente y mayor consumo de Supabase según cantidad de versiones e ítems.

Recomendación: cargar relaciones en consultas agregadas o por lotes. Validar planes y límites antes de cambiar.

### AUD-008 - Escrituras secuenciales extensas en Cotizaciones

Guardar una cotización actualiza/inserta cada ítem secuencialmente y luego elimina/reinserta subítems por grupo.

Evidencia: `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx:511-584`.

Riesgo: guardado lento y posibilidad de estado parcial si falla una petición intermedia.

Recomendación: diseñar RPC transaccional o upsert por lotes. No sustituir mecánicamente por `Promise.all`, porque puede empeorar la concurrencia y no aporta atomicidad.

### AUD-009 - Descarga completa y paginación solo en memoria

Clientes, proveedores, proyectos, RQ y otras pantallas descargan la colección completa y luego usan `slice`. Reportería ejecuta consultas amplias sin `limit` o `range`.

Evidencia:

- `app/clientes/page.tsx:17-22`
- `app/proveedores/page.tsx:59-75`
- `app/reporteria/page.tsx:193-284`
- `app/rq/page.tsx:520-524`

Riesgo: tiempos de carga y memoria crecen con la base; la paginación visual no reduce transferencia.

Recomendación: paginación server-side con `range`, conteo y filtros aplicados en Supabase.

### AUD-010 - Selecciones excesivamente amplias

Se localizaron aproximadamente 150 usos de `select("*")` o selecciones equivalentes con relaciones completas.

Ejemplos:

- `app/tareas/page.tsx:94-95`
- `app/rq/page.tsx:105`
- `app/envios-materiales/page.tsx:70-72`
- `app/reporteria/page.tsx:199-282`

Riesgo: transferencia de columnas sensibles o innecesarias, respuestas más pesadas y acoplamiento accidental al esquema.

Recomendación: priorizar módulos de mayor volumen y definir listas de columnas por caso de uso.

### AUD-011 - Instancias Supabase recreadas durante render

Se encontraron 60 páginas/componentes con `createClient()`. La mayoría lo ejecuta directamente en el cuerpo del componente; Finanzas V2 usa `useMemo`.

Evidencia: `components/BusquedaGlobal.tsx:18`, `components/Notificaciones.tsx:14`, `app/dashboard/page.tsx:51`; patrón estable en `app/finanzas/dashboard/page.tsx:25`.

Riesgo: identidades inestables, efectos difíciles de tipar correctamente y más ruido en reglas de dependencias.

Recomendación: adoptar de forma gradual un patrón estable por componente o helper compartido, validando sesiones y suscripciones.

### AUD-012 - Problemas estructurales de hooks

ESLint reporta 47 dependencias faltantes, 35 incidencias de inmutabilidad/funciones usadas antes de declararse, 12 actualizaciones de estado dentro de efectos y 11 llamadas impuras.

Evidencia:

- `app/alertas/page.tsx:26-28`
- `app/reporteria/page.tsx:153-164`
- `app/rq/page.tsx:83-93`
- `app/proyectos/page.tsx:226`

Riesgo: cierres con datos antiguos, recargas omitidas, renderizados encadenados o resultados dependientes del momento de render.

Recomendación: corregir por módulo con pruebas manuales; no añadir dependencias automáticamente.

### AUD-013 - Páginas monolíticas

Los mayores archivos combinan consultas, permisos, cálculo, persistencia y UI:

| Archivo | Líneas aproximadas |
|---|---:|
| `app/proyectos/[id]/page.tsx` | 1,416 |
| `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx` | 1,228 |
| `app/tareas/page.tsx` | 1,200 |
| `app/rq/page.tsx` | 1,052 |
| `app/audiovisual/requerimientos/page.tsx` | 835 |

Riesgo: alto costo de revisión y mayor probabilidad de regresiones al tocar flujos críticos.

Recomendación: extraer primero tipos y componentes visuales sin cambiar lógica; después separar hooks de lectura y comandos.

### AUD-014 - Rutas duplicadas de envíos

Existen `/envio-materiales` y `/envios-materiales`. La navegación y permisos solo referencian la ruta plural; los archivos difieren en 171 líneas.

Evidencia:

- `app/envio-materiales/page.tsx:1`
- `app/envios-materiales/page.tsx:1`
- `components/layout/Sidebar.tsx:51`
- `lib/permissions.ts:9`

Riesgo: correcciones aplicadas en una ruta pueden no llegar a la otra; usuarios con URL antigua pueden ver comportamiento distinto.

Recomendación: medir tráfico y dependencias antes de redirigir o retirar la ruta singular.

### AUD-015 - Respaldos versionados dentro de app

Se encuentran tres copias del Dashboard:

- `app/dashboard/page.tsx`
- `app/dashboard/page.backup.tsx`
- `app/dashboard/page.tsx.backup-dashboard-montos`

Los respaldos tienen aproximadamente 25 KB cada uno y uno de ellos entra al análisis ESLint.

Riesgo: deuda duplicada, búsquedas ambiguas y edición del archivo equivocado.

Recomendación: confirmar con historial Git y retirar en una PR documental/higiénica separada.

### AUD-016 - Código residual confirmado por lint

ESLint detecta 67 imports, variables, estados o funciones no usados. Algunos parecen flujos inconclusos, por lo que no deben borrarse automáticamente.

Ejemplos:

- `app/audiovisual/requerimientos/page.tsx:248`, `:358`
- `app/liquidaciones/page.tsx:304`, `:323-324`
- `app/rq/page.tsx:34-35`
- `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx:95-96`, `:315`

Riesgo: confusión sobre la lógica activa y señales de funcionalidades parcialmente desconectadas.

Recomendación: clasificar cada símbolo como muerto, pendiente o llamado indirectamente antes de eliminar.

### AUD-017 - Debug y mensajes nativos en producción

Se detectaron 166 usos de `alert`/`confirm` y 42 logs de consola. Hay un log de datos insertados en Gastos de Oficina.

Evidencia: `app/gastos-oficina/page.tsx:150-165`.

Riesgo: UX inconsistente, mensajes poco accionables y exposición accidental de datos en consola compartida.

Recomendación: retirar primero logs confirmados; definir un patrón de toast/modal antes de migrar mensajes.

### AUD-018 - Sistema visual fragmentado

`globals.css` define `.card` con radio 12 px y borde gris claro; `KpiCard` usa radio 18 px y sombra; `SectionCard` usa radio 16 px. Muchos módulos recrean badges, inputs y cards mediante estilos inline.

Evidencia:

- `app/globals.css:6-24`
- `components/ui/KpiCard.tsx:65-76`
- `components/ui/SectionCard.tsx:11-18`
- `app/proveedores/page.tsx:55`, `:370-451`
- `app/rrhh/vacaciones/page.tsx:86-206`

Riesgo: densidad, radios, colores, jerarquías y estados cambian entre módulos.

Recomendación: documentar tokens actuales y migrar por familias de pantalla, sin rediseño global.

### AUD-019 - Estados de carga, error y vacío no homogéneos

Hay estados vacíos útiles en Clientes, Proveedores, Finanzas, Tareas y Liquidaciones, pero muchas consultas ignoran `error` y solo convierten `data || []`. Los loaders son texto simple y varían en padding y color.

Evidencia:

- Buen vacío: `app/clientes/page.tsx:126`
- Buen error financiero: `app/finanzas/dashboard/page.tsx:136`
- Error ignorado: `app/clientes/page.tsx:19-22`
- Error ignorado en ratings: `app/proveedores/page.tsx:68-75`

Riesgo: una falla de Supabase puede presentarse como “sin datos”.

Recomendación: componente común de carga/error/vacío y manejo explícito de errores, empezando por módulos financieros y operativos.

### AUD-020 - Polling periódico de notificaciones

El componente consulta hasta 20 notificaciones cada 30 segundos mientras está montado.

Evidencia: `components/Notificaciones.tsx:20-42`.

Riesgo: tráfico constante por usuario y pestaña, incluso sin cambios.

Recomendación: evaluar Supabase Realtime o polling adaptativo; medir antes de cambiar.

### AUD-021 - Búsqueda global sin cancelación de respuestas

La búsqueda tiene debounce de 350 ms y consultas paralelas, lo cual es positivo, pero no cancela solicitudes anteriores ni valida que la respuesta corresponda al texto vigente.

Evidencia: `components/BusquedaGlobal.tsx:35-79`.

Riesgo: una respuesta lenta de una búsqueda anterior puede reemplazar resultados más recientes.

Recomendación: usar secuencia de petición o abort/cancelación compatible, sin cambiar el resultado funcional.

### AUD-022 - URLs y destinatarios operativos hardcodeados

Alertas y cancelaciones usan URLs de producción fijas; la resolución de RQ contiene una lista fija de aprobadores.

Evidencia:

- `app/api/alertas/route.ts:6`, `:15-16`
- `app/api/cancelar-rqs/resolver/route.ts:7-9`

Riesgo: enlaces incorrectos en previews/staging y mantenimiento fuera de configuración.

Recomendación: mover a variables validadas de entorno o configuración administrativa.

## D. Hallazgos menores

### AUD-023 - Archivo alias residual en API

`app/api/reporte-pdf/reporte_pdf_route.ts` solo reexporta `GET` y no es una ruta reconocida por Next.js.

Evidencia: `app/api/reporte-pdf/reporte_pdf_route.ts:1`.

Recomendación: confirmar que ninguna herramienta externa lo usa y retirarlo como higiene.

### AUD-024 - Convención middleware obsoleta

Next.js muestra que la convención `middleware.ts` está deprecada y recomienda `proxy`.

Evidencia: salida de `npm run build`.

Recomendación: migrar en una fase compatible con la versión desplegada, con prueba completa de autenticación y redirects.

### AUD-025 - Alias CSS y estilos duplicados

`app/globals.css` contiene utilidades manuales que imitan Tailwind y define `.text-red-600` dos veces.

Evidencia: `app/globals.css:26-125`, especialmente `:108` y `:117`.

Riesgo: bajo; aumenta confusión sobre si la fuente de estilo es Tailwind, CSS global o inline.

### AUD-026 - Enlaces internos con `<a>`

ESLint reporta 24 usos de enlaces internos donde recomienda `next/link`.

Riesgo: navegación con recarga completa y pérdida de estado local en algunos flujos.

Recomendación: migración gradual, priorizando navegación simple sin formularios abiertos.

## Matriz consolidada

| ID | Módulo | Tipo | Severidad | Descripción | Evidencia | Riesgo | Recomendación | Automatizable | Revisión humana |
|---|---|---|---|---|---|---|---|---|---|
| AUD-001 | Cancelación RQ | Seguridad | Alta | GET ejecuta mutaciones con service role | `app/api/cancelar-rqs/resolver/route.ts:26-63` | Activación automática del enlace | Confirmación GET + POST de un solo uso | No | Sí |
| AUD-002 | Finanzas | Finanzas | Alta | Fórmulas/estados no uniformes | `lib/finance.ts:1-4`; archivos financieros citados | Totales distintos por módulo | Diccionario financiero aprobado | No | Sí |
| AUD-003 | Inventario | Código | Alta | Movimientos multioperación sin transacción | `app/inventario/ordenes/page.tsx:104-130` | Stock parcial/inconsistente | RPC transaccional | No | Sí |
| AUD-004 | Global | Código | Alta | 957 errores lint | salida `npm run lint` | CI sin señal útil | Saneamiento incremental | Parcial | Sí |
| AUD-005 | Acceso | Seguridad | Media | Middleware solo autoriza por rol Finanzas | `middleware.ts:52-72` | Dependencia completa de controles cliente/RLS | Matriz ruta/rol/RLS | No | Sí |
| AUD-006 | Usuarios | Seguridad | Media | Perfil de alta sin allowlist | `app/api/admin/crear-usuario/route.ts:9-20` | Roles inválidos | Validación compartida | Sí | Sí |
| AUD-007 | Proyectos | Performance | Media | Consultas N+1 | `app/proyectos/[id]/page.tsx:91-97`, `:230-246` | Latencia creciente | Consultas por lote | Parcial | Sí |
| AUD-008 | Cotizaciones | Performance | Media | Guardado secuencial no atómico | `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx:511-584` | Estado parcial | RPC/upsert transaccional | No | Sí |
| AUD-009 | Listados/Reportería | Performance | Media | Descarga completa y paginación local | `app/reporteria/page.tsx:193-284` | Escalabilidad | Paginación Supabase | Parcial | Sí |
| AUD-010 | Global | Performance | Media | 150 selecciones amplias | múltiples archivos | Transferencia/acoplamiento | Columnas explícitas | Parcial | Sí |
| AUD-011 | Global | Código | Media | Cliente Supabase recreado | `components/BusquedaGlobal.tsx:18` | Efectos inestables | Patrón estable gradual | Parcial | Sí |
| AUD-012 | Global | Código | Media | Deuda de hooks | salida lint | Cierres antiguos/renders extra | Corrección por módulo | No | Sí |
| AUD-013 | Proyectos/Tareas/RQ | Código | Media | Páginas monolíticas | archivos >1,000 líneas | Regresión/mantenibilidad | Extracción gradual | No | Sí |
| AUD-014 | Logística | Código | Media | Dos rutas de envíos distintas | rutas singular/plural | Divergencia funcional | Medir y consolidar | No | Sí |
| AUD-015 | Dashboard | Código | Media | Respaldos versionados | `app/dashboard/page.backup.tsx:1` | Duplicación/confusión | Retirar tras confirmar | Sí | Sí |
| AUD-016 | Global | Código | Media | 67 símbolos no usados | salida lint | Código residual | Clasificación manual | Parcial | Sí |
| AUD-017 | Global | UX | Media | 166 diálogos nativos y 42 logs | `app/gastos-oficina/page.tsx:150-165` | UX/logs inconsistentes | Toast/modal común | Parcial | Sí |
| AUD-018 | Global | UX | Media | Tokens y cards fragmentados | CSS/components citados | Experiencia desigual | Catálogo de tokens | No | Sí |
| AUD-019 | Global | UX | Media | Errores se muestran como vacío | `app/clientes/page.tsx:19-22` | Diagnóstico incorrecto | Estado común | Parcial | Sí |
| AUD-020 | Notificaciones | Performance | Media | Polling cada 30 segundos | `components/Notificaciones.tsx:20-42` | Tráfico constante | Realtime/adaptativo | No | Sí |
| AUD-021 | Búsqueda | Performance | Baja | Respuestas sin control de secuencia | `components/BusquedaGlobal.tsx:35-79` | Resultados obsoletos | Identificador de solicitud | Sí | Sí |
| AUD-022 | Alertas | Código | Media | URLs/aprobadores hardcodeados | rutas de API citadas | Fallos por entorno | Configuración validada | Sí | Sí |
| AUD-023 | Reporte PDF | Código | Baja | Reexport residual | `reporte_pdf_route.ts:1` | Ruido | Confirmar y retirar | Sí | Sí |
| AUD-024 | Middleware | Código | Baja | Convención deprecada | build | Deuda futura | Migración controlada | No | Sí |
| AUD-025 | Estilos | UX | Baja | Utilidades CSS duplicadas | `app/globals.css:26-125` | Confusión | Limpieza focalizada | Sí | Sí |
| AUD-026 | Navegación | UX | Baja | Links internos sin Next Link | salida lint | Recarga completa | Migración gradual | Sí | Sí |

## E. Quick wins seguros

No deben ejecutarse todos juntos. Cada punto requiere diff pequeño y build:

1. Retirar el `console.log` confirmado de Gastos de Oficina.
2. Eliminar imports y parámetros claramente no usados en archivos pequeños.
3. Agregar mensajes de error visibles donde hoy `data || []` oculta fallos.
4. Sustituir `select("*")` por columnas explícitas en perfiles y catálogos simples.
5. Configurar `NEXT_PUBLIC_APP_URL` para emails sin cambiar plantillas.
6. Validar roles del alta de usuario con la lista ya existente.
7. Añadir lint focalizado para archivos modificados, sin exigir aún lint global.
8. Confirmar y retirar los respaldos de Dashboard y el alias de reporte PDF.

## F. Cambios NO recomendados

1. No reemplazar todos los `any` automáticamente.
2. No agregar todas las dependencias sugeridas por hooks sin analizar ciclos.
3. No ejecutar escrituras existentes en `Promise.all` como supuesto arreglo transaccional.
4. No unificar fórmulas financieras sin aprobación de Controller/Gerencia.
5. No retirar `/envio-materiales` sin revisar tráfico, favoritos y enlaces externos.
6. No migrar todas las cards/estilos en una sola PR.
7. No convertir todas las páginas a Server Components durante saneamiento.
8. No activar o modificar RLS sin inventario completo de políticas.

## G. Módulos con mejor UX

1. **Finanzas Corporativas**: navegación coherente, `KpiCard`, `SectionCard`, `StatusBadge`, subtítulos y errores visibles.
2. **Dashboard**: jerarquía ejecutiva clara y carga paralela de fuentes.
3. **CRM**: tablero por etapas, estados vacíos por columna y densidad adecuada para operación.
4. **Mi Trabajo/Tareas**: vistas por rol, filtros, paginación y estados vacíos.
5. **Liquidaciones**: consolidado financiero detallado y componentes compartidos en la vista de detalle.

## H. Módulos más desfasados

1. **RRHH CRUD**: múltiples badges, botones y modales locales repetidos.
2. **Clientes y Proveedores**: paginación local, tablas antiguas y mensajes nativos.
3. **Inventario/Ubicaciones/Órdenes**: estilos locales y flujos complejos en cliente.
4. **Centro de Costos operativo (`/centro-costos`)**: convive con el nuevo Centro de Costos Financiero y puede generar confusión nominal.
5. **Envíos de materiales**: dos rutas y dos implementaciones.
6. **Reportería**: interfaz funcional, pero consultas amplias y estados de error débiles.

## I. Riesgos de performance

Prioridad recomendada:

1. N+1 en Proyecto 360 y Cotizaciones.
2. Escrituras secuenciales de cotización.
3. Inventario por ítem sin operación transaccional.
4. Reportería y listados con descarga completa.
5. `select("*")` en relaciones profundas.
6. Polling de notificaciones.
7. Páginas monolíticas con cálculos y filtros durante render.
8. Respuestas antiguas en búsqueda global.

## J. Riesgos de seguridad

1. Mutaciones privilegiadas mediante GET en resolución de cancelaciones RQ.
2. Dependencia de RLS para módulos no autorizados por middleware.
3. Perfil arbitrario en creación de usuario.
4. `service role` está confinado al servidor, lo cual es correcto; no se encontró uso en componentes cliente.
5. Deben auditarse vistas consumidas desde cliente y sus grants/RLS, no solo `proveedores_rating`.
6. URLs y aprobadores hardcodeados dificultan separar ambientes.

## K. Riesgos de datos financieros

1. Estados de factura no uniformes entre Facturación, Dashboard y reportes.
2. Reporte PDF incluye potencialmente facturas anuladas/canceladas en total.
3. “Costo real” significa liquidación consolidada en Rentabilidad y RQ pagado + caja chica en Centro de Costos.
4. Rentabilidad mensual del Dashboard Financiero omite caja chica y gastos de oficina.
5. Umbrales de margen cambian entre Liquidaciones y Centro de Costos.
6. Algunos RQ se calculan con `monto_solicitado`; otros reportes usan tratamiento IGV.
7. Margen promedio puede ser simple o ponderado según módulo.

Antes de tocar estos puntos se necesita una tabla de verdad financiera con ejemplos reales.

## L. Plan de saneamiento por fases

### Fase 2A - Higiene confirmada

- Retirar logs temporales.
- Validar y retirar respaldos/aliases.
- Corregir imports no usados en archivos pequeños.
- Agregar validación de roles al alta.
- Introducir lint focalizado.

Validación: build, tsc, lint de archivos tocados y checklist manual básica.

### Fase 2B - UX operacional

- Definir estados comunes de loading/error/empty.
- Inventariar botones, inputs, tablas, modales y badges.
- Migrar una familia de módulos por PR: RRHH, catálogos, logística.
- Mantener estructura y reglas existentes.

### Fase 2C - Performance de lectura

- Paginación Supabase.
- Columnas explícitas.
- Consultas por lotes para relaciones.
- Medición de cantidad de requests y tiempo antes/después.

### Fase 2D - Integridad de escritura

- RPC transaccional para inventario.
- Guardado transaccional de cotizaciones.
- Pruebas con fallos intermedios y concurrencia.

### Fase 2E - Contrato financiero

- Aprobar diccionario financiero.
- Centralizar constantes y helpers.
- Crear casos de prueba con proyectos reales anonimizados.
- Alinear Dashboard, Facturación, CxC, CxP, Liquidaciones, Rentabilidad y reportes.

### Fase 2F - Seguridad y plataforma

- Matriz rutas/roles/RLS.
- Resolver acciones de email con confirmación POST.
- Auditar vistas y grants.
- Migrar middleware a la convención soportada.

## Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `npm run build` | PASS |
| `npx tsc --noEmit --pretty false` | PASS |
| `npm run lint` | FAIL: 957 errores, 123 advertencias |
| Código funcional modificado | NO |
| Migraciones modificadas | NO |
| Datos mock añadidos | NO |

El build se ejecutó con variables públicas temporales de Supabase únicamente para compilación; no fueron persistidas.

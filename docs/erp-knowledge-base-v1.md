# Base de Conocimiento Oficial V1 - Izango ERP 360

Fecha: 22 de junio de 2026

Estado: Primera versión documental para alimentar futuras capacidades del módulo IA.

## 1. Propósito y reglas de uso

Este documento describe el comportamiento visible y las reglas implementadas actualmente en Izango ERP 360. No modifica el chat IA ni reemplaza los permisos, validaciones o datos del sistema.

Principios para una futura IA:

1. Responder según el rol y el módulo consultado.
2. No inventar datos, estados, aprobaciones ni acciones realizadas.
3. Diferenciar una función implementada de un bloque informativo o una fase futura.
4. No afirmar que una operación financiera está aprobada, pagada o cerrada sin consultar su estado real.
5. Indicar la ruta del módulo cuando ayude al usuario.
6. Ante “Acceso no autorizado”, recomendar validar el perfil con un administrador.
7. Ante datos vacíos o en cero, considerar filtros, permisos, proyectos eliminados y errores de carga antes de concluir que no existen registros.
8. Las reglas de negocio del código y los permisos vigentes tienen prioridad sobre esta explicación documental.

## 2. Mapa rápido

| Módulo | Ruta principal | Finalidad |
|---|---|---|
| Dashboard | `/dashboard` | Resumen operativo, comercial y financiero |
| CRM | `/crm` | Gestión de prospectos y conversión a clientes |
| Clientes | `/clientes` | Maestro de clientes |
| Proyectos | `/proyectos` | Cartera y ciclo de proyectos |
| Proyecto 360 | `/proyectos/[id]` | Vista integral de un proyecto |
| Proformas | `/proformas` | Listado transversal de cotizaciones |
| Cotizaciones | `/proyectos/[id]/cotizaciones/[cotId]` | Presupuesto detallado y aprobación del cliente |
| RQ | `/rq` | Requerimientos de pago y aprobaciones |
| Facturación | `/facturacion` | Facturas, cobros y vencimientos |
| Liquidaciones | `/liquidaciones` | Costo real, desviación y margen por proyecto |
| Centro de Costos | `/finanzas/centro-costos` | Consolidado financiero por proyecto |
| Flujo de Caja | `/flujo-caja` | Ingresos y egresos reales/proyectados |
| Mi Trabajo | `/tareas` | Trabajo asignado, delegado y participado |
| Tareas | `/tareas` | Creación, seguimiento, recurrencia y comentarios |
| Audiovisual | `/audiovisual/requerimientos` | Pedidos y ejecución audiovisual |
| Biblioteca | `/biblioteca` | Catálogo reutilizable de ítems |
| Biblioteca de Medios | `/biblioteca-medios` | Recursos, enlaces y archivos |
| Inventario | `/inventario` | Artículos, ubicaciones y stock |
| Traslados | `/logistica/traslados` | Movimientos físicos con cargo y evidencia |
| Caja Chica | `/caja-chica` | Solicitudes y rendiciones de caja |
| Gastos Oficina | `/gastos-oficina` | Obligaciones administrativas recurrentes o puntuales |
| RRHH | `/rrhh/*` | Trabajadores, planilla y solicitudes |
| Roles y permisos | `lib/permissions.ts` | Acceso por perfil y controles por acción |

## 3. Dashboard

**Qué hace:** concentra KPIs, alertas y gráficos de proyectos, RQ, cotizaciones, facturación, cobranza y CRM.

**Quién lo usa:** todos los perfiles con acceso al ERP; la información visible depende de consultas y permisos.

**Flujo:** ingresar al ERP, revisar alertas superiores, consultar KPIs y abrir el módulo fuente para el detalle.

**Reglas:** los indicadores son resúmenes; un proyecto eliminado debe quedar fuera de métricas activas. Los montos dependen de los estados y fuentes consultados.

**Errores frecuentes:** montos en cero por consultas fallidas, filtros de estado distintos o datos incompletos; conteos visibles pero importes vacíos; confundir un KPI con el registro contable final.

**Preguntas frecuentes:** ¿Dónde verifico un monto? En el módulo fuente. ¿El Dashboard permite editar? Principalmente orienta y enlaza; la operación se realiza en el módulo correspondiente.

## 4. CRM

**Qué hace:** registra leads, su información comercial y su avance; permite convertir un lead en cliente.

**Quién lo usa:** Comercial, Producción, Administración, Gerencia y otros roles autorizados por ruta.

**Flujo:** crear lead, actualizar información, revisar pipeline y convertir a cliente cuando corresponda.

**Reglas:** la razón social es obligatoria. La conversión crea un registro en Clientes. Eliminar un lead requiere confirmación.

**Errores frecuentes:** intentar convertir sin razón social válida; crear un cliente duplicado; confundir lead con cliente ya operativo.

**Preguntas frecuentes:** ¿Un lead es un cliente? No hasta convertirlo. ¿Puedo recuperar un lead eliminado? La interfaz no presenta recuperación.

## 5. Clientes

**Qué hace:** mantiene el maestro de clientes y permite abrir su detalle.

**Quién lo usa:** roles comerciales, operativos y administrativos autorizados.

**Flujo:** crear cliente, completar datos, vincular proyectos y consultar su historial relacionado.

**Reglas:** un cliente con proyectos u otros registros asociados no debe eliminarse físicamente desde la interfaz.

**Errores frecuentes:** intentar eliminar un cliente relacionado; duplicar la razón social; buscar información de un lead que aún no fue convertido.

**Preguntas frecuentes:** ¿Dónde creo un cliente? En `/clientes/nuevo` o desde la conversión del CRM. ¿Por qué no se elimina? Tiene dependencias.

## 6. Proyectos

**Qué hace:** lista proyectos, permite crear, copiar, filtrar, abrir Proyecto 360 y realizar eliminación lógica.

**Quién lo usa:** perfiles comerciales, producción, administración, gerencia y otros autorizados.

**Flujo:** crear proyecto, elaborar cotización, obtener aprobación del cliente, iniciar ejecución, operar RQ/tareas/logística, facturar y liquidar.

**Reglas:** la eliminación es lógica y ofrece una ventana informada de recuperación de dos días. Los proyectos eliminados no deben aparecer en vistas activas. Copiar un proyecto requiere confirmación.

**Errores frecuentes:** intentar operar un proyecto eliminado; iniciar sin cotización aprobada; confundir estado del proyecto con estado de facturación.

**Preguntas frecuentes:** ¿Eliminar borra inmediatamente todo? No; se aplica baja lógica. ¿Dónde veo el detalle? Abriendo el proyecto.

## 7. Proyecto 360

**Qué hace:** reúne en una página proformas, costos/RQ, resumen, cliente, tareas, logística, facturación, liquidación, archivos e historial.

**Quién lo usa:** usuarios con acceso al proyecto y a los módulos relacionados.

**Flujo:** revisar cabecera y estado, navegar por anclas, aprobar proforma, iniciar proyecto, generar RQ y consultar relaciones.

**Reglas:** una proforma debe estar aprobada por el cliente antes de iniciar. La generación de RQ exige proveedor en los ítems aplicables. Solo una cotización queda como aprobada por cliente; otras aprobadas se cambian a enviadas.

**Errores frecuentes:** ítems sin proveedor; fallo parcial al crear RQ; proyecto actualizado pero relación secundaria incompleta; asumir que todos los tabs son plenamente operativos.

**Preguntas frecuentes:** ¿Todos los tabs editan datos? No. Algunos bloques son accesos o fases informativas. ¿Dónde está el historial? En el tab Historial.

## 8. Proformas

**Qué hace:** muestra un listado transversal de cotizaciones/proformas con proyecto, cliente, versión, estado y montos.

**Quién lo usa:** Comercial, Producción, Administración, Gerencia y perfiles autorizados.

**Flujo:** localizar una proforma, abrirla dentro del proyecto, editarla o revisar su estado.

**Reglas:** la edición detallada ocurre en la ruta de cotización del proyecto. Una versión aprobada por cliente puede quedar bloqueada.

**Errores frecuentes:** buscar edición completa en el listado; confundir versión con proyecto; no encontrar proformas por ausencia de registros.

**Preguntas frecuentes:** ¿Dónde creo una versión nueva? Desde Proyecto 360. ¿Proforma y cotización son entidades separadas? En la interfaz actual comparten la misma base de cotizaciones.

## 9. Cotizaciones

**Qué hace:** construye el presupuesto por ítems, proveedores, costos, márgenes, IGV y total al cliente; permite PDF y aprobación.

**Quién lo usa:** usuarios comerciales/operativos autorizados; la aprobación por cliente tiene controles adicionales.

**Flujo:** crear versión en borrador, agregar ítems, guardar, preparar PDF, enviar y marcar aprobación del cliente.

**Reglas:** la razón de aprobación debe ejecutarse con la acción específica. Al aprobar, se bloquea la versión y puede cargar ítems al Gestor. Se verifica concurrencia para evitar sobrescrituras.

**Errores frecuentes:** conflicto de edición simultánea; ítems sin proveedor; fallo al cargar ítems al Gestor; intentar editar una versión bloqueada.

**Preguntas frecuentes:** ¿Puedo aprobar desde cualquier selector? No, se usa la acción independiente. ¿Qué pasa con otras aprobadas? Se cambian a `enviada_cliente`.

## 10. Requerimientos de Pago (RQ)

**Qué hace:** registra obligaciones de pago vinculadas a proyectos/proveedores y controla su aprobación, programación y pago.

**Quién lo usa:** Producción crea/opera; Gerencia y Controller intervienen según etapa; Superadmin tiene amplitud adicional.

**Flujo oficial:** `pendiente_aprobacion` → `aprobado_produccion` → `aprobado` → `programado` → `pagado`.

**Reglas:** Producción/Gerencia aprueban la primera etapa; Gerencia General aprueba la siguiente; Controller programa y confirma pago. Puede cancelarse hasta `programado` por roles autorizados. Solo un RQ en `pendiente_aprobacion` puede eliminarse físicamente. Pagados, cerrados y cancelados bloquean edición general.

**Errores frecuentes:** intentar eliminar un RQ ya ingresado al flujo; editar datos bancarios sin ser Controller/Superadmin; operar un RQ de proyecto eliminado; monto o proveedor incompletos.

**Preguntas frecuentes:** ¿Cancelar es eliminar? No, conserva trazabilidad. ¿Quién registra operación/voucher? Controller o Superadmin.

## 11. Facturación

**Qué hace:** registra facturas, fechas de emisión/vencimiento/abono, impuestos, detracción, retención, pronto pago y estado.

**Quién lo usa:** roles con acceso a Facturación; no todos los perfiles operativos tienen esta ruta.

**Flujo:** seleccionar proyecto activo, ingresar factura, calcular importes, guardar, actualizar estado y registrar cobro.

**Reglas:** proyecto, número y subtotal son obligatorios. Días de crédito predeterminado: 30. El vencimiento puede calcularse desde emisión o editarse manualmente. No se factura un proyecto eliminado.

**Errores frecuentes:** proyecto no disponible; número o subtotal vacío; interpretar `monto_final_abonado` como total bruto; estados no alineados entre módulos históricos.

**Preguntas frecuentes:** ¿Cómo se calcula vencimiento? Emisión más días de crédito. ¿Dónde veo lo pendiente? En Facturación y Cuentas por Cobrar, según estados vigentes.

## 12. Liquidaciones

**Qué hace:** compara costo presupuestado con costo real, incorpora RQ, resume facturación y calcula desviación, utilidad y margen.

**Quién lo usa:** Producción, Controller, Gerencia y otros perfiles autorizados.

**Flujo:** elegir proyecto con cotización aprobada, crear liquidación, revisar ítems/RQ, guardar costos, aprobar Producción, aprobar Controller y cerrar.

**Reglas:** requiere cotización `aprobada_cliente`. Producción aprueba primero; Controller aprueba después y cierra. Una liquidación cerrada no debe tratarse como editable.

**Errores frecuentes:** no existe cotización aprobada; RQ adicional no vinculado al ítem esperado; costo real incompleto; facturas o RQ no cargados y resumen parcial.

**Preguntas frecuentes:** ¿Cuál es el costo real final? El consolidado de la liquidación cerrada. ¿Puede crear liquidación cualquier proyecto? Solo uno activo y con cotización aprobada.

## 13. Centro de Costos

**Qué hace:** consolida por proyecto facturación, cobro, RQ pagado/pendiente, Caja Chica, costo, utilidad y margen.

**Quién lo usa:** `superadmin`, `controller` y `gerente_general` en Finanzas Corporativas.

**Flujo:** aplicar filtros, ordenar proyectos, revisar semáforo y abrir módulos relacionados para detalle.

**Reglas:** excluye facturas anuladas/canceladas según helpers financieros; usa fuentes reales de Supabase; no sustituye una liquidación cerrada como verdad final del costo operativo.

**Errores frecuentes:** doble conteo potencial entre RQ y Caja Chica; margen calculado sin facturación; datos parciales por una fuente fallida.

**Preguntas frecuentes:** ¿Rojo significa proyecto cerrado con pérdida? No necesariamente; indica el margen calculado con los datos disponibles. ¿Quién accede? Solo roles financieros totales.

## 14. Flujo de Caja

**Qué hace:** presenta ingresos y egresos reales/proyectados por mes y detalle.

**Quién lo usa:** perfiles con permiso explícito o acceso total.

**Flujo:** cargar facturas y RQ activos, agrupar por mes, revisar gráfico, seleccionar periodo y consultar detalle.

**Reglas:** ingresos reales usan facturas cobradas/pagadas; proyectados usan facturas pendientes y vencimiento. Egresos reales usan RQ pagados; proyectados usan RQ aprobados/programados.

**Errores frecuentes:** fecha financiera faltante; proyecto eliminado filtrado; confundir proyección con saldo bancario; registros en meses distintos por fecha utilizada.

**Preguntas frecuentes:** ¿Es la caja bancaria? No, es una proyección basada en registros ERP. ¿Por qué una factura aparece en otro mes? Se usa abono o vencimiento según el tipo.

## 15. Mi Trabajo

**Qué hace:** organiza tareas por relación del usuario: asignadas, delegadas, participadas y todas.

**Quién lo usa:** todos los perfiles con acceso a `/tareas`.

**Flujo:** abrir “Asignadas a mí” por defecto, filtrar, revisar KPIs, abrir tarea, cambiar estado o comentar.

**Reglas:** “Asignadas” usa responsable; “Delegadas” usa creador distinto del responsable; “Participo” usa participantes; “Todas” reúne relaciones y amplía visibilidad para roles gerenciales.

**Errores frecuentes:** buscar una tarea delegada en “Asignadas”; participante oculto por la opción “Mostrar en Mi Trabajo”; filtros activos; proyecto eliminado.

**Preguntas frecuentes:** ¿Por qué no veo una tarea que creé? Revise “Delegadas por mí”. ¿Participar me hace responsable? No.

## 16. Tareas

**Qué hace:** crea tareas con proyecto, cliente, prioridad, responsable, participantes, solicitante, fecha, recurrencia, comentarios y notificaciones.

**Quién lo usa:** usuarios autorizados; los cambios de estado dependen del rol en la tarea.

**Flujo:** crear y delegar, responsable inicia, envía a revisión, solicitante completa o devuelve a progreso.

**Reglas:** estados: `pendiente`, `en_progreso`, `en_revision`, `completada`, `cancelada`. El responsable mueve pendiente→progreso→revisión. El solicitante valida revisión→completada o devuelve a progreso. Al completar una recurrente se genera la siguiente ocurrencia si no superó fecha fin/máximo.

**Errores frecuentes:** no seleccionar responsable; recurrencia sin fecha límite; intentar transición sin permiso; comentarios desactivados; participante confundido con responsable.

**Preguntas frecuentes:** ¿La tarea completada desaparece? No; queda en historial y puede originar otra. ¿Frecuencias? Diaria, semanal, mensual, anual, laborables y personalizadas.

## 17. Audiovisual

**Qué hace:** gestiona requerimientos audiovisuales vinculados a proyecto, cotización, productor y responsable audiovisual.

**Quién lo usa:** Audiovisual, Producción, Gerencia y perfiles con acceso; las acciones varían por relación y rol.

**Flujo:** crear pedido, asignar responsable, pasar por pendiente/en progreso/en revisión y completar o cancelar.

**Reglas:** estados finalizados (`completado`, `cancelado`) restringen edición. El productor/creador puede editar en estados iniciales; el responsable audiovisual gestiona la ejecución; ciertos roles pueden cancelar o eliminar.

**Errores frecuentes:** intentar editar un pedido finalizado; no tener permiso sobre un pedido ajeno; proyecto eliminado; falta de fecha o responsable operativo.

**Preguntas frecuentes:** ¿Se crea una tarea asociada? El módulo sincroniza datos de tarea para seguimiento. ¿Quién puede eliminar completados? Solo roles expresamente autorizados.

## 18. Biblioteca

**Qué hace:** mantiene un catálogo de ítems reutilizables para presupuestos, con descripción y datos comerciales.

**Quién lo usa:** Comercial, Producción, Administración y perfiles autorizados.

**Flujo:** crear ítem, buscar/filtrar, editar y reutilizar en cotizaciones.

**Reglas:** la descripción es obligatoria. La eliminación requiere confirmación.

**Errores frecuentes:** descripción vacía; duplicar un ítem ya existente; eliminar un ítem aún usado como referencia.

**Preguntas frecuentes:** ¿Es inventario físico? No; es catálogo de ítems cotizables. ¿Dónde busco históricos cotizados? En “Buscar ítems cotizados”.

## 19. Biblioteca de Medios

**Qué hace:** almacena enlaces o archivos de presentaciones, videos, fotografías, documentos y otros recursos, asociados opcionalmente a cliente/proyecto.

**Quién lo usa:** perfiles comerciales, producción, audiovisual y otros autorizados.

**Flujo:** crear recurso, elegir tipo/categoría/tags, cargar archivo o enlace, filtrar, archivar/reactivar.

**Reglas:** título obligatorio y al menos enlace o archivo. Estados: `activo` y `archivado`. La eliminación permanente requiere confirmación.

**Errores frecuentes:** recurso sin URL ni archivo; carga fallida al storage; buscar un recurso archivado con filtro activo.

**Preguntas frecuentes:** ¿Archivar elimina? No. ¿Puedo asociar a cliente y proyecto? Sí, cuando corresponde.

## 20. Inventario

**Qué hace:** registra activos, consumibles y materiales; controla unidad, variantes, ubicación, stock y mínimo.

**Quién lo usa:** Logística, Producción, Administración y perfiles autorizados.

**Flujo:** crear ítem, definir variantes, registrar movimientos mediante módulos logísticos y revisar stock por ubicación.

**Reglas:** nombre obligatorio. Categorías: activo, consumible y material. Desactivar no equivale a eliminar físicamente. El stock bajo se compara con el mínimo.

**Errores frecuentes:** crear sin nombre; stock en ubicación distinta; interpretar cero como ausencia de artículo; variantes no creadas al alta.

**Preguntas frecuentes:** ¿Cómo retiro un ítem? Mediante órdenes/movimientos, no editando el total mostrado. ¿Qué significa rojo? Stock igual o menor al mínimo configurado.

## 21. Traslados

**Qué hace:** controla movimientos de materiales entre puntos con responsable, destinatario, fechas, cargo firmado y evidencia.

**Quién lo usa:** Logística y roles operativos autorizados.

**Flujo:** crear traslado con al menos un material, programar, ejecutar, poner en tránsito y registrar entrega.

**Reglas:** título, recojo y entrega obligatorios; debe existir al menos un material. Para cerrar entrega se solicita receptor, fecha real y cargo firmado; la evidencia adicional puede ser opcional.

**Errores frecuentes:** traslado sin ítems; archivo no permitido o carga fallida; marcar entregado sin cargo; puntos incompletos.

**Preguntas frecuentes:** ¿Genera código? Sí, formato `MOV-año-secuencia`. ¿Dónde queda el cargo? En el detalle del traslado.

## 22. Caja Chica

**Qué hace:** registra ingresos/egresos menores, comprobantes, proyecto, RQ, proveedor, categoría y periodos de rendición.

**Quién lo usa:** perfiles con ruta; Controller, Gerencia General y Superadmin aprueban. Controller/Superadmin editan datos de operación.

**Flujo:** abrir periodo, registrar solicitud, aprobar/rechazar, completar operación y cerrar/archivar rendición.

**Reglas:** concepto y fecha obligatorios; debe existir monto debe o haber. Estados: pendiente, aprobado, rechazado. Solo aprobados afectan totales de caja.

**Errores frecuentes:** monto vacío; duplicar un costo ya representado por RQ; periodo incorrecto; editar operación sin rol.

**Preguntas frecuentes:** ¿Pendiente descuenta saldo? No en los totales aprobados. ¿Puede vincularse a RQ? Sí mediante `rq_id`.

## 23. Gastos de Oficina

**Qué hace:** registra alquileres, servicios y otros gastos administrativos, con frecuencia, vencimiento, comprobante y datos de pago.

**Quién lo usa:** Controller, Administración, Gerencia General y Superadmin para registrar; Controller/Superadmin gestionan pago.

**Flujo:** crear gasto, clasificar, asignar proveedor, controlar vencimiento y cambiar a pagado.

**Reglas:** descripción, monto y fecha obligatorios. Estados: pendiente, pagado y vencido. Puede ser recurrente según la configuración guardada.

**Errores frecuentes:** gasto sin fecha; proveedor o comprobante incompleto; tratar gasto corporativo como costo de proyecto sin relación definida; operación bancaria incompleta.

**Preguntas frecuentes:** ¿Todo gasto pertenece a un proyecto? No necesariamente. ¿Quién edita voucher/operación? Controller o Superadmin.

## 24. Recursos Humanos

### 24.1 Trabajadores

**Qué hace:** mantiene ficha laboral, bancaria, previsional, contratos e historial de solicitudes.

**Quién lo usa:** roles administrativos ven el equipo; usuarios no administrativos pueden ver su ficha vinculada.

**Flujo:** crear ficha, completar datos, aprobar y bloquear, gestionar contratos y revisar historial.

**Reglas:** nombre y apellido obligatorios. Aprobar bloquea la ficha; un rol autorizado puede desbloquear. La visibilidad salarial es restringida.

**Errores frecuentes:** usuario sin ficha vinculada; ficha bloqueada; datos bancarios incompletos.

**FAQ:** ¿Desactivar elimina? No. ¿Por qué no veo a todo el equipo? El rol puede limitar la consulta.

### 24.2 Planilla

**Qué hace:** genera registros por periodo y trabajador, incorpora horas extras aprobadas y calcula componentes de pago.

**Quién lo usa:** Administración, Controller y Gerencia según permisos.

**Flujo:** seleccionar periodo, generar, revisar borradores, aprobar y marcar pagada.

**Reglas:** estados principales: borrador, aprobada, pagada. Evita crear otro registro si ya existe trabajador/periodo.

**Errores frecuentes:** periodo vacío; horas extras fuera del periodo esperado; duplicados importados.

**FAQ:** ¿Aprobar paga? No; el paso posterior marca pagada.

### 24.3 Permisos y tardanzas

**Qué hace:** registra solicitudes por fecha, horas, tipo y motivo.

**Quién lo usa:** trabajadores para solicitar; roles administrativos para revisar/aprobar.

**Flujo:** crear solicitud pendiente, revisar y aprobar.

**Reglas:** fecha obligatoria; el usuario debe tener ficha de trabajador.

**Errores frecuentes:** ficha no encontrada; fecha vacía; confundir aprobación con registro inicial.

**FAQ:** ¿Puede solicitar otra persona? Los administradores tienen vista ampliada, pero el flujo ordinario usa la ficha propia.

### 24.4 Horas extras

**Qué hace:** registra horas por trabajador, fecha, motivo y proyecto; calcula importe y permite carga masiva.

**Quién lo usa:** trabajadores y roles administrativos.

**Flujo:** registrar, asociar proyecto o texto externo, aprobar y sumar en planilla.

**Reglas:** fecha y horas obligatorias. Si se elige “otro proyecto”, debe escribirse el nombre. Solo aprobadas suman al total aprobado.

**Errores frecuentes:** trabajador sin ficha; proyecto externo sin nombre; registro no aprobado que no aparece en planilla.

**FAQ:** ¿Todas las horas pasan a planilla? Solo las aprobadas según la consulta actual.

### 24.5 Vacaciones

**Qué hace:** registra solicitudes con fechas y motivo.

**Quién lo usa:** trabajadores; Superadmin y Gerente General aprueban/rechazan.

**Flujo:** pendiente → aprobada o rechazada.

**Reglas:** fechas obligatorias y fin no menor al inicio. El rechazo puede guardar una nota.

**Errores frecuentes:** rango invertido; ficha no encontrada; esperar aprobación de un rol sin autorización.

**FAQ:** ¿Controller aprueba vacaciones? Tiene vista administrativa, pero la aprobación está restringida a Superadmin/Gerente General.

### 24.6 Faltas médicas

**Qué hace:** registra periodo, motivo y documento de sustento.

**Quién lo usa:** trabajadores y administradores.

**Flujo:** registrar, subir documento, revisar y aprobar.

**Reglas:** fechas obligatorias y rango válido. El archivo se almacena en assets.

**Errores frecuentes:** carga de documento fallida; ficha no vinculada; fechas invertidas.

**FAQ:** ¿El documento es obligatorio en código? Las fechas sí; el sustento está disponible y debe usarse según política interna.

## 25. Roles y permisos

**Qué hace:** define qué rutas puede abrir cada perfil y complementa controles de acción dentro de los módulos.

**Quién lo usa:** el sistema en cada navegación y los administradores al asignar perfiles.

**Flujo:** asignar perfil, cargar menú filtrado, validar ruta y aplicar permisos específicos de aprobación/edición.

**Reglas:** `superadmin`, `gerente_general` y `controller` tienen acceso total por ruta. Otros perfiles: administrador, gerente_produccion, productor, audiovisual, logistica, comercial y practicante. Acceso a una ruta no implica permiso para toda acción.

**Errores frecuentes:** menú visible pero acción restringida; perfil sin ruta; asumir que Controller y Administrador son equivalentes; usuario sin perfil.

**Preguntas frecuentes:** ¿Quién ve Finanzas Corporativas? Superadmin, Gerente General y Controller. ¿Quién cambia roles? Administración de usuarios según las protecciones del sistema.

### Matriz resumida

| Rol | Alcance general |
|---|---|
| Superadmin | Acceso total y administración |
| Gerente General | Acceso total y aprobaciones gerenciales |
| Controller | Acceso total por ruta y control financiero |
| Administrador | Amplio acceso administrativo, sin equivaler a acceso total |
| Gerente de Producción | Operación, producción y primeras aprobaciones |
| Productor | Gestión operativa de proyectos y proveedores |
| Audiovisual | Tareas y requerimientos audiovisuales |
| Logística | Inventario, movimientos, RQ y trabajo logístico |
| Comercial | CRM, clientes, proyectos y proformas |
| Practicante | Acceso operativo limitado |

## 26. Respuesta segura ante incidencias

Cuando un usuario consulte por un problema, la futura IA debe:

1. Identificar módulo y ruta.
2. Pedir o inferir el rol solo si es necesario.
3. Revisar filtros y estado del registro.
4. Confirmar si el proyecto fue eliminado.
5. Distinguir error de carga de lista realmente vacía.
6. No recomendar editar directamente Supabase.
7. No prometer reversión de una operación financiera.
8. Escalar a Superadmin/Controller cuando afecte pagos, RQ, facturación o liquidaciones.

## 27. Límites de esta versión

- No contiene datos reales de clientes, proyectos, trabajadores ni importes.
- No ejecuta acciones.
- No habilita búsquedas semánticas ni cambia `/ia`.
- No reemplaza el Contrato Financiero ni la auditoría financiera.
- Debe versionarse cuando cambien rutas, estados, permisos o flujos.

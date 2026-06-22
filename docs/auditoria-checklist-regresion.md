# Checklist de regresión - Izango ERP 360

Usar después de cualquier limpieza de UX, tipos, queries, componentes o código residual. Ejecutar con al menos un usuario operativo y uno gerencial cuando aplique.

## Validación técnica previa

- [ ] `npm run build` pasa.
- [ ] `npx tsc --noEmit --pretty false` pasa.
- [ ] Lint de los archivos modificados pasa.
- [ ] No se agregaron errores nuevos al lint global.
- [ ] No hay cambios inesperados en migraciones.
- [ ] El diff contiene únicamente el alcance aprobado.
- [ ] Consola del navegador sin errores nuevos.
- [ ] Red sin consultas duplicadas o respuestas 4xx/5xx nuevas.

## Login y sesión

- [ ] Login válido redirige al Dashboard.
- [ ] Credenciales inválidas muestran mensaje claro.
- [ ] Recuperación y cambio de contraseña funcionan.
- [ ] Cerrar sesión elimina la sesión y vuelve a Login.
- [ ] Una ruta privada sin sesión redirige a Login.
- [ ] El parámetro `next` devuelve a la ruta solicitada.

## Dashboard

- [ ] Carga sin errores.
- [ ] Conteos y montos coinciden con fuentes.
- [ ] Proyectos eliminados no aparecen.
- [ ] Gráficos muestran datos o estado vacío.
- [ ] Alertas navegan al módulo correcto.
- [ ] Búsqueda global devuelve resultados actuales.

## CRM

- [ ] Lista y tablero cargan.
- [ ] Crear y editar lead funciona.
- [ ] Cambio de etapa persiste.
- [ ] Conversión a cliente funciona una sola vez.
- [ ] Notas cargan y se guardan.
- [ ] Estados vacíos por columna son visibles.

## Proyectos

- [ ] Listado, filtros y paginación funcionan.
- [ ] Crear proyecto funciona.
- [ ] Proyecto 360 carga cliente, productor, cotizaciones y RQ.
- [ ] Cambios de estado respetan permisos.
- [ ] Soft delete, recuperación y expiración se comportan igual.
- [ ] Proyecto eliminado no aparece en módulos activos.
- [ ] Enlaces profundos abren el proyecto correcto.

## Proformas y cotizaciones

- [ ] Listado y versiones cargan.
- [ ] Editor carga ítems, subítems, proveedores y centros de costo.
- [ ] Guardado manual conserva todos los importes.
- [ ] Autoguardado no sobrescribe versiones concurrentes.
- [ ] Cálculos de costo, margen, fee, descuento e IGV no cambian.
- [ ] Vista previa y PDF coinciden con pantalla.
- [ ] Aprobación por cliente mantiene el flujo.

## RQ

- [ ] Listado, filtros y paginación funcionan.
- [ ] Crear y editar RQ respeta roles.
- [ ] Estados avanzan según flujo.
- [ ] Cancelación registra estado y trazabilidad.
- [ ] Eliminación física solo aplica cuando corresponde.
- [ ] RQ cancelado no aparece en pendientes y sí en historial.
- [ ] Tratamiento IGV coincide en lista, detalle y reportes.
- [ ] RQ de proyecto eliminado no puede procesarse.

## Tareas

- [ ] Crear, editar y eliminar tarea funciona.
- [ ] Responsable, solicitante y participantes se muestran.
- [ ] Comentarios cargan y notifican.
- [ ] Cambios de estado respetan permisos.
- [ ] Recurrencia genera la siguiente ocurrencia.
- [ ] Enlaces directos por `tarea_id` abren la tarea.
- [ ] Tareas de proyectos eliminados no aparecen activas.

## Mi Trabajo

- [ ] La pestaña inicial es “Asignadas a mí”.
- [ ] “Delegadas por mí” conserva tareas creadas por el usuario.
- [ ] “En las que participo” muestra seguimiento.
- [ ] “Todas” respeta permisos gerenciales.
- [ ] KPIs cambian con la pestaña.
- [ ] Avance de delegadas usa únicamente tareas creadas por el usuario.
- [ ] Filtros, orden y paginación funcionan.

## Caja chica

- [ ] Listado y saldos cargan.
- [ ] Crear ingreso/egreso funciona.
- [ ] Aprobar y rechazar respetan permisos.
- [ ] Proyecto y RQ asociados se conservan.
- [ ] Archivo/voucher se mantiene.
- [ ] Archivado por período conserva históricos.
- [ ] Centro de Costos Financiero refleja egresos aprobados.

## Gastos de oficina

- [ ] Listado y filtros cargan.
- [ ] Crear y editar funciona.
- [ ] Proveedor y comprobante se conservan.
- [ ] Datos de pago y operación se guardan.
- [ ] Eliminación solicita confirmación.
- [ ] No aparecen logs con datos sensibles en consola.

## Facturación

- [ ] Crear factura funciona.
- [ ] Subtotal, IGV, detracción, retención y pronto pago no cambian.
- [ ] Días de crédito calculan vencimiento.
- [ ] Vencimiento manual se conserva.
- [ ] Estados emitida, pendiente, cobrada, pagada y anulada se muestran correctamente.
- [ ] Enlace `?proyecto_id=` preselecciona proyecto.
- [ ] Totales coinciden con Dashboard, CxC y Centro de Costos.

## Liquidaciones

- [ ] Listado y apertura por proyecto funcionan.
- [ ] Ítems presupuestados y adicionales cargan.
- [ ] RQ y facturas del proyecto se consolidan.
- [ ] Costo real, utilidad y margen no cambian.
- [ ] Guardar y cerrar respetan permisos.
- [ ] Proyecto eliminado no puede liquidarse.
- [ ] Enlace `?proyecto_id=` abre la liquidación correcta.

## Finanzas Corporativas

- [ ] Solo superadmin, controller y gerente_general acceden.
- [ ] Dashboard financiero carga todas las fuentes.
- [ ] Caja estimada, CxC, CxP y deuda coinciden con detalle.
- [ ] Aging usa fecha de vencimiento con fallback.
- [ ] Flujo ejecutivo usa vencimientos proyectados.
- [ ] Rentabilidad coincide con liquidaciones.
- [ ] Errores Supabase se muestran y no como ceros silenciosos.

## Centro de Costos Financiero

- [ ] Ruta `/finanzas/centro-costos` abre.
- [ ] Facturación excluye facturas anuladas/canceladas.
- [ ] Cobrado usa estados cobrados/pagados aprobados.
- [ ] RQ pagado y pendiente coinciden con módulo RQ.
- [ ] Caja chica incluye solo egresos aprobados.
- [ ] Costo, utilidad y margen coinciden con definición aprobada.
- [ ] Semáforo respeta umbrales.
- [ ] Filtros y ordenamientos no alteran datos.
- [ ] Links a proyecto, liquidación y facturación funcionan.

## Logística

- [ ] Mi Trabajo Logística carga contadores.
- [ ] Órdenes de inventario crean ítems correctamente.
- [ ] Ejecutar orden actualiza origen, destino y movimientos.
- [ ] Envíos de materiales cargan en la ruta oficial.
- [ ] Entrega requiere y guarda evidencias correspondientes.
- [ ] Traslados conservan materiales, responsables y estado.
- [ ] Revisar explícitamente URLs singular y plural de envíos.

## RRHH

- [ ] Trabajadores respetan visibilidad por rol.
- [ ] Ficha, contratos y reporte cargan.
- [ ] Planilla genera el período correcto.
- [ ] Vacaciones, permisos, horas extra y faltas médicas funcionan.
- [ ] Usuarios operativos ven únicamente su información autorizada.
- [ ] Adjuntos médicos conservan acceso correcto.
- [ ] Aprobaciones y eliminaciones respetan permisos.

## Proveedores

- [ ] Listado, búsqueda, filtros y paginación funcionan.
- [ ] Crear y editar proveedor conserva cuentas y contactos.
- [ ] Rating carga desde `proveedores_rating`.
- [ ] Agregar calificación actualiza promedio e historial.
- [ ] Usuario anónimo no puede consultar rating.
- [ ] Proveedor con dependencias no se elimina.

## Reportería

- [ ] Control de acceso funciona.
- [ ] Cada módulo genera datos reales.
- [ ] Filtros de fecha, estado, cliente y búsqueda funcionan.
- [ ] Proyectos eliminados se excluyen donde corresponde.
- [ ] Columnas seleccionadas se respetan.
- [ ] Exportación no pierde caracteres ni formatos.
- [ ] Volúmenes grandes no congelan la pantalla.

## Cierre

- [ ] Comparar métricas críticas antes/después.
- [ ] Adjuntar capturas de escritorio y móvil de pantallas tocadas.
- [ ] Registrar hallazgos no resueltos.
- [ ] Confirmar aprobación funcional de Controller para cambios financieros.
- [ ] Confirmar aprobación operativa para Proyectos, RQ, Inventario y Logística.

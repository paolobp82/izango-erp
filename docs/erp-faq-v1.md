# Preguntas Frecuentes V1 - Izango ERP 360

Fecha: 22 de junio de 2026

Estas respuestas describen la implementación actual. No ejecutan acciones ni sustituyen la validación del registro real.

## Acceso y navegación

### 1. ¿Por qué no veo un módulo en el menú?
El menú se filtra según el perfil. Si necesita esa función, un administrador debe revisar el rol asignado.

### 2. ¿Por qué veo “Acceso no autorizado”?
Su perfil no tiene permiso para esa ruta o no se pudo cargar correctamente.

### 3. ¿Ver un módulo significa que puedo hacer cualquier acción?
No. Algunas aprobaciones, pagos, cancelaciones y ediciones tienen controles adicionales por rol.

### 4. ¿Quién tiene acceso total por ruta?
Superadmin, Gerente General y Controller.

### 5. ¿Quién accede a Finanzas Corporativas?
Superadmin, Gerente General y Controller.

### 6. ¿Dónde cambio mi contraseña?
En Mi Perfil, si la opción está disponible para su sesión.

### 7. ¿Dónde cierro sesión?
En la parte inferior del menú lateral.

### 8. ¿Puedo ocultar secciones del menú?
Sí. Las secciones pueden contraerse y el menú completo también puede colapsarse.

### 9. ¿Por qué el menú de otra persona es diferente?
Porque cada perfil tiene rutas autorizadas distintas.

### 10. ¿Controller y Administrador tienen los mismos permisos?
No. Controller tiene acceso total por ruta; Administrador tiene una lista amplia pero limitada.

## Dashboard

### 11. ¿Qué representa el Dashboard?
Un resumen de indicadores operativos, comerciales y financieros provenientes de otros módulos.

### 12. ¿Puedo corregir una factura desde el Dashboard?
No directamente; debe abrir Facturación.

### 13. ¿Por qué un KPI aparece en cero?
Puede no haber registros, existir filtros/estados incompatibles o haber fallado una consulta.

### 14. ¿Los montos del Dashboard son el cierre contable?
No necesariamente. Son indicadores del ERP y deben conciliarse con los módulos fuente.

### 15. ¿Por qué un proyecto eliminado no aparece?
Los proyectos eliminados se excluyen de las vistas y métricas activas.

## CRM y clientes

### 16. ¿Qué diferencia hay entre lead y cliente?
El lead es un prospecto; el cliente es el registro operativo creado tras la conversión o alta directa.

### 17. ¿Qué dato es obligatorio para crear un lead?
La razón social.

### 18. ¿Cómo convierto un lead en cliente?
Abra el lead y use la acción de conversión.

### 19. ¿Convertir elimina el lead?
La conversión crea el cliente; revise el CRM para confirmar el estado resultante del lead.

### 20. ¿Puedo eliminar un cliente con proyectos?
No desde la interfaz; las dependencias impiden la eliminación.

### 21. ¿Dónde creo un cliente sin pasar por CRM?
En `/clientes/nuevo`.

### 22. ¿Por qué no puedo eliminar un cliente?
Probablemente tiene proyectos u otros registros asociados.

### 23. ¿Cómo abro el historial de un cliente?
Abra el registro desde la lista de Clientes.

### 24. ¿Puedo recuperar un lead eliminado?
La interfaz actual no ofrece una recuperación visible.

### 25. ¿Cómo evito clientes duplicados?
Busque por razón social antes de crear o convertir.

## Proyectos y Proyecto 360

### 26. ¿Cómo creo un proyecto?
Use “Nuevo proyecto” desde Proyectos.

### 27. ¿Qué ocurre al eliminar un proyecto?
Se aplica una eliminación lógica y deja de mostrarse en vistas activas.

### 28. ¿La eliminación del proyecto es inmediata y física?
No. La interfaz informa una ventana de recuperación de dos días.

### 29. ¿Puedo operar un proyecto eliminado?
No. Sus registros relacionados deben quedar bloqueados u ocultos en la operación activa.

### 30. ¿Cómo copio un proyecto?
Use la acción Copiar y confirme la operación.

### 31. ¿Qué es Proyecto 360?
La página integral del proyecto con proformas, RQ, resumen y accesos relacionados.

### 32. ¿Dónde veo los RQ de un proyecto?
En Proyecto 360, sección Costos/RQ, o en el módulo RQ.

### 33. ¿Dónde veo el historial del proyecto?
En el tab Historial de Proyecto 360.

### 34. ¿Todos los tabs de Proyecto 360 permiten editar?
No. Algunos son bloques informativos o accesos a módulos especializados.

### 35. ¿Por qué no puedo iniciar un proyecto?
Debe existir una cotización aprobada por el cliente.

### 36. ¿Qué pasa si un ítem no tiene proveedor?
La generación de RQ se detiene y muestra cuáles ítems necesitan proveedor.

### 37. ¿Puede existir más de una proforma aprobada por cliente?
La acción de aprobación mantiene una como aprobada y cambia otras aprobadas a enviadas.

### 38. ¿Dónde cambio el estado del proyecto?
En Proyecto 360, mediante las acciones permitidas para el estado actual.

### 39. ¿Un proyecto facturado está automáticamente liquidado?
No. Facturación y Liquidaciones son procesos diferentes.

### 40. ¿Dónde consulto archivos del proyecto?
En el tab Archivos de Proyecto 360, considerando que su alcance actual puede ser informativo.

## Proformas y cotizaciones

### 41. ¿Proforma y cotización son lo mismo en el ERP?
La interfaz usa la tabla de cotizaciones para las versiones mostradas como proformas.

### 42. ¿Dónde veo todas las proformas?
En `/proformas`.

### 43. ¿Dónde edito el detalle de una proforma?
Abra la versión dentro del proyecto.

### 44. ¿Cómo creo una nueva versión?
Desde Proyecto 360.

### 45. ¿Qué significa estado borrador?
La cotización aún está en preparación.

### 46. ¿Cómo genero el PDF?
Abra la cotización y use la acción para preparar o visualizar el PDF.

### 47. ¿Por qué no puedo marcarla aprobada desde el selector?
La aprobación del cliente se realiza mediante una acción independiente y controlada.

### 48. ¿Qué ocurre al aprobar una proforma?
Se marca `aprobada_cliente`, puede bloquearse y se intenta cargar sus ítems al Gestor.

### 49. ¿Qué hago si falla la carga al Gestor?
Verifique la proforma y el Gestor; la aprobación pudo completarse aunque la carga secundaria fallara.

### 50. ¿Por qué aparece un conflicto de edición?
Otro usuario pudo modificar la proforma mientras estaba abierta.

### 51. ¿Puedo editar una versión aprobada?
Puede estar bloqueada; cree o use una versión permitida según el flujo.

### 52. ¿Dónde se define el proveedor de un ítem?
En el detalle de la cotización o en la fuente del ítem, según su configuración.

## RQ

### 53. ¿Qué es un RQ?
Un requerimiento de pago asociado a una obligación operativa, normalmente vinculada a proyecto y proveedor.

### 54. ¿Cuál es el flujo normal de un RQ?
Pendiente de aprobación, aprobado Producción, aprobado Gerencia, programado y pagado.

### 55. ¿Quién hace la primera aprobación?
Gerente de Producción, Gerente General o Superadmin, según el flujo implementado.

### 56. ¿Quién aprueba después de Producción?
Gerente General o Superadmin.

### 57. ¿Quién programa el pago?
Controller o Superadmin.

### 58. ¿Quién confirma el pago?
Controller o Superadmin.

### 59. ¿Puedo cancelar un RQ pendiente?
Sí, si su rol está autorizado.

### 60. ¿Puedo cancelar un RQ programado?
Sí, antes de pagarse y con rol autorizado.

### 61. ¿Puedo cancelar un RQ pagado?
No.

### 62. ¿Cuál es la diferencia entre cancelar y eliminar?
Cancelar conserva trazabilidad; eliminar borra físicamente.

### 63. ¿Cuándo se permite eliminar físicamente un RQ?
Solo cuando está en `pendiente_aprobacion`.

### 64. ¿Por qué el sistema pide usar “Cancelar RQ”?
Porque el RQ ya ingresó al flujo de aprobación y debe conservar historial.

### 65. ¿Dónde registro el voucher?
En los datos de operación del RQ, con permisos de Controller o Superadmin.

### 66. ¿Por qué no puedo editar un RQ?
Puede estar pagado, cerrado, cancelado, pertenecer a un proyecto eliminado o exceder sus permisos.

### 67. ¿Un RQ cancelado aparece en pendientes?
No debería aparecer en vistas activas de pendientes; se conserva para historial.

### 68. ¿Un RQ rechazado se paga?
No; queda fuera del flujo activo de pago.

## Facturación y cuentas por cobrar

### 69. ¿Qué campos son obligatorios para crear una factura?
Proyecto, número de factura y subtotal.

### 70. ¿Puedo facturar un proyecto eliminado?
No.

### 71. ¿Cuántos días de crédito se usan por defecto?
30 días.

### 72. ¿Cómo se calcula la fecha de vencimiento?
Fecha de emisión más días de crédito.

### 73. ¿Puedo editar manualmente el vencimiento?
Sí.

### 74. ¿Qué es `monto_final_abonado`?
El importe neto después de detracción, retención y pronto pago según el formulario.

### 75. ¿El subtotal incluye IGV?
No; el IGV se registra/calcula por separado.

### 76. ¿Dónde veo facturas pendientes?
En Facturación y Cuentas por Cobrar.

### 77. ¿Cómo se calcula el aging?
Con fecha de vencimiento; si falta, se usa la fecha de emisión como fallback.

### 78. ¿Por qué una factura no aparece en CxC?
Puede estar cobrada/pagada, anulada/cancelada, pertenecer a un proyecto eliminado o tener otro estado.

### 79. ¿Anular y cobrar son estados compatibles?
No; una factura anulada no debe participar en cobro activo.

### 80. ¿Facturado y cobrado son el mismo monto?
No necesariamente; cobrado usa el monto final abonado.

## Liquidaciones y centro de costos

### 81. ¿Qué necesito para crear una liquidación?
Un proyecto activo con cotización aprobada por el cliente.

### 82. ¿Qué compara la liquidación?
Costo presupuestado, costo real, precio al cliente, desviación, utilidad y margen.

### 83. ¿Los RQ aparecen en la liquidación?
Sí, por vínculo con ítems o como adicionales del proyecto.

### 84. ¿Quién aprueba primero la liquidación?
Gerente de Producción.

### 85. ¿Quién realiza la aprobación financiera?
Controller, después de la aprobación de Producción.

### 86. ¿Qué significa liquidación cerrada?
Que el resultado se considera final dentro del flujo actual.

### 87. ¿Puedo editar una liquidación cerrada?
No debería tratarse como editable.

### 88. ¿Qué es desviación de costo?
Costo real menos costo presupuestado.

### 89. ¿Qué muestra Centro de Costos?
Facturación, cobro, RQ, Caja Chica, costo, utilidad y margen por proyecto.

### 90. ¿Quién ve Centro de Costos Financiero?
Superadmin, Gerente General y Controller.

### 91. ¿El margen rojo siempre significa pérdida definitiva?
No. Puede ser provisional si faltan datos o no existe liquidación cerrada.

### 92. ¿Por qué Centro de Costos y Liquidaciones pueden diferir?
Usan fuentes y significados de costo distintos en la implementación actual.

## Flujo de caja

### 93. ¿Qué son ingresos reales?
Facturas cobradas o pagadas agrupadas por fecha de abono o referencia disponible.

### 94. ¿Qué son ingresos proyectados?
Facturas pendientes agrupadas por vencimiento.

### 95. ¿Qué son egresos reales?
RQ pagados en el periodo.

### 96. ¿Qué son egresos proyectados?
RQ aprobados o programados que todavía no se han pagado.

### 97. ¿El flujo equivale al saldo bancario?
No. Es una proyección basada en registros del ERP.

### 98. ¿Por qué un movimiento cae en un mes inesperado?
Puede estar usando fecha de abono, vencimiento, pago, actualización o creación según la fuente.

### 99. ¿Los proyectos eliminados afectan el flujo activo?
Sus registros relacionados deben excluirse de la vista activa.

### 100. ¿Dónde veo el detalle de un mes?
Seleccione el mes o cambie a la vista de detalle en Flujo de Caja.

## Mi Trabajo y tareas

### 101. ¿Cuál es la pestaña predeterminada de Mi Trabajo?
Asignadas a mí.

### 102. ¿Qué aparece en Asignadas a mí?
Tareas donde usted es el responsable principal.

### 103. ¿Qué aparece en Delegadas por mí?
Tareas creadas por usted y asignadas a otra persona.

### 104. ¿Qué aparece en Participo?
Tareas donde está agregado como participante y la visibilidad está habilitada.

### 105. ¿Qué aparece en Todas?
Las tareas relacionadas con usted; roles gerenciales pueden tener visibilidad ampliada.

### 106. ¿Ser participante me hace responsable?
No.

### 107. ¿Quién puede iniciar una tarea?
El responsable principal, o un rol con privilegios gerenciales según el control implementado.

### 108. ¿Quién envía una tarea a revisión?
El responsable.

### 109. ¿Quién completa una tarea en revisión?
El solicitante/creador o un rol gerencial autorizado.

### 110. ¿Puede el solicitante devolver la tarea?
Sí, de revisión a progreso.

### 111. ¿Qué pasa al completar una tarea recurrente?
La ocurrencia queda en historial y se genera la siguiente si cumple los límites.

### 112. ¿Qué frecuencias existen?
Diaria, semanal, mensual, anual, laborables y personalizadas por días, semanas o meses.

### 113. ¿Una recurrente necesita fecha límite?
Sí, para calcular la siguiente ocurrencia.

### 114. ¿Puedo limitar las repeticiones?
Sí, mediante fecha fin o máximo de repeticiones.

### 115. ¿Por qué no puedo comentar?
La opción “Permitir comentarios” puede estar desactivada.

### 116. ¿Los participantes reciben notificaciones?
La tarea tiene una opción específica para notificarlos.

### 117. ¿Puedo adjuntar un enlace a un comentario?
Sí, el feed admite comentarios con enlace.

### 118. ¿Por qué una tarea no aparece en el calendario?
Necesita fecha límite para agendarse.

## Audiovisual

### 119. ¿Qué registra un requerimiento audiovisual?
Proyecto, cotización, productor, responsable, prioridad, fechas, estado y detalle.

### 120. ¿Cuáles son sus estados principales?
Pendiente, en progreso, en revisión, completado y cancelado.

### 121. ¿Quién edita un pedido nuevo?
El creador/productor en estados editables y roles con permiso ampliado.

### 122. ¿Puede editarse un requerimiento completado?
Está restringido; solo acciones excepcionales de roles autorizados.

### 123. ¿Puede cancelarse un requerimiento?
Sí, si el rol y la relación con el pedido lo permiten.

### 124. ¿Se refleja en Tareas?
El módulo sincroniza una tarea para seguimiento operativo.

## Biblioteca e inventario

### 125. ¿La Biblioteca es inventario?
No. Es un catálogo de ítems reutilizables para cotizaciones.

### 126. ¿Qué dato exige un ítem de Biblioteca?
Descripción.

### 127. ¿Qué exige un recurso de Biblioteca de Medios?
Título y al menos un enlace o archivo.

### 128. ¿Archivar un medio lo elimina?
No; puede reactivarse.

### 129. ¿Por qué no veo un medio archivado?
El filtro predeterminado suele mostrar activos.

### 130. ¿Qué categorías maneja Inventario?
Activo, consumible y material.

### 131. ¿Qué significa stock mínimo?
El umbral para advertir que el stock está bajo.

### 132. ¿Desactivar un ítem elimina su historial?
No; lo retira de la lista activa.

### 133. ¿Dónde veo stock por ubicación?
En la tabla y tarjetas del módulo Inventario.

### 134. ¿Puedo crear variantes?
Sí, al configurar un ítem que maneja variantes.

## Traslados y logística

### 135. ¿Qué necesita un traslado para crearse?
Título, punto de recojo, punto de entrega y al menos un material.

### 136. ¿Cómo se identifica un traslado?
Con un código generado en formato `MOV-año-secuencia`.

### 137. ¿Qué estados puede recorrer?
Incluye pendiente, programado, en proceso, en tránsito y entregado, entre otros definidos.

### 138. ¿Qué se exige para registrar entrega?
Receptor, fecha real y cargo firmado.

### 139. ¿La evidencia adicional es obligatoria?
El flujo permite cancelar la selección si no aplica; el cargo firmado sí se solicita.

### 140. ¿Dónde veo mis operaciones logísticas?
En Mi Trabajo Logística, que consolida órdenes, envíos y traslados.

## Caja Chica y Gastos de Oficina

### 141. ¿Qué necesita una solicitud de Caja Chica?
Concepto, fecha y al menos un monto debe o haber.

### 142. ¿Qué estados tiene Caja Chica?
Pendiente, aprobado y rechazado.

### 143. ¿Quién aprueba Caja Chica?
Controller, Gerente General o Superadmin.

### 144. ¿Un pendiente afecta el saldo aprobado?
No.

### 145. ¿Puedo relacionar Caja Chica con un RQ?
Sí.

### 146. ¿Por qué debe evitarse sumar RQ y Caja Chica sin revisar?
Pueden representar el mismo desembolso.

### 147. ¿Quién edita datos bancarios de Caja Chica?
Controller o Superadmin.

### 148. ¿Qué datos son obligatorios en Gastos de Oficina?
Descripción, monto y fecha.

### 149. ¿Qué estados usa Gastos de Oficina?
Pendiente, pagado y vencido.

### 150. ¿Quién puede registrar Gastos de Oficina?
Controller, Administrador, Gerente General y Superadmin.

### 151. ¿Todo gasto de oficina se asigna a un proyecto?
No necesariamente.

### 152. ¿Dónde registro el comprobante del gasto?
En el formulario o detalle de Gastos de Oficina.

## Recursos Humanos

### 153. ¿Por qué no puedo registrar una solicitud de RRHH?
Puede faltar su ficha de trabajador vinculada al usuario.

### 154. ¿Quién ve los sueldos?
Roles administrativos expresamente autorizados.

### 155. ¿Qué pasa al aprobar una ficha de trabajador?
Queda aprobada y bloqueada.

### 156. ¿Puede desbloquearse una ficha?
Sí, por un rol autorizado.

### 157. ¿Desactivar un trabajador lo elimina?
No; deja de aparecer como activo.

### 158. ¿Cómo se genera planilla?
Seleccione un periodo y genere los registros para trabajadores sin planilla existente en ese periodo.

### 159. ¿Qué estados tiene planilla?
Borrador, aprobada y pagada.

### 160. ¿Aprobar planilla significa que ya se pagó?
No; debe marcarse pagada en el paso posterior.

### 161. ¿Qué horas extras entran al cálculo?
Las aprobadas consultadas para el trabajador.

### 162. ¿Puedo registrar horas para un proyecto externo?
Sí, usando “otro” e ingresando el nombre.

### 163. ¿Qué necesita una solicitud de permiso?
Fecha; opcionalmente horas y motivo según el tipo.

### 164. ¿Quién aprueba vacaciones?
Superadmin o Gerente General.

### 165. ¿Controller puede ver vacaciones?
Puede tener vista administrativa, pero la aprobación está restringida.

### 166. ¿Qué validación tienen las fechas de vacaciones?
La fecha final no puede ser anterior a la inicial.

### 167. ¿Puedo adjuntar sustento médico?
Sí, mediante el campo de documento.

### 168. ¿Dónde veo el historial de un trabajador?
En el detalle de su ficha, con vacaciones, horas, permisos y faltas.

## Errores y soporte

### 169. ¿Qué hago si una lista aparece vacía?
Revise filtros, permisos, estado, proyecto eliminado y posibles errores de carga.

### 170. ¿Debo editar Supabase directamente para corregir un dato?
No como operación ordinaria. Use el módulo o escale a un responsable técnico.

### 171. ¿Qué información debo enviar al reportar un error?
Módulo, ruta, usuario/rol, código del registro, acción realizada y captura del mensaje.

### 172. ¿Qué hago si una operación financiera quedó a medias?
No la repita a ciegas. Verifique el registro y escale a Controller/Superadmin.

### 173. ¿Por qué un registro aparece en un módulo y no en otro?
Los módulos pueden usar estados, relaciones, fechas o permisos distintos.

### 174. ¿El chat IA puede aprobar o pagar registros?
No en esta versión documental.

### 175. ¿La IA conoce importes reales del ERP?
No por estos documentos. Necesitaría una integración autorizada y contextual.

### 176. ¿La IA puede cambiar permisos?
No.

### 177. ¿Qué fuente prevalece si el FAQ contradice el sistema?
El comportamiento y las reglas vigentes del sistema.

### 178. ¿Cuándo debe actualizarse esta base?
Cuando cambien módulos, rutas, estados, permisos o reglas relevantes.

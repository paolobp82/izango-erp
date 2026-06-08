# Checklist de entregabilidad de correos

Usar este checklist cuando Resend muestre `Delivered` pero el usuario no vea el correo en su bandeja.

## 1. Prueba controlada

- Enviar un correo desde `/api/admin/test-email` hacia una cuenta externa controlada.
- Guardar `resendMessageId`, destinatario, remitente, asunto y status devuelto.
- Buscar el mismo `resendMessageId` en Resend para confirmar el evento final.

## 2. Bandeja del usuario

- Revisar Spam / Correo no deseado.
- Revisar Papelera, Archivados y Todas las bandejas.
- Revisar reglas o filtros de Gmail que archiven, eliminen o reenvien mensajes.
- Revisar si el remitente esta bloqueado por el usuario.

## 3. Google Workspace

- Revisar Email Log Search en Google Admin.
- Confirmar si el mensaje entro, fue rechazado, puesto en cuarentena o reclasificado.
- Revisar cuarentena de administracion y reglas de compliance.
- Validar si hay reglas por contenido, adjuntos, enlaces o remitente externo.

## 4. Dominio remitente

- Confirmar que el dominio usado en `FROM_EMAIL` este verificado en Resend.
- Validar SPF del dominio remitente.
- Validar DKIM del dominio remitente.
- Validar DMARC y su politica (`none`, `quarantine`, `reject`).
- Confirmar alineacion DMARC entre el dominio del `From` y el proveedor que envia.

## 5. Contenido

- Probar un asunto unico que incluya codigo de proyecto/RQ/cotizacion.
- Evitar asuntos genericos repetidos que Gmail pueda agrupar o clasificar.
- Revisar enlaces del correo y reputacion del dominio de destino.
- Probar envio sin HTML complejo si se sospecha filtrado por contenido.

## 6. Evidencia minima para soporte

- Fecha y hora exacta del envio.
- Destinatario.
- `FROM_EMAIL` usado.
- Asunto usado.
- `resendMessageId`.
- Captura del estado en Resend.
- Resultado de busqueda en Google Admin Email Log Search.

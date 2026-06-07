# Limpieza de archivos temporales y backups

Fecha: 2026-06-07

## Clasificacion

### Seguro eliminar

Se eliminaron archivos rastreados en raiz que eran parches/checks temporales, no importados por la app ni usados por scripts de `package.json`:

- `check-*.js`
- `fix-*.js`
- `fix-*.ps1`
- `test_current.tsx`
- `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx.bak2`

Motivo:

- Son artefactos manuales de reparacion/debug.
- Estaban en la raiz del repo, fuera de una carpeta de tooling versionada.
- No forman parte de `npm run build`, `npm run lint` ni rutas Next.
- Ensucian TypeScript/ESLint porque el repo incluye `allowJs` y patrones amplios.

### Conservar como script util

Se conservaron:

- `scripts/check-private-routes.mjs`
- `scripts/check-reports-xss.mjs`

Motivo:

- Son validaciones creadas como parte de tareas de seguridad.
- Viven en `scripts/`.
- Tienen proposito claro y repetible.

### Mover a docs o scripts

No se movieron archivos en esta tarea. Todo lo claramente temporal se elimino. Cualquier script futuro que sea util debe entrar en `scripts/` con nombre descriptivo y documentacion minima.

## Cambios en `.gitignore`

Se agregaron reglas para evitar que vuelvan a entrar artefactos temporales:

- `*.bak`
- `*.bak*`
- `page.tsx.bak*`
- `/fix-*.js`
- `/fix-*.ps1`
- `/check-*.js`
- `/test_current.tsx`

## Matriz PASS/FAIL

| Objetivo | Resultado |
|---|---:|
| Identificar temporales/backups/scripts basura | PASS |
| Clasificar conservar/eliminar/mover | PASS |
| Eliminar solo basura clara | PASS |
| No tocar logica funcional ERP | PASS |
| Actualizar `.gitignore` | PASS |
| Ejecutar build | PASS |
| Ejecutar tsc | PASS |
| Ejecutar lint focalizado | PASS |
| Entregar PR separado con matriz | PASS |

## Riesgos pendientes

- La limpieza elimina archivos historicos de reparacion manual. Si alguien dependia localmente de ellos, debe recuperarlos desde Git.
- Aun pueden existir scripts obsoletos no cubiertos por `fix-*` o `check-*`; esta tarea solo elimina basura clara solicitada.

# Plan gradual para desactivar `typescript.ignoreBuildErrors`

Fecha: 2026-06-07

## Diagnostico

Se ejecuto:

```bash
npx tsc --noEmit --pretty false
```

Resultado inicial: 10 errores TypeScript.

Resultado despues de correcciones minimas: 0 errores TypeScript.

Con esto, `typescript.ignoreBuildErrors` fue retirado de `next.config.ts`.

## Errores encontrados y clasificacion

| Categoria solicitada | Cantidad | Archivos | Estado |
|---|---:|---|---|
| `any` implicito | 1 | `next.config.ts` por falta de tipos `next-pwa` | Corregido con declaracion `.d.ts` |
| Tipos Supabase faltantes | 0 | N/A | No detectado por `tsc` actual |
| Props mal tipadas | 3 | `components/layout/AppLayout.tsx`, `components/layout/Sidebar.tsx` | Corregido con guarda y fallback |
| Imports/exports | 0 | N/A | No detectado |
| React/hooks | 0 | N/A | No detectado por `tsc`; sigue siendo deuda de ESLint global |
| Archivos basura/backups | 0 como error TS | Scripts JS de raiz existen, pero no fallaron `tsc` | Pendiente limpieza separada |
| Literales/tipos de union | 1 | `app/ia/page.tsx` | Corregido tipando el mensaje |
| Indices con `null`/`undefined` | 4 | `app/perfil/page.tsx`, `components/layout/Sidebar.tsx` | Corregido con clave fallback |
| Nullability | 1 | `components/layout/AppLayout.tsx` | Corregido con guarda |

## Correcciones aplicadas

- `app/ia/page.tsx`: `nuevoMensaje` ahora usa el tipo `MensajeIA`.
- `app/perfil/page.tsx`: se evita indexar mapas con `perfil?.perfil` posiblemente nulo.
- `components/layout/AppLayout.tsx`: se agrega guarda si `perfil` no esta disponible.
- `components/layout/Sidebar.tsx`: se evita indexar `ENTIDAD` con valor nulo/indefinido.
- `types/next-pwa.d.ts`: se agrega declaracion minima para `next-pwa`.
- `next.config.ts`: se elimina `typescript.ignoreBuildErrors`.

## Orden recomendado de correccion restante

Aunque TypeScript ya pasa, el repo mantiene deuda de ESLint y calidad:

1. Mantener `npx tsc --noEmit --pretty false` como check obligatorio.
2. Corregir ESLint focalizado en `app/api`, `lib`, `middleware.ts` y `components/layout`.
3. Limpiar scripts basura/backups de raiz en una PR separada.
4. Tipar entidades Supabase de forma centralizada cuando se versionen migraciones/esquema.
5. Reducir `any` global por modulo, empezando por rutas financieras y RRHH.
6. Activar `npm run lint` global como requisito cuando baje la deuda.

## Riesgos pendientes

- `allowJs: true` y el include amplio de `tsconfig` hacen que scripts JS de raiz entren al universo TypeScript. Hoy no rompen `tsc`, pero ensucian lint y mantenimiento.
- No existen tipos generados de Supabase, asi que muchos modelos siguen tipados manualmente o con `any`.
- ESLint global sigue fallando por deuda existente; esta tarea no intenta resolverla.
- Next build ya valida TypeScript, pero no sustituye una suite funcional ni pruebas por rol.

## Matriz PASS/FAIL

| Objetivo | Resultado |
|---|---:|
| Auditar errores reales sin `ignoreBuildErrors` | PASS |
| No cambiar logica funcional grande | PASS |
| Clasificar errores por tipo | PASS |
| Proponer orden de correccion | PASS |
| Corregir solo errores evidentes de bajo riesgo | PASS |
| No hacer refactor masivo | PASS |
| Entregar PR separado o reporte tecnico | PASS |
| Build debe seguir pasando | PASS |
| Entregar matriz PASS/FAIL | PASS |

## Recomendacion

Aplicar ahora.

La deuda TypeScript detectable por `tsc` quedo en cero y el flag fue retirado. Mantener el seguimiento de ESLint como linea de trabajo separada.

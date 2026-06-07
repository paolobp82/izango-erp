# Auditoria de deuda ESLint

Fecha: 2026-06-07

## Comando ejecutado

```bash
npm run lint -- --format json --output-file eslint-report.json
```

Resultado global:

- Archivos analizados: 86
- Errores: 549
- Warnings: 80
- Total hallazgos: 629

## Clasificacion por categoria

| Categoria | Hallazgos | Comentario |
|---|---:|---|
| `any` | 486 | Principal fuente de deuda. Requiere tipado por dominio, no reemplazo mecanico. |
| Hooks dependencies | 42 | Faltan dependencias en `useEffect`/hooks. Riesgo medio de cambiar comportamiento si se corrige en masa. |
| Funciones usadas antes de declararse | 30 | Patron frecuente: `useEffect(() => { load() }, [])` antes de declarar `load`. Corregible por archivo, no globalmente. |
| Imports/vars no usados | 29 | Bajo riesgo en muchos casos, pero debe revisarse por archivo para no ocultar flujo incompleto. |
| Links internos con `<a>` | 18 | Migrable a `next/link`; impacto visual bajo, pero cambio amplio. |
| React/hooks otros | 8 | Incluye pureza y setState en effect. Requiere criterio por componente. |
| Imagenes `<img>` | 6 | Migrable a `next/image`, pero puede requerir configurar dominios remotos. |
| `react/no-unescaped-entities` | 6 | Bajo riesgo; se puede corregir por textos. |
| `jsx-a11y/alt-text` | 3 | Bajo riesgo; agregar `alt` correcto. |
| Imports/exports | 1 | Uso CommonJS residual o import incompatible. |
| Archivos obsoletos | 0 | La limpieza de archivos temporales previa redujo esta categoria. |

## Top archivos con mayor deuda

| Archivo | Hallazgos |
|---|---:|
| `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx` | 59 |
| `app/proyectos/[id]/page.tsx` | 51 |
| `app/dashboard/page.tsx` | 39 |
| `app/tareas/page.tsx` | 23 |
| `app/envio-materiales/page.tsx` | 21 |
| `app/envios-materiales/page.tsx` | 21 |
| `app/prestamos/page.tsx` | 20 |
| `app/rq/page.tsx` | 20 |
| `app/rrhh/trabajadores/page.tsx` | 20 |
| `app/crm/page.tsx` | 16 |

## Correcciones aplicadas en esta tarea

No se corrigio deuda funcional de ESLint en componentes o paginas.

Cambio de bajo riesgo aplicado:

- Se agrego `eslint-report*.json` a `.gitignore` para evitar commitear reportes temporales generados por auditorias.

Motivo para no corregir mas:

- El 77% de los hallazgos son `any`; requieren modelo de tipos y entendimiento del dominio.
- Los errores de hooks pueden cambiar comportamiento si se corrigen mecanicamente.
- Los archivos con mayor deuda son pantallas grandes de flujos criticos: proyectos, cotizaciones, dashboard, RQ y RRHH.

## Plan por fases para dejar lint en verde

### Fase 1 - Higiene automatica y bajo riesgo

Objetivo: reducir ruido sin tocar logica.

- Corregir imports/variables no usados.
- Corregir `react/no-unescaped-entities`.
- Agregar `alt` faltantes.
- Migrar `<a>` internos simples a `Link` en pantallas de bajo riesgo.
- Mantener `npx tsc --noEmit --pretty false` obligatorio.

### Fase 2 - Hooks estructurales por archivo

Objetivo: eliminar errores de hooks sin regresiones.

- Empezar por componentes pequenos.
- Mover funciones usadas por `useEffect` dentro del efecto o estabilizarlas con `useCallback`.
- Validar manualmente cada flujo tocado.
- No corregir todos los hooks en una sola PR.

### Fase 3 - Tipos base de dominio

Objetivo: atacar `any` de forma sistemica.

- Crear tipos compartidos para `Perfil`, `Proyecto`, `Cliente`, `Cotizacion`, `RQ`, `Factura`, `Liquidacion`, `Tarea`, `Trabajador`.
- Generar tipos Supabase cuando exista esquema versionado.
- Reemplazar `any` primero en `app/api` y `lib`.
- Luego avanzar por modulos: proyectos, finanzas, RRHH.

### Fase 4 - Pantallas criticas

Objetivo: reducir deuda donde hay mayor riesgo.

Orden recomendado:

1. `app/proyectos/[id]/cotizaciones/[cotId]/page.tsx`
2. `app/proyectos/[id]/page.tsx`
3. `app/dashboard/page.tsx`
4. `app/rq/page.tsx`
5. `app/rrhh/trabajadores/page.tsx`
6. `app/tareas/page.tsx`

### Fase 5 - CI

Objetivo: evitar regresiones.

- Mantener lint focalizado obligatorio para archivos tocados.
- Agregar check incremental por carpeta.
- Cuando cada carpeta este limpia, ampliar el scope.
- Finalmente hacer obligatorio `npm run lint` global.

## Riesgos pendientes

- `npm run lint` global sigue fallando.
- La deuda de `any` impide que ESLint sea una barrera efectiva de calidad.
- Corregir hooks en masa puede introducir loops, recargas o cambios de sincronizacion.
- Migrar `<img>` a `next/image` puede requerir cambios de config para dominios remotos.

## Matriz PASS/FAIL

| Objetivo | Resultado |
|---|---:|
| Ejecutar lint global | PASS |
| Clasificar errores por categoria | PASS |
| No corregir todo | PASS |
| Corregir solo bajo riesgo | PASS |
| Proponer plan por fases | PASS |
| Ejecutar build | PASS |
| Ejecutar tsc | PASS |
| Entregar PR separado o reporte tecnico | PASS |

## Recomendacion

No intentar una PR unica de lint global.

Aplicar el plan por fases y usar lint focalizado por carpeta/archivo tocado hasta que los modulos criticos queden estabilizados.

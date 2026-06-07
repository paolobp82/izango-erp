# Limpieza de configuracion critica

Fecha: 2026-06-07

## Diagnostico

Se encontraron configuraciones duplicadas:

- `next.config.ts`
- `next.config.js`
- `postcss.config.js`
- `postcss.config.mjs`

La configuracion consolidada queda asi:

- Next.js: `next.config.ts`
- PostCSS/Tailwind: `postcss.config.js`

Se eliminaron:

- `next.config.js`
- `postcss.config.mjs`

## Motivo

`next.config.ts` contiene la configuracion PWA consolidada. Mantener tambien `next.config.js` creaba ambiguedad y duplicaba configuracion TypeScript.

`postcss.config.js` usa `tailwindcss` y `autoprefixer`, que corresponde al setup actual con `tailwindcss` 3.x. `postcss.config.mjs` apuntaba a `@tailwindcss/postcss`, que corresponde a Tailwind 4.x y duplicaba la configuracion.

## Flags peligrosos revisados

`eslint.ignoreDuringBuilds` fue retirado porque Next.js 16 ya no soporta la configuracion `eslint` dentro de `next.config`. ESLint debe ejecutarse con `npm run lint`, `npx eslint ...` o CI.

`typescript.ignoreBuildErrors` fue retirado posteriormente en la tarea 6, despues de corregir los errores reales reportados por `tsc --noEmit`.

## Plan para reactivar validacion gradualmente

1. Mantener build productivo estable con los flags actuales mientras se reduce deuda.
2. Crear checks focalizados por area sensible:
   - `app/api`
   - `lib`
   - `middleware.ts`
   - `components/layout`
3. Corregir errores TypeScript de rutas server-side primero.
4. Corregir hooks/dependencias y `any` en modulos de alto trafico.
5. Cambiar CI para ejecutar lint focalizado obligatorio.
6. Cuando `npx eslint app/api lib middleware.ts` pase limpio, hacer obligatorio ese lint focalizado en CI.
7. Mantener `npx tsc --noEmit --pretty false` como check obligatorio para evitar regresiones TypeScript.
8. Finalmente habilitar `npm run lint` global como requisito de merge.

## Riesgo pendiente

ESLint ya no esta integrado al build por config de Next 16, asi que debe quedar visible como check separado de CI.

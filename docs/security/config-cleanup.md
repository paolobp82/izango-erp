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

`next.config.ts` contiene la configuracion PWA y el flag TypeScript de build activo. Mantener tambien `next.config.js` creaba ambiguedad y duplicaba `typescript.ignoreBuildErrors`.

`postcss.config.js` usa `tailwindcss` y `autoprefixer`, que corresponde al setup actual con `tailwindcss` 3.x. `postcss.config.mjs` apuntaba a `@tailwindcss/postcss`, que corresponde a Tailwind 4.x y duplicaba la configuracion.

## Flags peligrosos revisados

Actualmente sigue activo:

```ts
typescript: { ignoreBuildErrors: true },
```

`eslint.ignoreDuringBuilds` fue retirado porque Next.js 16 ya no soporta la configuracion `eslint` dentro de `next.config`. ESLint debe ejecutarse con `npm run lint`, `npx eslint ...` o CI.

`typescript.ignoreBuildErrors` no se retiro en esta tarea porque el repo tiene deuda global de tipos y el objetivo explicito fue no arreglar todo el lint global todavia.

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
7. Cuando `tsc --noEmit` pase en `app/api`, `lib` y componentes compartidos, quitar `typescript.ignoreBuildErrors`.
8. Finalmente habilitar `npm run lint` global como requisito de merge.

## Riesgo pendiente

Mientras `typescript.ignoreBuildErrors` siga activo, `next build` puede pasar aunque existan errores de TypeScript. ESLint ya no esta integrado al build por config de Next 16, asi que debe quedar visible como check separado de CI.

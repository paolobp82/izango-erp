# Permission Engine

El Permission Engine actual vive en `lib/permisos` y se mantiene sin cambios en esta fase.

## Estado Actual

- Define perfiles, modulos, acciones y alcances.
- Alimenta migraciones progresivas como Sidebar y Dashboard.
- Convive con permisos hardcodeados que aun existen en modulos funcionales.

## Regla de Compatibilidad

No se mueven archivos de `lib/permisos`.
No se modifican imports existentes.
No se reemplazan permisos internos de pantallas en esta fase.

## Relacion Futura con Core

En una fase posterior, el Permission Engine podra registrarse o integrarse como una pieza del Core Engine, pero hoy sigue siendo independiente para evitar regresiones.


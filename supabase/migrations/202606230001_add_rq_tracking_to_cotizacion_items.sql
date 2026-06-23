alter table public.cotizacion_items
add column if not exists estado_rq text default 'pendiente';

alter table public.cotizacion_items
add column if not exists rq_generado_id uuid references public.requerimientos_pago(id) on delete set null;

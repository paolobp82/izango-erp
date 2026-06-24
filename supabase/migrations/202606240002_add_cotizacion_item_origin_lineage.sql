alter table public.cotizacion_items
add column if not exists origen_item_id uuid references public.cotizacion_items(id) on delete set null;

update public.cotizacion_items
set origen_item_id = id
where origen_item_id is null;

create index if not exists idx_cotizacion_items_origen_item_id
on public.cotizacion_items(origen_item_id);

notify pgrst, 'reload schema';

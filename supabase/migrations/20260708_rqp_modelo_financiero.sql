alter table public.requerimientos_pago
  add column if not exists condicion_comercial text,
  add column if not exists medio_pago text,
  add column if not exists fecha_necesidad_pago date,
  add column if not exists estado_documentario text default 'sin_comprobante',
  add column if not exists comprobante_tipo text,
  add column if not exists comprobante_serie text,
  add column if not exists comprobante_numero text,
  add column if not exists comprobante_fecha_emision date,
  add column if not exists comprobante_fecha_vencimiento date,
  add column if not exists comprobante_ruc text,
  add column if not exists comprobante_razon_social text,
  add column if not exists comprobante_direccion text,
  add column if not exists comprobante_moneda text default 'PEN',
  add column if not exists comprobante_valor_venta numeric default 0,
  add column if not exists comprobante_igv numeric default 0,
  add column if not exists comprobante_total numeric default 0,
  add column if not exists comprobante_detraccion numeric default 0,
  add column if not exists comprobante_retencion numeric default 0,
  add column if not exists comprobante_detalle jsonb default '[]'::jsonb,
  add column if not exists comprobante_pdf_url text,
  add column if not exists comprobante_xml_url text,
  add column if not exists comprobante_cdr_url text;

update public.requerimientos_pago
set condicion_comercial = case
  when tipo_pago in ('contado', 'credito', 'adelanto') then tipo_pago
  else 'contado'
end
where condicion_comercial is null;

update public.requerimientos_pago
set medio_pago = case
  when tipo_transferencia ilike '%efectivo%' then 'Efectivo'
  else 'Transferencia'
end
where medio_pago is null;

update public.requerimientos_pago
set fecha_necesidad_pago = case
  when fecha_necesidad_pago is not null then fecha_necesidad_pago
  when condicion_comercial = 'credito' and dias_credito is not null and created_at is not null then (created_at::date + dias_credito::int)
  when created_at is not null then created_at::date
  else null
end
where fecha_necesidad_pago is null;

alter table public.requerimientos_pago
  drop constraint if exists requerimientos_pago_condicion_comercial_check;

alter table public.requerimientos_pago
  add constraint requerimientos_pago_condicion_comercial_check
  check (condicion_comercial is null or condicion_comercial in ('contado', 'credito', 'adelanto'));

alter table public.requerimientos_pago
  drop constraint if exists requerimientos_pago_medio_pago_check;

alter table public.requerimientos_pago
  add constraint requerimientos_pago_medio_pago_check
  check (medio_pago is null or medio_pago in ('Transferencia', 'Efectivo'));

alter table public.requerimientos_pago
  drop constraint if exists requerimientos_pago_estado_documentario_check;

alter table public.requerimientos_pago
  add constraint requerimientos_pago_estado_documentario_check
  check (estado_documentario is null or estado_documentario in ('sin_comprobante', 'pendiente', 'recibido', 'validado', 'observado'));


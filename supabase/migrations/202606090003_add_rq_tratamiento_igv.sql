alter table public.requerimientos_pago
  add column if not exists tratamiento_igv text;

update public.requerimientos_pago
set tratamiento_igv = case
  when incluye_igv = false then 'mas_igv'
  else 'incluye_igv'
end
where tratamiento_igv is null;

alter table public.requerimientos_pago
  alter column tratamiento_igv set default 'incluye_igv';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'requerimientos_pago_tratamiento_igv_check'
  ) then
    alter table public.requerimientos_pago
      add constraint requerimientos_pago_tratamiento_igv_check
      check (tratamiento_igv in ('incluye_igv', 'mas_igv', 'no_aplica')) not valid;
  end if;
end
$$;

alter table public.requerimientos_pago
  validate constraint requerimientos_pago_tratamiento_igv_check;

create index if not exists idx_requerimientos_pago_tratamiento_igv
  on public.requerimientos_pago(tratamiento_igv);

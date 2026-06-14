alter table public.requerimientos_pago
  add column if not exists codigo_rq text,
  add column if not exists numero_rq text,
  add column if not exists tratamiento_igv text not null default 'incluye_igv',
  add column if not exists solicitado_por uuid references public.perfiles(id) on delete set null,
  add column if not exists editado_por_creador boolean not null default false,
  add column if not exists fecha_primera_edicion timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid references public.perfiles(id) on delete set null;

alter table public.requerimientos_pago
  add column if not exists subtotal numeric generated always as (
    case
      when tratamiento_igv = 'mas_igv' then coalesce(monto_solicitado, 0)
      when tratamiento_igv = 'no_aplica' then coalesce(monto_solicitado, 0)
      else round((coalesce(monto_solicitado, 0) / 1.18)::numeric, 2)
    end
  ) stored,
  add column if not exists igv numeric generated always as (
    case
      when tratamiento_igv = 'mas_igv' then round((coalesce(monto_solicitado, 0) * 0.18)::numeric, 2)
      when tratamiento_igv = 'no_aplica' then 0
      else round((coalesce(monto_solicitado, 0) - (coalesce(monto_solicitado, 0) / 1.18))::numeric, 2)
    end
  ) stored,
  add column if not exists total numeric generated always as (
    case
      when tratamiento_igv = 'mas_igv' then round((coalesce(monto_solicitado, 0) * 1.18)::numeric, 2)
      else coalesce(monto_solicitado, 0)
    end
  ) stored;

update public.requerimientos_pago
set tratamiento_igv = 'incluye_igv'
where tratamiento_igv is null
   or tratamiento_igv not in ('incluye_igv', 'mas_igv', 'no_aplica');

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
end $$;

alter table public.requerimientos_pago
  validate constraint requerimientos_pago_tratamiento_igv_check;

create unique index if not exists requerimientos_pago_codigo_rq_key
  on public.requerimientos_pago(codigo_rq)
  where codigo_rq is not null;

create index if not exists idx_requerimientos_pago_solicitado_por
  on public.requerimientos_pago(solicitado_por);

create index if not exists idx_requerimientos_pago_proyecto_id
  on public.requerimientos_pago(proyecto_id);

create index if not exists idx_requerimientos_pago_tratamiento_igv
  on public.requerimientos_pago(tratamiento_igv);

grant select, insert, update on public.requerimientos_pago to authenticated;

drop policy if exists "rq update finance roles" on public.requerimientos_pago;
create policy "rq update finance roles"
on public.requerimientos_pago
for update
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and lower(p.perfil::text) in ('superadmin', 'controller')
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and lower(p.perfil::text) in ('superadmin', 'controller')
  )
);

drop policy if exists "rq update creator once" on public.requerimientos_pago;
create policy "rq update creator once"
on public.requerimientos_pago
for update
to authenticated
using (
  solicitado_por = auth.uid()
  and coalesce(editado_por_creador, false) = false
  and estado not in ('pagado', 'cerrado', 'cancelado')
)
with check (
  solicitado_por = auth.uid()
  and estado not in ('pagado', 'cerrado', 'cancelado')
);

notify pgrst, 'reload schema';

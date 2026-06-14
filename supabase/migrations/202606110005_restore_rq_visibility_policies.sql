alter table public.requerimientos_pago disable row level security;

grant select, insert, update on public.requerimientos_pago to authenticated;

drop policy if exists "rq read authenticated" on public.requerimientos_pago;
create policy "rq read authenticated"
on public.requerimientos_pago
for select
to authenticated
using (true);

drop policy if exists "rq insert authenticated" on public.requerimientos_pago;
create policy "rq insert authenticated"
on public.requerimientos_pago
for insert
to authenticated
with check (true);

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
  and estado::text <> 'pagado'
)
with check (
  solicitado_por = auth.uid()
  and estado::text <> 'pagado'
);

alter table public.requerimientos_pago enable row level security;

notify pgrst, 'reload schema';

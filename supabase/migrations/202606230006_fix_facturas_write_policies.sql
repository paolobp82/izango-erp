drop policy if exists "facturas_insert_finanzas" on public.facturas;

create policy "facturas_insert_finanzas"
on public.facturas
for insert
to authenticated
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
      and p.activo = true
  )
);

drop policy if exists "facturas_update_finanzas" on public.facturas;

create policy "facturas_update_finanzas"
on public.facturas
for update
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
      and p.activo = true
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
      and p.activo = true
  )
);

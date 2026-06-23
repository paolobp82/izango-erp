drop policy if exists "facturas_select_finanzas" on public.facturas;

create policy "facturas_select_finanzas"
on public.facturas
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.perfil in ('superadmin', 'gerente_general', 'controller')
      and p.activo = true
  )
);

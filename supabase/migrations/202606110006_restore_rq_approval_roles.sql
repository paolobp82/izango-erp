grant update on public.requerimientos_pago to authenticated;

drop policy if exists "rq update approval roles" on public.requerimientos_pago;
create policy "rq update approval roles"
on public.requerimientos_pago
for update
to authenticated
using (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and lower(p.perfil::text) in ('superadmin', 'gerente_general', 'gerente_produccion')
  )
)
with check (
  exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and lower(p.perfil::text) in ('superadmin', 'gerente_general', 'gerente_produccion')
  )
);

notify pgrst, 'reload schema';

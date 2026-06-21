-- proveedores_rating is read from the authenticated browser client.
-- SECURITY INVOKER makes the view honor the caller's permissions and the RLS
-- policies of every base table referenced by the view.
do $$
declare
  base_dependency record;
  view_grant record;
  view_sql text;
begin
  if to_regclass('public.proveedores_rating') is null then
    raise exception 'Required view public.proveedores_rating does not exist';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.proveedores_rating'::regclass
      and relkind = 'v'
  ) then
    raise exception 'public.proveedores_rating exists but is not a regular view';
  end if;

  select pg_get_viewdef('public.proveedores_rating'::regclass, true)
  into view_sql;
  raise notice 'proveedores_rating SQL: %', view_sql;

  for base_dependency in
    select distinct
      base_ns.nspname as schema_name,
      base.relname as table_name,
      base.relrowsecurity as rls_enabled,
      base.relforcerowsecurity as rls_forced
    from pg_rewrite rewrite
    join pg_depend dep on dep.objid = rewrite.oid
    join pg_class base on base.oid = dep.refobjid
    join pg_namespace base_ns on base_ns.oid = base.relnamespace
    where rewrite.ev_class = 'public.proveedores_rating'::regclass
      and base.relkind in ('r', 'p')
    order by 1, 2
  loop
    raise notice 'Base table %.%: rls_enabled=%, rls_forced=%',
      base_dependency.schema_name,
      base_dependency.table_name,
      base_dependency.rls_enabled,
      base_dependency.rls_forced;

    if not base_dependency.rls_enabled then
      raise warning 'Base table %.% does not have RLS enabled',
        base_dependency.schema_name,
        base_dependency.table_name;
    end if;
  end loop;

  for view_grant in
    select grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'proveedores_rating'
    order by grantee, privilege_type
  loop
    raise notice 'Existing proveedores_rating grant: grantee=%, privilege=%',
      view_grant.grantee,
      view_grant.privilege_type;
  end loop;
end;
$$;

alter view public.proveedores_rating
  set (security_invoker = on);

revoke all on public.proveedores_rating from public;
revoke all on public.proveedores_rating from anon;
grant select on public.proveedores_rating to authenticated;

comment on view public.proveedores_rating is
  'Supplier rating aggregate. SECURITY INVOKER enforces caller permissions and base-table RLS.';

-- Production audit queries:
--
-- Exact view SQL:
-- select pg_get_viewdef('public.proveedores_rating'::regclass, true);
--
-- Base tables and RLS state:
-- select distinct
--   base_ns.nspname as schema_name,
--   base.relname as table_name,
--   base.relrowsecurity as rls_enabled,
--   base.relforcerowsecurity as rls_forced
-- from pg_rewrite rewrite
-- join pg_depend dependency on dependency.objid = rewrite.oid
-- join pg_class base on base.oid = dependency.refobjid
-- join pg_namespace base_ns on base_ns.oid = base.relnamespace
-- where rewrite.ev_class = 'public.proveedores_rating'::regclass
--   and base.relkind in ('r', 'p')
-- order by 1, 2;
--
-- Effective view grants:
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name = 'proveedores_rating'
-- order by grantee, privilege_type;

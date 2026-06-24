alter table facturas
add column if not exists tipo_factura text default 'final';

update facturas
set tipo_factura = 'final'
where tipo_factura is null;

alter table facturas
alter column tipo_factura set default 'final';

alter table facturas
drop constraint if exists facturas_tipo_factura_check;

alter table facturas
add constraint facturas_tipo_factura_check
check (tipo_factura in ('parcial', 'final'));

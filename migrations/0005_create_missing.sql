-- Enable create_missing (file ask → Desk Missing) for new operators.
alter table settings
  alter column plugins set default '["get_time","fetch_page","calc","create_missing"]';

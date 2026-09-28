-- Launch plugin catalog defaults for new settings rows.
-- Soft-enable utility + web demos; Computer/Browser stay on for the OSS spike path.
alter table settings
  alter column plugins set default '["get_time","calc","hash","uuid","base64","json_format","regex","fetch_page","link_unfurl","weather","create_missing","computer","browser"]';

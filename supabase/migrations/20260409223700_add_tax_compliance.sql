alter table business_profile 
add column if not exists tin text,
add column if not exists vat_number text,
add column if not exists vat_rate numeric default 7.5,
add column if not exists include_vat_default boolean default false;

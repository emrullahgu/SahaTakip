-- =============================================================
-- bordro_aylik.employee_id FK'sını kaldır — elle (manuel) personel girişine izin ver
-- =============================================================
-- SORUN: employee_id employees(id)'ye FK ile bağlıydı. Kayıtlı personel olmayan kişiler
-- (employees tablosunda satırı olmayan, elle ad/TC girilen personel) için bordro açmak
-- FK ihlaliyle reddediliyordu. Bordro zaten ad/TC'yi kendi içinde tutuyor; employee_id
-- yalnız OPSİYONEL bağ (self-view RLS: employees.user_id eşleşmesi) için kullanılır.
-- FK kaldırılır; sütun (uuid, nullable) opsiyonel bağ olarak kalır. RLS join'i etkilenmez.
alter table public.bordro_aylik drop constraint if exists bordro_aylik_employee_id_fkey;

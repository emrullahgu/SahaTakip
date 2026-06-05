-- Tekil isim: aynı isimden yalnızca 1 kişi olabilir (farklı e-postalar olsa bile).
-- Normalizasyon: NFC + küçük harf + trim. Boş/NULL isimler hariç tutulur.
-- Not: Mevcut çiftler (2 boş "Emrullah Günay" + 1 boş "İbrahim Çağdaş" test hesabı)
-- 20260620'de temizlendikten sonra bu indeks güvenle kurulabilir.
create unique index if not exists profiles_unique_full_name
  on public.profiles (lower(trim(normalize(full_name, NFC))))
  where full_name is not null and trim(full_name) <> '';

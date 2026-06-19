-- Tekliflere görsel ekleme: quotes.images (storage public URL'leri dizisi).
-- PDF'e basılır + teklif ekranında küçük resim olarak gösterilir.
alter table public.quotes
  add column if not exists images jsonb not null default '[]'::jsonb;

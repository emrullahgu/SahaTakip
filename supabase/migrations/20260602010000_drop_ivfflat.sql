-- 2026-06-02 — ivfflat indexini az veriyle problem yaratmasın diye kaldır.
-- Veri büyüdüğünde yeniden ekleyeceğiz:
--   create index ai_chunks_embedding_idx on public.ai_chunks
--     using ivfflat (embedding vector_cosine_ops) with (lists = 100);
drop index if exists public.ai_chunks_embedding_idx;

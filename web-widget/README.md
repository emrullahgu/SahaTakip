# KOBİNERJİ Web Karşılama Botu — Widget

Web sitenize **tek `<script>` satırı** ile eklenen, bağımsız (çerçevesiz) sohbet widget'ı.
İç CRM/PII'ye erişmez; yalnız **kamuya açık bilgi** (is_public RAG korpusu) ile yanıtlar ve
ziyaretçi **talebini toplar** (operatör onay kutusuna düşer). Tüm güvenlik `public-chat` edge
fonksiyonunda: captcha + IP rate-limit + günlük token bütçesi + ayrı LLM kotası.

## 1) Backend hazırlığı (bir kez)

```bash
# Migration (web_requests + rate-limit RPC + is_public korpus) — db push:
npx supabase db push   # veya migration'ı SQL editöründe çalıştır

# Edge fonksiyonlarını deploy et:
npx supabase functions deploy public-chat --no-verify-jwt --project-ref mdwcasycfssdkogdlbyh
npx supabase functions deploy ai-rag --project-ref mdwcasycfssdkogdlbyh         # is_public ingest
npx supabase functions deploy ai-rag-crawl --project-ref mdwcasycfssdkogdlbyh   # web sitesi tarama

# Secrets (opsiyonel ama önerilir):
npx supabase secrets set PUBLIC_OPENAI_API_KEY=sk-...   # public bot için AYRI kota
npx supabase secrets set TURNSTILE_SECRET=0x...         # Cloudflare Turnstile (captcha)
# İnce ayar (varsayılanlar makul): PUBLIC_CHAT_IP_PER_MIN=15  PUBLIC_CHAT_DAILY_MAX=3000  PUBLIC_CHAT_MODEL=gpt-4o-mini
```

## 2) Kamuya açık içeriği yükle (botun "bildiği" şey)

Uygulamadan (admin/manager) **web sitesi içeriğini tara** → `ai-rag-crawl`:
- `aiRagCrawl({ sitemap: 'https://SITENIZ/sitemap.xml' })` veya `aiRagCrawl({ urls: ['https://.../hizmetler', ...] })`
- Bu içerik `is_public=true` indekslenir; **yalnız bu** korpus public bota açıktır.
- Müşteri/iş emri/teklif gibi iç veriler `is_public=false` → public bota **asla** sızmaz.

## 3) Siteye göm

Sitenizin `</body>` öncesine:

```html
<script src="https://SITENIZ/kobinerji-chat-widget.js"
        data-supabase-url="https://mdwcasycfssdkogdlbyh.supabase.co"
        data-anon-key="sb_publishable_..."
        data-turnstile-sitekey="0x..."     <!-- opsiyonel; captcha -->
        data-title="KOBİNERJİ Asistan"
        data-accent="#06b6d4" defer></script>
```

- `data-anon-key` **publishable** key'tir (uygulama bundle'ında zaten herkese açık; RLS korur).
- `kobinerji-chat-widget.js`'i Netlify/CDN'e koyun (örn. `dist/` veya ayrı bir host).
- Captcha istemiyorsanız `data-turnstile-sitekey`'i boş bırakın (rate-limit yine korur).

## Güvenlik notları
- Bot **TOOL kullanmaz, DB'ye yazmaz** (yalnız `web_requests`'e talep ekler — service_role).
- Fiyat: bağlamda açık fiyat varsa "TAHMİN, bağlayıcı değil" notuyla; yoksa **uydurmaz**, talep toplar.
- `web_requests` yalnız personel (admin/manager/engineer) tarafından okunur (RLS).
- Captcha **kurulana kadar** bot rate-limit ile çalışır; üretimde Turnstile şiddetle önerilir.

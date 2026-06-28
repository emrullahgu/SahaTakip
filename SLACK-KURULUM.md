# Slack Entegrasyonu — Kurulum (Faz 2)

İş organizasyonu için Slack katmanı: **dışarı bildirim** (`slack-send`) + **içeri komut/@mention → AI ajan** (`slack-webhook`).
Google Chat entegrasyonunun (`gchat-send`/`gchat-webhook`) birebir Slack ikizidir; aynı `ai-tools` ajanını kullanır.

> **Slack CLI'a (`slack create` / `slack run`) GEREK YOK.** O yol uygulamayı Slack'in
> kendi altyapısında (Deno/Bolt) barındırır → ikinci bir backend olurdu. Bizim backend'imiz
> Supabase, doğru kaynak `work_orders` DB'si. Bize gereken sadece bir **Slack App + Bot Token + Signing Secret**.

## 1. Slack App oluştur (manifest ile, 2 tık)
1. <https://api.slack.com/apps> → **Create New App** → **From a manifest**
2. Workspace'i seç
3. [`supabase/functions/slack-webhook/slack-app-manifest.json`](supabase/functions/slack-webhook/slack-app-manifest.json) içeriğini yapıştır → **Create**

Manifest şunları tanımlar: bot kullanıcı, `/saha` slash komutu, `app_mention` event aboneliği,
scope'lar (`chat:write`, `commands`, `app_mentions:read`). request URL'ler zaten bizim fonksiyonumuz:
`https://mdwcasycfssdkogdlbyh.supabase.co/functions/v1/slack-webhook`

## 2. Kur ve anahtarları al
1. **Install to Workspace** → izin ver
2. **OAuth & Permissions** → *Bot User OAuth Token* (`xoxb-...`) kopyala
3. **Basic Information → App Credentials → Signing Secret** kopyala

## 3. Secrets (sunucuda, client'a ASLA girmez)
```bash
supabase secrets set SLACK_BOT_TOKEN=xoxb-... SLACK_SIGNING_SECRET=...
```

## 4. Deploy
```bash
npm run sb:deploy:slack
# = supabase functions deploy slack-send
#   supabase functions deploy slack-webhook --no-verify-jwt
```
> **Sıra notu:** App'i manifest'ten oluştururken (adım 1) fonksiyon henüz deploy olmadığından
> Slack, Events "Request URL"ini doğrulayamaz ve **unverified** gösterebilir — bu normaldir.
> Secrets + deploy (adım 3-4) bittikten sonra dashboard'da **Event Subscriptions → Request URL**
> alanını tekrar kaydet/Retry et; fonksiyon `url_verification` challenge'ını cevaplayınca
> **Verified** olur. (Slash komut URL doğrulaması gerektirmez, deploy sonrası direkt çalışır.)

## 5. Test
- Bir kanalda: `/saha bu hafta tamamlanan iş emirleri kaç tane?`
- Veya botu kanala ekleyip: `@SahaTakip Demir Yapı için yarın 14:00 klima bakımı iş emri aç`
- Ajan cevabı + yapılan işlemler (örn. `✅ İş emri 2026-014 — Klima bakımı`) kanala düşer.

## 6. Bildirim gönderme (uygulamadan/sunucudan)
`slack-send` korumalı (JWT/role gerekir). Örnek çağrı:
```jsonc
// POST /functions/v1/slack-send   (Authorization: Bearer <kullanıcı JWT veya service role>)
{ "channel": "#saha", "text": "🔔 İş emri 2026-014 SLA aşımına yaklaşıyor",
  "related_type": "workorder", "related_id": "<uuid>" }
```
Tüm trafik `channel_messages` tablosuna (`channel='slack'`) loglanır.

## Güvenlik
- **Fail-closed:** `SLACK_SIGNING_SECRET` yoksa `slack-webhook` 503 döner (kimliksiz tetikleme yok).
- **İmza:** Her POST `X-Slack-Signature` (v0 HMAC-SHA256) ile sabit-zamanlı doğrulanır; 5 dk'dan eski istek (replay) reddedilir.
- **Retry dedupe:** `X-Slack-Retry-Num` başlıklı tekrar istekleri yeniden işlenmez (çift gönderim yok).
- **Döngü önleme:** Bot kendi mesajlarını (`bot_id`/`bot_message`) yok sayar.
- `slack-send` fail-closed: `SLACK_BOT_TOKEN` yoksa 503.

## Notlar / sonraki adım
- İlk dilim: slash komut + @mention (doğal dil → ajan). **Buton/etkileşim (Onayla vb.)** kapalı
  (`interactivity.is_enabled=false`); istenirse ikinci dilimde `block_actions` handler eklenir.
- Ajan yetenekleri `ai-tools` ile aynıdır (iş emri/teklif/müşteri/sorgu); Slack yalnız yeni bir ön yüzdür.

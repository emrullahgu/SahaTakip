# send-quote-email Edge Function — POZ-DEV-037

Teklif e-postalarını **Resend** üzerinden gönderir. Uygulama (`src/services/quoteEmail.ts`)
önce bu fonksiyonu çağırır; başarısız olursa cihazdaki `mailto:` uygulamasına düşer.

## Kurulum

1. Resend hesabı açın, doğrulanmış bir gönderim domain'i ekleyin (örn. `sahatakip.app`).
2. API anahtarı oluşturun (`re_xxxxxxxx...`).
3. Supabase CLI ile fonksiyonu deploy edin:

```bash
supabase functions deploy send-quote-email
supabase secrets set RESEND_API_KEY=re_xxxx \
  RESEND_FROM="SahaTakip <noreply@sahatakip.app>"
```

## İstemci kullanımı

Mevcut `quoteEmail.ts` doğrudan bu fonksiyonu çağırır:

```ts
await supabase.functions.invoke('send-quote-email', {
  body: { to, subject, html, quote, pdfUri }
});
```

## Geliştirme

Yerel test için `supabase functions serve send-quote-email --env-file ./.env.local` kullanın.
`.env.local` örneği:

```
RESEND_API_KEY=re_test_xxx
RESEND_FROM=SahaTakip <onboarding@resend.dev>
```

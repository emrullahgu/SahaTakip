// services/agent/loop.ts
// ---------------------------------------------------------------
// Otonom ajan döngüsü:
//   plan -> LLM (chatWithTools) -> tool çağrıları -> sonuçlar -> tekrar
// Her adım onStep callback'i ile UI'ya stream edilir.
// `finish` tool'u veya maxIterations limitiyle sonlanır.
// Destructive tool'lar için confirm callback çağrılır; reddedilirse
// LLM'e "iptal edildi" cevabı döner ve döngü devam eder.
// ---------------------------------------------------------------

import { chatWithToolsFallback, type ChatMessage } from '../ai';
import { AGENT_TOOLS, getAllToolSchemas, type AgentContext } from './tools';
import type { AiSettings } from '../../types';

export type AgentEvent =
  | { type: 'start'; goal: string }
  | { type: 'thought'; content: string }
  | { type: 'tool_call'; id: string; name: string; args: any }
  | { type: 'tool_result'; id: string; name: string; result: any; ok: boolean; error?: string }
  | { type: 'tool_denied'; id: string; name: string; reason: string }
  | { type: 'iteration'; n: number; max: number }
  | { type: 'final'; content: string }
  | { type: 'error'; error: string }
  | { type: 'stop'; reason: string };

export interface RunAgentOptions {
  goal: string;
  ctx: AgentContext;
  maxIterations?: number;
  /** UI'ya her olay için çağrılır. */
  onEvent: (e: AgentEvent) => void;
  /** Dışarıdan durdurma sinyali. */
  shouldStop?: () => boolean;
  /** Override AI settings (provider/model/key). Verilmezse global ayar kullanılır. */
  settings?: AiSettings;
}

const SYSTEM_PROMPT = `Sen SahaTakip iş yönetim platformu için Türkçe konuşan otonom bir saha operasyon ajanısın.

Görevin: Kullanıcının verdiği hedefi gerçekleştirmek için sana sağlanan tool'ları (fonksiyonları) kullanarak araştırma yap, plan kur ve uygula.

YETENEKLERİN:
• Sistem analizi: \`analyze_system_health\` ile veri kalitesi/akış anomalilerini tara; her ciddi bulgu için \`add_suggestion\` çağırarak "Öneriler" defterine kaydet.
• Teklif danışmanlığı: Kullanıcı "X m² ev iç tesisat elektrik projelendirme + malzeme + işçilik" gibi serbest brief verdiğinde:
   1) \`find_similar_quotes\` ile geçmiş benzer tekliflere bak (varsa \`get_quote_detail\` ile kalemleri incele),
   2) \`search_poz\` (ve gerekirse \`search_products\`) ile uygun kalemleri seç (malzeme + işçilik dengeli),
   3) Mantıklı varsayımlarla miktarları hesapla (örn 130m² için kablo/kanal/anahtar/priz sayıları),
   4) \`create_quote_draft\` ile taslak teklif oluştur,
   5) Ardından \`update_quote_notes\` ile profesyonel bir açıklama yaz: kapsam, varsayımlar, hariç tutulanlar (badana, mobilya yok), garanti süresi (TSE/EMO standartları), ödeme koşulu, teslim süresi.
• ÇOK KALEMLİ teklif (kullanıcı uzun bir FİYATSIZ malzeme/hizmet listesi yapıştırıp "fiyatları sen bul / tek tek hazırla" dediğinde):
   1) Listeyi satır satır {description, quantity, unit} olarak ayrıştır,
   2) TEK ÇAĞRIDA \`match_poz_bulk\` ile hepsini katalogla eşleştir (her kalem için pozId + malzeme/montaj fiyatı döner) — kalemleri TEK TEK \`search_poz\` ile arama, çok yavaş olur,
   3) \`create_quote_draft\` ile SADECE matched!=null olanları {pozId, quantity} olarak ekle (fiyat güvenilir doldurulur),
   4) needsManualPrice=true olanları ASLA suggestion fiyatıyla otomatik fiyatlandırma (yanlış olabilir, toplamı şişirir) — bunları {pozId:"MANUAL-n", pozName, quantity, unit, materialPrice:0, installPrice:0} ile fiyatsız ekle,
   5) Sonunda kullanıcıya "şu kalemlerin birim fiyatını girmeniz gerekiyor: ..." diye AÇIK bir liste ver; özellikle birim uyuşmazlığı (kg↔adet vb.) olanları vurgula. Fiyat uydurma — emin değilsen 0 bırak.
• İnternet araştırması: \`web_search\` ile güncel ürün fiyatı, marka karşılaştırma, sektörel haber, regülasyon arama yap. \`fetch_url\` ile bir sayfayı temiz metin olarak oku (Jina Reader proxy ile CORS aşılır).
• Mevzuat takibi: \`list_regulation_sources\` → \`check_regulation_updates\` ile EMO, MMO, Resmî Gazete, ETKB, Sanayi Bakanlığı, CSB, TEDAŞ, KİK duyurularını tara. Yapılan iş ile ilgili güncel mevzuat değişikliğini bulursan \`add_suggestion\` ile uyarı oluştur.
• Dış mesajlaşma CANLI: \`gmail_send\` (e-posta) ve \`whatsapp_send\` (WhatsApp) gerçek gönderim yapar — bunlar onaylı (destructive) tool'lardır, kullanıcı onayını bekle. \`gmail_list_recent\` gelen e-postaları okur. Paraşüt ve Google Drive tool'ları henüz STUB'tır: çağrıldığında "yapılandırılmadı" döner ama yine de doğru argümanlarla çağır — bağlantı eklenince otomatik çalışır.
• Kullanıcının kendi dosyalarında araştırma istenirse \`gdrive_search\` → \`gdrive_read_file\` zincirini kullan (geçmiş teklifler, sözleşmeler, malzeme listeleri).
• İş emri yönetimi: list/update/delete tool'larıyla iş emirlerini yönet.
• Müşteri yönetimi: arama, oluşturma, silme.

KURALLAR:
1) Türkçe yanıt ver. Para birimi TL, KDV %20 varsayılan.
2) Her cevapta ya bir tool çağır ya da \`finish\` ile özet ver. Boş cevap verme.
3) Önce \`think\` ile planını yaz, sonra read tool'larıyla durumu öğren, ardından write tool'larıyla uygula, sonunda \`finish\` ile özetle.
4) Veriyi okumadan değişiklik yapma. Önce list_*/search_*/find_* ile doğrula.
5) Destructive tool'lar (silme, create_quote_draft) için kullanıcıdan onay istenecek; bunu bekle.
6) Tool sonuçları kısalmış olabilir; spesifik bilgi için aramayı daralt.
7) Aynı tool'u aynı argümanlarla iki defa çağırma.
8) Hedef belirsizse, varsayımını \`think\` ile belirt ve devam et — soru sormak yerine en mantıklı yorumla ilerle (tam otonom mod).
9) Web kaynağı kullanırken: önce \`web_search\` ile birkaç sonuç al, en alakalı 1-2 URL'i \`fetch_url\` ile aç, özetle. Tek başına bir snippet'e güvenme.
10) Teklif taslağı sonrası kullanıcıya "Teklifler ekranından açıp düzenleyebilirsiniz" diye hatırlat.`;

export async function runAgent(opts: RunAgentOptions): Promise<void> {
  const { goal, ctx, onEvent, shouldStop } = opts;
  const maxIterations = opts.maxIterations ?? 12;

  onEvent({ type: 'start', goal });

  const tools = getAllToolSchemas();
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: goal },
  ];

  let emptyTurns = 0; // sağlayıcı içerik+tool olmadan boş dönerse sayar
  for (let i = 1; i <= maxIterations; i++) {
    if (shouldStop?.()) {
      onEvent({ type: 'stop', reason: 'Kullanıcı durdurdu' });
      return;
    }
    onEvent({ type: 'iteration', n: i, max: maxIterations });

    let resp;
    try {
      resp = await chatWithToolsFallback(messages, tools, opts.settings);
    } catch (e: any) {
      onEvent({ type: 'error', error: 'LLM çağrısı başarısız: ' + (e?.message || String(e)) });
      return;
    }

    const { content, toolCalls, finishReason } = resp;

    if (content) onEvent({ type: 'thought', content });

    // Assistant mesajını history'ye ekle (tool_calls dahil)
    messages.push({
      role: 'assistant',
      content: content ?? null,
      tool_calls: toolCalls.length ? toolCalls : undefined,
    });

    // Tool çağrısı yoksa: anlamlı içerik varsa bitir; boşsa dürt (büyük/karmaşık
    // istekte sağlayıcı bazen boş yanıt döndürür — "(boş)" göstermek yerine yeniden dene).
    if (!toolCalls.length) {
      const text = (content ?? '').trim();
      if (text) {
        if (finishReason === 'stop' || finishReason === 'length') {
          onEvent({ type: 'final', content: text });
          return;
        }
        // İçerik var ama bitmedi — devam etmesini iste
        messages.push({ role: 'user', content: 'Devam et: bir sonraki tool çağrını yap veya finish ile bitir.' });
        continue;
      }
      // Boş içerik + tool yok: en fazla 2 kez dürt, sonra anlamlı hata ver
      emptyTurns += 1;
      if (emptyTurns >= 2) {
        onEvent({
          type: 'final',
          content:
            'Üzgünüm, bu isteği şu an işleyemedim (yapay zekâ sağlayıcısı boş yanıt döndürdü). ' +
            'Çok kalemli bir liste gönderdiyseniz daha küçük parçalara bölüp tekrar deneyin; ' +
            'sorun sürerse AI Asistan ayarlarından farklı bir model seçin.',
        });
        return;
      }
      messages.push({
        role: 'user',
        content:
          'Boş yanıt verdin. Lütfen uygun bir tool çağır (çok kalemli fiyatsız liste için match_poz_bulk, ' +
          'ardından create_quote_draft) veya finish ile özetle. Asla boş yanıt verme.',
      });
      continue;
    }
    emptyTurns = 0; // tool çağrısı geldi → sayaç sıfırla

    let finished = false;
    for (const tc of toolCalls) {
      const name = tc.function.name;
      let args: any = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        args = {};
      }
      onEvent({ type: 'tool_call', id: tc.id, name, args });

      const def = AGENT_TOOLS[name];
      if (!def) {
        const err = `Bilinmeyen tool: ${name}`;
        onEvent({ type: 'tool_result', id: tc.id, name, result: { error: err }, ok: false, error: err });
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: err }) });
        continue;
      }

      if (def.destructive) {
        const ok = await ctx.confirm(name, args);
        if (!ok) {
          onEvent({ type: 'tool_denied', id: tc.id, name, reason: 'Kullanıcı onaylamadı' });
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ ok: false, denied: true, reason: 'Kullanıcı onaylamadı' }),
          });
          continue;
        }
      }

      try {
        const result = await def.handler(args, ctx);
        onEvent({ type: 'tool_result', id: tc.id, name, result, ok: true });
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result ?? null) });
        if (name === 'finish') {
          onEvent({ type: 'final', content: result?.summary || 'Tamamlandı' });
          finished = true;
          break;
        }
      } catch (e: any) {
        const err = e?.message || String(e);
        onEvent({ type: 'tool_result', id: tc.id, name, result: { error: err }, ok: false, error: err });
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: err }) });
      }
    }
    if (finished) return;
  }

  onEvent({ type: 'stop', reason: `Maks. iterasyon (${maxIterations}) aşıldı` });
}

// re-export
export type { AgentContext } from './tools';

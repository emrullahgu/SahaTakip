// services/agent/webTools.ts
// ---------------------------------------------------------------
// Ajan için internet erişim tool'ları:
//  - web_search: Tavily Search API (CORS-friendly JSON). Anahtar yoksa
//    bilgilendirici hata döner.
//  - fetch_url: Jina AI Reader (https://r.jina.ai/<url>) ile temiz
//    markdown çıkarımı (CORS uyumlu, anahtarsız). Fallback: ham fetch.
//  - check_regulation_updates: TR sektörel mevzuat kaynak listesini
//    tarar (Resmi Gazete, EMO, ETKB, Sanayi Bakanlığı vb.) — fetch_url
//    altyapısını kullanır.
// ---------------------------------------------------------------

import type { ToolDef } from './tools';

// ---------- helpers ----------

function getTavilyKey(): string | undefined {
  // process.env Expo'da build zamanında inline edilir.
  // @ts-ignore
  const k = process.env?.EXPO_PUBLIC_TAVILY_KEY as string | undefined;
  return k && k.trim() ? k.trim() : undefined;
}

function getSerperKey(): string | undefined {
  // @ts-ignore
  const k = process.env?.EXPO_PUBLIC_SERPER_KEY as string | undefined;
  return k && k.trim() ? k.trim() : undefined;
}

function getBraveKey(): string | undefined {
  // @ts-ignore
  const k = process.env?.EXPO_PUBLIC_BRAVE_SEARCH_KEY as string | undefined;
  return k && k.trim() ? k.trim() : undefined;
}

async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function trim(s: string, max = 8000): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + `\n\n…[${s.length - max} karakter daha kırpıldı]` : s;
}

// ---------- web_search ----------

async function tavilySearch(query: string, maxResults: number, key: string) {
  const r = await fetchWithTimeout('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'basic',
      max_results: maxResults,
      include_answer: true,
    }),
    timeoutMs: 20000,
  });
  if (!r.ok) throw new Error('Tavily ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return {
    provider: 'tavily',
    answer: j.answer ?? null,
    results: (j.results || []).map((x: any) => ({
      title: x.title,
      url: x.url,
      snippet: x.content,
      score: x.score,
    })),
  };
}

async function serperSearch(query: string, maxResults: number, key: string) {
  const r = await fetchWithTimeout('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
    body: JSON.stringify({ q: query, gl: 'tr', hl: 'tr', num: maxResults }),
    timeoutMs: 20000,
  });
  if (!r.ok) throw new Error('Serper ' + r.status);
  const j = await r.json();
  return {
    provider: 'serper',
    answer: j.answerBox?.answer || j.answerBox?.snippet || null,
    results: (j.organic || []).slice(0, maxResults).map((x: any) => ({
      title: x.title,
      url: x.link,
      snippet: x.snippet,
    })),
  };
}

async function braveSearch(query: string, maxResults: number, key: string) {
  const u = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}&country=TR&search_lang=tr`;
  const r = await fetchWithTimeout(u, {
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': key },
    timeoutMs: 20000,
  });
  if (!r.ok) throw new Error('Brave ' + r.status);
  const j = await r.json();
  return {
    provider: 'brave',
    answer: j.infobox?.long_desc || null,
    results: (j.web?.results || []).slice(0, maxResults).map((x: any) => ({
      title: x.title,
      url: x.url,
      snippet: x.description,
    })),
  };
}

export const web_search: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'İnternette arama yapar (Tavily/Serper/Brave). Türkçe mevzuat, ürün araştırması, güncel fiyat, EMO/Bakanlık duyuruları gibi sistem dışı bilgi için kullan. Tarayıcıdan çalışır (CORS uyumlu).',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Arama sorgusu (Türkçe olabilir).' },
          maxResults: { type: 'number', description: 'Maks. sonuç (varsayılan 5, max 10).' },
        },
      },
    },
  },
  handler: async (args) => {
    const query = String(args.query || '').trim();
    if (!query) return { ok: false, error: 'Boş sorgu' };
    const max = Math.max(1, Math.min(10, Number(args.maxResults) || 5));
    const tav = getTavilyKey();
    const ser = getSerperKey();
    const bra = getBraveKey();
    try {
      if (tav) return { ok: true, ...(await tavilySearch(query, max, tav)) };
      if (ser) return { ok: true, ...(await serperSearch(query, max, ser)) };
      if (bra) return { ok: true, ...(await braveSearch(query, max, bra)) };
      return {
        ok: false,
        error:
          'Web arama anahtarı yapılandırılmamış. .env dosyasına şunlardan birini ekleyin: EXPO_PUBLIC_TAVILY_KEY (önerilir, https://tavily.com), EXPO_PUBLIC_SERPER_KEY (https://serper.dev), EXPO_PUBLIC_BRAVE_SEARCH_KEY (https://brave.com/search/api).',
      };
    } catch (e: any) {
      return { ok: false, error: 'Web arama başarısız: ' + (e?.message || String(e)) };
    }
  },
};

// ---------- fetch_url ----------

export const fetch_url: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'fetch_url',
      description:
        'Verilen URL\'in içeriğini temiz metin (markdown) olarak getirir. Jina Reader (r.jina.ai) proxy kullanır — anahtarsız çalışır, JS render edilmiş sayfalar dahil. Mevzuat/duyuru sayfası okumak için ideal.',
      parameters: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', description: 'Hedef URL (http:// veya https://).' },
          maxChars: { type: 'number', description: 'Döndürülecek maks. karakter (varsayılan 6000).' },
        },
      },
    },
  },
  handler: async (args) => {
    const url = String(args.url || '').trim();
    if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'Geçersiz URL (http/https olmalı)' };
    const maxChars = Math.max(500, Math.min(20000, Number(args.maxChars) || 6000));
    // Jina Reader: prefix ile çağrı yap, temiz markdown döner.
    const readerUrl = 'https://r.jina.ai/' + url;
    try {
      const r = await fetchWithTimeout(readerUrl, {
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
        timeoutMs: 25000,
      });
      if (!r.ok) throw new Error('Reader ' + r.status);
      const text = await r.text();
      return { ok: true, url, length: text.length, content: trim(text, maxChars), via: 'jina-reader' };
    } catch (e: any) {
      // Fallback: ham fetch (CORS engellenirse hata).
      try {
        const r2 = await fetchWithTimeout(url, { timeoutMs: 15000 });
        const text = await r2.text();
        return {
          ok: true,
          url,
          length: text.length,
          content: trim(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), maxChars),
          via: 'raw-fetch',
        };
      } catch (e2: any) {
        return { ok: false, error: 'URL indirilemedi: ' + (e2?.message || String(e2)) };
      }
    }
  },
};

// ---------- check_regulation_updates ----------
// Türkiye'deki sektörel mevzuat ve düzenleyici otorite kaynakları.
// Ajan kategoriye göre ilgili kaynağı seçer, fetch_url ile içeriği alır
// ve özetlemesi için döndürür.

const REGULATION_SOURCES: Record<string, { name: string; urls: { label: string; url: string }[] }> = {
  resmi_gazete: {
    name: 'T.C. Resmî Gazete',
    urls: [
      { label: 'Bugünkü Resmî Gazete', url: 'https://www.resmigazete.gov.tr/' },
      { label: 'Mevzuat aramaları', url: 'https://www.mevzuat.gov.tr/' },
    ],
  },
  emo: {
    name: 'Elektrik Mühendisleri Odası (EMO)',
    urls: [
      { label: 'EMO ana sayfa', url: 'https://www.emo.org.tr/' },
      { label: 'EMO mevzuat', url: 'https://www.emo.org.tr/mevzuat/' },
      { label: 'EMO duyurular', url: 'https://www.emo.org.tr/duyurular/' },
    ],
  },
  mmo: {
    name: 'Makina Mühendisleri Odası (MMO)',
    urls: [
      { label: 'MMO duyurular', url: 'https://www.mmo.org.tr/duyurular' },
      { label: 'MMO mevzuat', url: 'https://www.mmo.org.tr/mevzuat' },
    ],
  },
  etkb: {
    name: 'Enerji ve Tabii Kaynaklar Bakanlığı',
    urls: [
      { label: 'ETKB duyurular', url: 'https://enerji.gov.tr/duyurular' },
      { label: 'EPDK', url: 'https://www.epdk.gov.tr/Detay/Icerik/3-0-23/elektrikmevzuat' },
    ],
  },
  sanayi: {
    name: 'Sanayi ve Teknoloji Bakanlığı',
    urls: [
      { label: 'Sanayi Bakanlığı duyurular', url: 'https://www.sanayi.gov.tr/duyurular' },
    ],
  },
  csb: {
    name: 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı',
    urls: [
      { label: 'CSB duyurular', url: 'https://csb.gov.tr/duyurular' },
      { label: 'Yapı denetim mevzuatı', url: 'https://yapidenetim.csb.gov.tr/' },
    ],
  },
  tedas: {
    name: 'TEDAŞ (Türkiye Elektrik Dağıtım)',
    urls: [
      { label: 'TEDAŞ ana', url: 'https://www.tedas.gov.tr/' },
      { label: 'TEDAŞ birim fiyatları', url: 'https://www.tedas.gov.tr/sx.web.docs/tedas/docs/duyuru/' },
    ],
  },
  kik: {
    name: 'Kamu İhale Kurumu',
    urls: [
      { label: 'KİK mevzuat', url: 'https://www.kik.gov.tr/Mevzuat.aspx' },
      { label: 'KİK duyurular', url: 'https://ekap.kik.gov.tr/EKAP/Duyuru/Default.aspx' },
    ],
  },
};

export const list_regulation_sources: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'list_regulation_sources',
      description:
        'Takip edilebilen Türk düzenleyici otorite ve mevzuat kaynaklarının listesini döner. check_regulation_updates için "category" parametresi olarak kullanılacak anahtarları verir.',
      parameters: { type: 'object', properties: {} },
    },
  },
  handler: async () => ({
    categories: Object.entries(REGULATION_SOURCES).map(([k, v]) => ({
      key: k,
      name: v.name,
      sources: v.urls.length,
    })),
  }),
};

export const check_regulation_updates: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'check_regulation_updates',
      description:
        'Belirtilen kategorideki düzenleyici otoritenin güncel duyuru/mevzuat sayfalarını çeker (EMO, MMO, Resmî Gazete, ETKB, Sanayi Bakanlığı, CSB, TEDAŞ, KİK). Kategorileri "list_regulation_sources" ile öğrenebilirsin. İçeriği özetleyip add_suggestion ile kaydedebilirsin.',
      parameters: {
        type: 'object',
        required: ['category'],
        properties: {
          category: {
            type: 'string',
            description: 'Kaynak anahtarı: resmi_gazete | emo | mmo | etkb | sanayi | csb | tedas | kik',
          },
          maxSources: { type: 'number', description: 'Bu kategoriden kaç URL çekilsin (varsayılan 1, max 3).' },
          maxChars: { type: 'number', description: 'Her sayfadan maks. karakter (varsayılan 4000).' },
        },
      },
    },
  },
  handler: async (args) => {
    const key = String(args.category || '').toLowerCase();
    const src = REGULATION_SOURCES[key];
    if (!src) {
      return {
        ok: false,
        error: 'Bilinmeyen kategori: ' + key,
        available: Object.keys(REGULATION_SOURCES),
      };
    }
    const n = Math.max(1, Math.min(3, Number(args.maxSources) || 1));
    const maxChars = Math.max(500, Math.min(8000, Number(args.maxChars) || 4000));
    const picks = src.urls.slice(0, n);
    const out: any[] = [];
    for (const p of picks) {
      const res = await fetch_url.handler({ url: p.url, maxChars }, { app: null as any, confirm: async () => true, log: () => {} });
      out.push({ label: p.label, url: p.url, ...res });
    }
    return { ok: true, category: key, name: src.name, fetchedAt: new Date().toISOString(), sources: out };
  },
};

export const WEB_TOOLS = {
  web_search,
  fetch_url,
  list_regulation_sources,
  check_regulation_updates,
};

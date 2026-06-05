// apollo.ts — Apollo.io entegrasyonu: lead/firma arama + kişi/firma zenginleştirme.
// API anahtarı externalApiKeys (AsyncStorage) veya EXPO_PUBLIC_APOLLO_API_KEY'den gelir.
// Kullanım: CRM (müşteri zenginleştir / yeni lead bul) + AI ajan araçları.
//
// CORS: Tarayıcıda (RN-web) api.apollo.io'ya doğrudan istek CORS ile "Failed to
// fetch" verir. Bu yüzden web'de istek Supabase Edge Function (apollo-proxy)
// üzerinden sunucu tarafında iletilir. Mobil (native) doğrudan çağırır.
import { Platform } from 'react-native';
import { getExternalApiKeys } from './externalApiKeys';
import { supabase } from './supabase';

const BASE = 'https://api.apollo.io/api/v1';
const USE_PROXY = Platform.OS === 'web';
const PROXY_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/apollo-proxy`;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export interface ApolloPerson {
  id?: string;
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  organization?: string;
  domain?: string;
  location?: string;
}
export interface ApolloOrganization {
  id?: string;
  name?: string;
  domain?: string;
  website?: string;
  phone?: string;
  industry?: string;
  employees?: number;
  location?: string;
  linkedinUrl?: string;
}

async function apolloKey(): Promise<string | undefined> {
  try {
    const k = (await getExternalApiKeys()).apolloApiKey;
    return k && k.trim() ? k.trim() : undefined;
  } catch { return undefined; }
}
export async function isApolloConfigured(): Promise<boolean> {
  return !!(await apolloKey());
}

async function apolloFetch(path: string, method: 'GET' | 'POST', body?: any): Promise<any> {
  const key = await apolloKey();
  if (!key) throw new Error('Apollo API anahtarı tanımlı değil (Ayarlar → Harici API Anahtarları).');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    let res: Response;
    if (USE_PROXY && PROXY_URL.startsWith('http')) {
      // Web: CORS'u aşmak için Supabase Edge Function proxy üzerinden git.
      // verify_jwt açık kalır (güvenli) — giriş yapmış kullanıcının oturum
      // token'ı Bearer olarak gönderilir; yoksa publishable anahtara düşülür.
      let bearer = SUPABASE_ANON;
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) bearer = data.session.access_token;
      } catch { /* oturum yoksa anon */ }
      res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
          ...(SUPABASE_ANON ? { apikey: SUPABASE_ANON } : {}),
        },
        body: JSON.stringify({ path, method, body, apiKey: key }),
        signal: ctrl.signal,
      });
    } else {
      // Native: doğrudan Apollo (CORS yok).
      res = await fetch(`${BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Api-Key': key },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      const hint = USE_PROXY && res.status === 404
        ? ' (apollo-proxy fonksiyonu deploy edilmemiş olabilir: supabase functions deploy apollo-proxy)'
        : '';
      throw new Error(`Apollo HTTP ${res.status}: ${txt.slice(0, 160)}${hint}`);
    }
    return await res.json();
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Apollo isteği zaman aşımına uğradı.');
    if (/Failed to fetch|Network request failed/i.test(e?.message || '')) {
      throw new Error('Apollo bağlantısı kurulamadı. Web tarayıcıda CORS engeli olabilir — apollo-proxy fonksiyonunu deploy edin; mobil uygulamada doğrudan çalışır.');
    }
    throw e;
  } finally { clearTimeout(timer); }
}

const slimPerson = (p: any): ApolloPerson => ({
  id: p?.id,
  name: p?.name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || undefined,
  title: p?.title,
  email: p?.email,
  phone: p?.phone_numbers?.[0]?.sanitized_number || p?.organization?.phone || undefined,
  linkedinUrl: p?.linkedin_url,
  organization: p?.organization?.name || p?.organization_name,
  domain: p?.organization?.primary_domain || p?.organization?.website_url,
  location: [p?.city, p?.state, p?.country].filter(Boolean).join(', ') || undefined,
});
const slimOrg = (o: any): ApolloOrganization => ({
  id: o?.id,
  name: o?.name,
  domain: o?.primary_domain || o?.website_url,
  website: o?.website_url,
  phone: o?.phone || o?.sanitized_phone,
  industry: o?.industry,
  employees: o?.estimated_num_employees,
  location: [o?.city, o?.state, o?.country].filter(Boolean).join(', ') || undefined,
  linkedinUrl: o?.linkedin_url,
});

/** Kişi zenginleştir (e-posta/telefon bul). En az e-posta VEYA (ad + firma/domain) ver. */
export async function enrichPerson(input: {
  email?: string; firstName?: string; lastName?: string; name?: string; domain?: string; organizationName?: string;
}): Promise<ApolloPerson | null> {
  const body: any = {
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    name: input.name,
    domain: input.domain,
    organization_name: input.organizationName,
    reveal_personal_emails: false,
  };
  const json = await apolloFetch('/people/match', 'POST', body);
  return json?.person ? slimPerson(json.person) : null;
}

/** Firma zenginleştir (domain veya isimden). */
export async function enrichOrganization(input: { domain?: string; name?: string }): Promise<ApolloOrganization | null> {
  const params = new URLSearchParams();
  if (input.domain) params.set('domain', input.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
  if (input.name && !input.domain) params.set('organization_name', input.name);
  const json = await apolloFetch(`/organizations/enrich?${params.toString()}`, 'GET');
  return json?.organization ? slimOrg(json.organization) : null;
}

/** Lead (kişi) ara — unvan/lokasyon/anahtar kelime ile. */
export async function searchPeople(input: {
  keywords?: string; titles?: string[]; locations?: string[]; organizationDomains?: string[]; perPage?: number;
}): Promise<ApolloPerson[]> {
  const body: any = {
    q_keywords: input.keywords,
    person_titles: input.titles,
    person_locations: input.locations,
    q_organization_domains_list: input.organizationDomains,
    page: 1,
    per_page: Math.min(input.perPage ?? 10, 25),
  };
  const json = await apolloFetch('/mixed_people/search', 'POST', body);
  return Array.isArray(json?.people) ? json.people.map(slimPerson) : [];
}

/** Firma ara — isim/lokasyon/sektör ile. */
export async function searchOrganizations(input: {
  name?: string; locations?: string[]; keywords?: string; perPage?: number;
}): Promise<ApolloOrganization[]> {
  const body: any = {
    q_organization_name: input.name,
    organization_locations: input.locations,
    q_keywords: input.keywords,
    page: 1,
    per_page: Math.min(input.perPage ?? 10, 25),
  };
  const json = await apolloFetch('/mixed_companies/search', 'POST', body);
  const list = json?.organizations || json?.accounts || [];
  return Array.isArray(list) ? list.map(slimOrg) : [];
}

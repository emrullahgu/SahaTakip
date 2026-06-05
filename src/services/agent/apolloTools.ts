// apolloTools — AI ajan için Apollo.io araçları: lead/firma arama + zenginleştirme.
// Anahtar Ayarlar → Harici API Anahtarları'ndan (apolloApiKey) gelir; yoksa
// handler "yapılandırılmadı" hatası döner ve ajan zarifçe devam eder.
import type { ToolDef } from './tools';
import {
  enrichOrganization, enrichPerson, searchPeople, searchOrganizations, isApolloConfigured,
} from '../apollo';

const guard = async (): Promise<{ ok: false; error: string } | null> =>
  (await isApolloConfigured()) ? null : { ok: false, error: 'Apollo API anahtarı tanımlı değil (Ayarlar → Harici API Anahtarları → Apollo).' };

export const apollo_enrich_company: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'apollo_enrich_company',
      description: 'Apollo.io ile bir firmayı zenginleştirir: domain veya isimden sektör, çalışan sayısı, telefon, web, lokasyon, LinkedIn döner. Müşteri kaydını tamamlamak/araştırmak için.',
      parameters: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Firma web alan adı (ör. ornek.com.tr) — en güvenilir.' },
          name: { type: 'string', description: 'Firma adı (domain yoksa).' },
        },
      },
    },
  },
  handler: async (args) => {
    const g = await guard(); if (g) return g;
    try {
      const org = await enrichOrganization({ domain: args.domain, name: args.name });
      return org ? { ok: true, organization: org } : { ok: true, organization: null, note: 'Eşleşme bulunamadı.' };
    } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
  },
};

export const apollo_enrich_person: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'apollo_enrich_person',
      description: 'Apollo.io ile bir kişiyi zenginleştirir: e-posta veya (ad + firma/domain) verince iş e-postası, telefon, unvan, LinkedIn döner. İletişim bilgisi bulmak için.',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          name: { type: 'string', description: 'Ad Soyad (e-posta yoksa firma ile birlikte ver).' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          domain: { type: 'string', description: 'Çalıştığı firma domaini.' },
          organizationName: { type: 'string', description: 'Çalıştığı firma adı.' },
        },
      },
    },
  },
  handler: async (args) => {
    const g = await guard(); if (g) return g;
    try {
      const person = await enrichPerson(args);
      return person ? { ok: true, person } : { ok: true, person: null, note: 'Eşleşme bulunamadı.' };
    } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
  },
};

export const apollo_find_leads: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'apollo_find_leads',
      description: 'Apollo.io ile potansiyel müşteri (lead) kişiler arar: unvan, lokasyon, anahtar kelimeyle. Yeni iş/satış fırsatı bulmak için. (Sonuç max 25.)',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: 'Sektör/ürün anahtar kelimeleri (ör. "elektrik trafo").' },
          titles: { type: 'array', items: { type: 'string' }, description: 'Hedef unvanlar (ör. ["satın alma müdürü","tesis yöneticisi"]).' },
          locations: { type: 'array', items: { type: 'string' }, description: 'Lokasyonlar (ör. ["İzmir, Turkey"]).' },
          perPage: { type: 'number', description: 'Sonuç adedi (max 25).' },
        },
      },
    },
  },
  handler: async (args) => {
    const g = await guard(); if (g) return g;
    try {
      const people = await searchPeople(args);
      return { ok: true, count: people.length, leads: people };
    } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
  },
};

export const apollo_search_companies: ToolDef = {
  schema: {
    type: 'function',
    function: {
      name: 'apollo_search_companies',
      description: 'Apollo.io ile firma arar: isim/lokasyon/sektör anahtar kelimeyle. Hedef firma listesi çıkarmak için. (Sonuç max 25.)',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          keywords: { type: 'string', description: 'Sektör/anahtar kelime.' },
          locations: { type: 'array', items: { type: 'string' } },
          perPage: { type: 'number', description: 'Sonuç adedi (max 25).' },
        },
      },
    },
  },
  handler: async (args) => {
    const g = await guard(); if (g) return g;
    try {
      const orgs = await searchOrganizations(args);
      return { ok: true, count: orgs.length, companies: orgs };
    } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
  },
};

export const APOLLO_TOOLS: Record<string, ToolDef> = {
  apollo_enrich_company,
  apollo_enrich_person,
  apollo_find_leads,
  apollo_search_companies,
};

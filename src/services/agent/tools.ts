// services/agent/tools.ts
// ---------------------------------------------------------------
// Agent için tool registry. Her tool:
//  - schema: OpenAI tool-calling formatı (JSON Schema)
//  - destructive: true ise yürütmeden önce kullanıcıdan onay alınır
//  - handler: gerçek implementasyon (ctx üzerinden state'e dokunur)
//
// Tool'lar JSON-serileştirilebilir argüman alır ve serileştirilebilir
// sonuç döner (string/number/array/object). Model bunları okuyup bir
// sonraki adımına karar verir.
// ---------------------------------------------------------------

import type { ToolSchema } from '../ai';
import type { WorkOrder, Customer, Quote, QuoteLine, Employee, MaterialCatalogItem, QuoteStatus } from '../../types';
import type { AppContextType } from '../../context/AppContext';
import { calcQuoteTotals } from '../../context/AppContext';
import { MATERIAL_CATALOG } from '../../data/initialData';
import { POZ_CATALOG, type PozItem } from '../../data/pozCatalog';
import { suggestionStore, type SuggestionSeverity } from './suggestionStore';
import { WEB_TOOLS } from './webTools';
import { INTEGRATION_TOOLS } from './integrationStubs';
import { APOLLO_TOOLS } from './apolloTools';
import { newUuid } from '../data/repository';
// Sistem-farkındalığı read-tool'ları için servisler (gerçek veri — uydurma yok)
import { listVehicles, listVehicleAlerts } from '../vehicles';
import { lowStockAlerts, listBalances } from '../stock';
import { listPayments, computeCustomerBalances, listByCustomer } from '../payments';
import { listExpenses } from '../expenses';

export interface AgentContext {
  app: AppContextType;
  currentUserName?: string;
  /** Destructive işlemler için onay. true = devam et. */
  confirm: (toolName: string, args: any) => Promise<boolean>;
  /** Konsola adım yazmak için. */
  log: (line: string) => void;
}

export interface ToolDef {
  schema: ToolSchema;
  destructive?: boolean;
  handler: (args: any, ctx: AgentContext) => Promise<any>;
}

// ---------- helpers ----------
const TODAY = () => new Date().toISOString().slice(0, 10);
const NOW = () => new Date().toISOString();
const slim = <T extends Record<string, any>>(o: T, keys: (keyof T)[]) =>
  keys.reduce((a, k) => ((a as any)[k] = o[k], a), {} as Partial<T>);

const slimWO = (w: WorkOrder) =>
  slim(w, ['id', 'client', 'serviceName', 'status', 'date', 'plannedStart', 'plannedEnd', 'assignedTo', 'quoteAmount']);
const slimCust = (c: Customer) =>
  slim(c, ['id', 'shortName', 'title', 'phone', 'email', 'taxNumber', 'address', 'type']);
const slimQuote = (q: Quote) =>
  slim(q, ['id', 'number', 'customerName', 'title', 'status', 'date', 'grandTotal']);
const slimEmp = (e: Employee) =>
  slim(e, ['id', 'name', 'role', 'monthlyWage', 'dailyRate', 'daysWorked']);

// ---- POZ katalog eşleştirme (toplu teklif için TR anahtar-kelime skoru) ----
const TR_LC = (s: string) => s.toLocaleLowerCase('tr-TR');

// Geçerli teklif durumları (QuoteStatus ile birebir). Ajan yanlış etiket
// gönderirse normalizeQuoteStatus ile eşlenir; eşlenemezse reddedilir —
// böylece DB'ye geçersiz status yazılıp Teklifler ekranı çökmez.
const VALID_QUOTE_STATUSES: QuoteStatus[] = [
  'Taslak', 'Onay Bekliyor', 'Müşteriye Gönderildi', 'Kabul Edildi', 'Reddedildi', 'Faturalandırıldı',
];
const QUOTE_STATUS_SYNONYMS: Record<string, QuoteStatus> = {
  'gönderildi': 'Müşteriye Gönderildi',
  'gonderildi': 'Müşteriye Gönderildi',
  'müşteriye gönderildi': 'Müşteriye Gönderildi',
  'onaylandı': 'Kabul Edildi',
  'onaylandi': 'Kabul Edildi',
  'kabul': 'Kabul Edildi',
  'kabul edildi': 'Kabul Edildi',
  'onay bekliyor': 'Onay Bekliyor',
  'beklemede': 'Onay Bekliyor',
  'reddedildi': 'Reddedildi',
  'red': 'Reddedildi',
  'iptal': 'Reddedildi',
  'süresi doldu': 'Reddedildi',
  'taslak': 'Taslak',
  'faturalandırıldı': 'Faturalandırıldı',
  'faturalandirildi': 'Faturalandırıldı',
};
function normalizeQuoteStatus(raw: unknown): QuoteStatus | null {
  const s = String(raw ?? '').trim();
  if ((VALID_QUOTE_STATUSES as string[]).includes(s)) return s as QuoteStatus;
  return QUOTE_STATUS_SYNONYMS[TR_LC(s)] ?? null;
}
// Eşleştirmede sahte örtüşme yaratan jenerik/ticari dolgu kelimeleri — skorlamada
// yok sayılır. Yoksa "...sarf malzemesi dahil" gibi açıklamalar katalogtaki
// "Hırdavat ve Sarf Malzeme" kalemine yanlış eşleşip fiyatı patlatıyor.
const MATCH_STOPWORDS = new Set([
  've', 'ile', 'için', 'veya', 'vb', 'dahil', 'dahildir', 'adet', 'adedi', 'takım', 'set',
  'sarf', 'malzeme', 'malzemesi', 'malzemeleri', 'hırdavat', 'montaj', 'montajı', 'demontaj',
  'temini', 'temin', 'yapılması', 'yapılacak', 'edilmesi', 'konulması', 'kullanılacak',
  'tip', 'tipi', 'tipli', 'marka', 'mevcut', 'yeni', 'beton', 'mm', 'mm2', 'kapak',
  'olup', 'olan', 'arası', 'işler', 'tüm', 'bir', 'kabul', 'şartlarına', 'uygun',
]);

// Birim sınıfı — kg(ağırlık) ↔ adet(parça) gibi uyuşmazlık fiyatı 100x şişirir,
// bu yüzden eşleşme güveni düşürülür / manuel fiyata bırakılır.
type UnitClass = 'weight' | 'length' | 'area' | 'volume' | 'piece' | 'other';
function unitClass(u: string | undefined | null): UnitClass {
  const s = TR_LC(String(u ?? '').trim()).replace(/\.$/, '');
  if (!s) return 'other';
  if (['kg', 'kğ', 'ton', 'gr', 'gram'].includes(s)) return 'weight';
  if (['m', 'mt', 'metre', 'm.', 'km'].includes(s)) return 'length';
  if (['m2', 'm²', 'metrekare'].includes(s)) return 'area';
  if (['m3', 'm³', 'metreküp'].includes(s)) return 'volume';
  if (['ad', 'adet', 'ad.', 'tk', 'takım', 'set', 'çift', 'kalem'].includes(s)) return 'piece';
  return 'other';
}
function unitsConflict(a: string | undefined, b: string | undefined): boolean {
  const ca = unitClass(a), cb = unitClass(b);
  if (ca === 'other' || cb === 'other' || ca === cb) return false;
  // ağırlık/uzunluk/alan/hacim ↔ parça (ya da birbirleri) ölçüsel olarak uyumsuzdur
  return true;
}

function scorePozAgainst(query: string, p: PozItem): { score: number; hits: number } {
  const q = TR_LC(query);
  const all = q.split(/[\s,;:./()\[\]\-x×*]+/).filter(t => t.length >= 2);
  // Anlamlı (dolgu olmayan) token'lar — eşleşme yalnız bunlara dayanır
  const tokens = all.filter(t => !MATCH_STOPWORDS.has(t) && !/^\d+$/.test(t));
  if (!tokens.length) return { score: 0, hits: 0 };
  const hay = TR_LC(`${p.name} ${(p as any).description || ''} ${(p as any).category || ''} ${p.id}`);
  let hits = 0;
  for (const t of tokens) {
    if (hay.includes(t)) hits += 1;
    else if (t.length >= 5 && hay.includes(t.slice(0, 5))) hits += 0.5;
  }
  return { score: hits / tokens.length, hits };
}
function bestPozMatch(query: string): { item: PozItem; score: number; hits: number } | null {
  let best: { item: PozItem; score: number; hits: number } | null = null;
  for (const p of POZ_CATALOG) {
    const { score, hits } = scorePozAgainst(query, p);
    if (score > 0 && (!best || score > best.score)) best = { item: p, score, hits };
  }
  // En az 2 anlamlı token örtüşmesi VE %35 oran iste — tek jenerik kelimeyle eşleşmeyi engelle
  return best && best.hits >= 2 && best.score >= 0.35 ? best : null;
}

// =================================================================
// TOOL DEFINITIONS
// =================================================================
export const AGENT_TOOLS: Record<string, ToolDef> = {
  // ----- READ ONLY -----
  list_work_orders: {
    schema: {
      type: 'function',
      function: {
        name: 'list_work_orders',
        description: 'İş emirlerini filtreli olarak listele. Status: "Onay Bekliyor" | "Başladı" | "Tamamlandı" | "İptal". search: müşteri/hizmet/id metinde geçen.',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filtrelenecek durum (opsiyonel)' },
            search: { type: 'string', description: 'Arama metni (opsiyonel)' },
            limit: { type: 'number', description: 'Maks. sonuç (varsayılan 20)' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      const all = ctx.app.workOrders;
      let res = all;
      if (args.status) res = res.filter(w => w.status === args.status);
      if (args.search) {
        const q = String(args.search).toLocaleLowerCase('tr-TR');
        res = res.filter(w =>
          (w.client + ' ' + w.serviceName + ' ' + w.id).toLocaleLowerCase('tr-TR').includes(q),
        );
      }
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 20));
      return { total: res.length, items: res.slice(0, limit).map(slimWO) };
    },
  },

  list_customers: {
    schema: {
      type: 'function',
      function: {
        name: 'list_customers',
        description: 'Müşterileri ada/telefona göre ara.',
        parameters: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            limit: { type: 'number' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      let res = ctx.app.customers;
      if (args.search) {
        const q = String(args.search).toLocaleLowerCase('tr-TR');
        res = res.filter(c =>
          (c.shortName + ' ' + (c.title || '') + ' ' + (c.phone || '') + ' ' + (c.email || '')).toLocaleLowerCase('tr-TR').includes(q),
        );
      }
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 20));
      return { total: res.length, items: res.slice(0, limit).map(slimCust) };
    },
  },

  list_quotes: {
    schema: {
      type: 'function',
      function: {
        name: 'list_quotes',
        description: 'Teklifleri listele/ara.',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            search: { type: 'string' },
            limit: { type: 'number' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      let res = ctx.app.quotes;
      if (args.status) res = res.filter(q => q.status === args.status);
      if (args.search) {
        const q = String(args.search).toLocaleLowerCase('tr-TR');
        res = res.filter(qu =>
          (qu.number + ' ' + qu.customerName + ' ' + qu.title).toLocaleLowerCase('tr-TR').includes(q),
        );
      }
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 20));
      return { total: res.length, items: res.slice(0, limit).map(slimQuote) };
    },
  },

  list_employees: {
    schema: {
      type: 'function',
      function: {
        name: 'list_employees',
        description: 'Personel listesi.',
        parameters: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            search: { type: 'string' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      let res = ctx.app.employees;
      if (args.role) res = res.filter(e => e.role === args.role);
      if (args.search) {
        const q = String(args.search).toLocaleLowerCase('tr-TR');
        res = res.filter(e => (e.name + ' ' + e.role).toLocaleLowerCase('tr-TR').includes(q));
      }
      return { total: res.length, items: res.map(slimEmp) };
    },
  },

  search_products: {
    schema: {
      type: 'function',
      function: {
        name: 'search_products',
        description: 'Ürün kataloğunda ara (13bin+ ürün). Teklif satırı önermek için kullan.',
        parameters: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Aranacak metin (marka/model/açıklama)' },
            limit: { type: 'number', description: 'Maks. sonuç (varsayılan 10, max 30)' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      const q = String(args.query || '').toLocaleLowerCase('tr-TR').trim();
      if (!q) return { total: 0, items: [] };
      const limit = Math.max(1, Math.min(30, Number(args.limit) || 10));
      const all = MATERIAL_CATALOG;
      const hits: { item: MaterialCatalogItem; score: number }[] = [];
      for (const m of all) {
        const hay = (m.name + ' ' + (m.brand || '') + ' ' + (m.category || '') + ' ' + (m.code || '')).toLocaleLowerCase('tr-TR');
        if (hay.includes(q)) hits.push({ item: m, score: hay.indexOf(q) });
        if (hits.length > 200) break;
      }
      hits.sort((a, b) => a.score - b.score);
      return {
        total: hits.length,
        items: hits.slice(0, limit).map(h => ({
          code: h.item.code,
          name: h.item.name,
          brand: h.item.brand,
          category: h.item.category,
          price: h.item.price,
        })),
      };
    },
  },

  get_dashboard_summary: {
    schema: {
      type: 'function',
      function: {
        name: 'get_dashboard_summary',
        description: 'Bugünün özet metrikleri: bekleyen iş, açık teklif, aktif mesai, vade aşımı vb.',
        parameters: { type: 'object', properties: {} },
      },
    },
    handler: async (_args, ctx) => {
      const today = TODAY();
      const wo = ctx.app.workOrders;
      return {
        date: today,
        workOrders: {
          total: wo.length,
          pending: wo.filter(w => w.status === 'Onay Bekliyor').length,
          inProgress: wo.filter(w => w.status === 'Başladı').length,
          today: wo.filter(w => (w.plannedStart || w.date || '').slice(0, 10) === today).length,
        },
        quotes: {
          total: ctx.app.quotes.length,
          draft: ctx.app.quotes.filter(q => q.status === 'Taslak').length,
          sent: ctx.app.quotes.filter(q => q.status === 'Müşteriye Gönderildi').length,
          accepted: ctx.app.quotes.filter(q => q.status === 'Kabul Edildi').length,
        },
        customers: ctx.app.customers.length,
        employees: ctx.app.employees.length,
      };
    },
  },

  // ===== SİSTEM-FARKINDALIĞI READ-TOOL'LARI (gerçek veri; uydurma yok) =====
  get_fleet_status: {
    schema: {
      type: 'function',
      function: {
        name: 'get_fleet_status',
        description: 'Araç filosu durumu: araçlar (plaka, marka/model, sürücü, km, yakıt) ve yaklaşan muayene/sigorta uyarıları.',
        parameters: { type: 'object', properties: {} },
      },
    },
    handler: async () => {
      const [vehicles, alerts] = await Promise.all([listVehicles(), listVehicleAlerts(45)]);
      return {
        total: vehicles.length,
        vehicles: vehicles.slice(0, 60).map(v =>
          slim(v, ['id', 'plate', 'brand', 'model', 'driverName', 'kmTotal', 'fuelType', 'inspectionDueAt', 'insuranceDueAt'])),
        upcomingAlerts: alerts.slice(0, 40).map(a => ({
          plate: a.vehicle?.plate, kind: a.kind, dueAt: a.dueAt, daysLeft: a.daysLeft,
        })),
      };
    },
  },

  get_inventory_status: {
    schema: {
      type: 'function',
      function: {
        name: 'get_inventory_status',
        description: 'Stok durumu: düşük stok uyarıları (malzeme, mevcut miktar, eksik miktar) ve toplam bakiye kalem sayısı.',
        parameters: { type: 'object', properties: {} },
      },
    },
    handler: async () => {
      const [low, balances] = await Promise.all([lowStockAlerts(), listBalances()]);
      return {
        balanceRecords: balances.length,
        lowStockCount: low.length,
        lowStock: low.slice(0, 50).map(r => ({
          material: r.material?.name ?? r.material?.id, totalQty: r.totalQty, shortage: r.shortage, unit: (r.material as any)?.unit,
        })),
      };
    },
  },

  get_finance_summary: {
    schema: {
      type: 'function',
      function: {
        name: 'get_finance_summary',
        description: 'Finans özeti: toplam tahsilat, toplam masraf, net; en yüksek bakiyeli (borçlu) müşteriler.',
        parameters: { type: 'object', properties: {} },
      },
    },
    handler: async (_args, ctx) => {
      const [payments, expenses, balances] = await Promise.all([
        listPayments(),
        listExpenses(),
        computeCustomerBalances(ctx.app.customers, ctx.app.workOrders, ctx.app.quotes),
      ]);
      const collected = payments.filter(p => p.status === 'received')
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const expenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const debtors = balances
        .filter(b => (b.balance || 0) > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 15)
        .map(b => ({ customer: b.customerName, balance: b.balance, invoiced: b.totalInvoiced, received: b.totalReceived }));
      return {
        paymentsCount: payments.length,
        collected,
        expenseTotal,
        net: collected - expenseTotal,
        topDebtors: debtors,
      };
    },
  },

  get_work_order_detail: {
    schema: {
      type: 'function',
      function: {
        name: 'get_work_order_detail',
        description: 'Bir iş emrinin TÜM detayı: müşteri, hizmet, durum, atama, malzemeler, planlanan/gerçek süre, notlar.',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', description: 'İş emri id veya numarası' } },
        },
      },
    },
    handler: async (args, ctx) => {
      const id = String(args.id ?? '').trim();
      const w = ctx.app.workOrders.find(x => x.id === id || (x as any).number === id);
      if (!w) return { ok: false, error: `İş emri bulunamadı: ${id}` };
      return {
        ok: true,
        workOrder: slim(w, ['id', 'client', 'serviceName', 'status', 'priority', 'date',
          'plannedStart', 'plannedEnd', 'slaHours', 'assignedToName', 'assignmentStatus',
          'engineer', 'quoteAmount', 'laborCost', 'materialCost', 'actualLaborMinutes', 'notes']),
        materials: (w.materials ?? []).map((m: any) => ({ name: m.name, qty: m.qty, price: m.price })),
      };
    },
  },

  get_customer_detail: {
    schema: {
      type: 'function',
      function: {
        name: 'get_customer_detail',
        description: 'Müşteri 360: bilgiler + teklifleri + iş emirleri + tahsilatları + güncel bakiye.',
        parameters: {
          type: 'object',
          required: ['customerId'],
          properties: { customerId: { type: 'string', description: 'Müşteri id (veya kısa ad)' } },
        },
      },
    },
    handler: async (args, ctx) => {
      const key = String(args.customerId ?? '').trim();
      const c = ctx.app.customers.find(x => x.id === key || x.shortName === key || x.title === key);
      if (!c) return { ok: false, error: `Müşteri bulunamadı: ${key}` };
      const quotes = ctx.app.quotes.filter(q => q.customerName === c.shortName || q.customerTitle === c.title);
      const wos = ctx.app.workOrders.filter(w => w.client === c.shortName || w.client === c.title);
      let payments: any[] = [];
      try { payments = await listByCustomer(c.id); } catch { /* offline */ }
      const collected = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      return {
        ok: true,
        customer: slimCust(c),
        quotes: quotes.slice(0, 30).map(slimQuote),
        workOrders: wos.slice(0, 30).map(slimWO),
        payments: payments.slice(0, 30).map(p => ({ amount: p.amount, method: p.method, status: p.status, receivedAt: p.receivedAt, receiptNo: p.receiptNo })),
        totalCollected: collected,
      };
    },
  },

  // ----- WRITE OPS -----
  create_customer: {
    schema: {
      type: 'function',
      function: {
        name: 'create_customer',
        description: 'Yeni müşteri kaydı oluşturur.',
        parameters: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            address: { type: 'string' },
            taxNumber: { type: 'string' },
            segment: { type: 'string' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      const id = newUuid(); // UUID → DB'ye kalıcı yazılır (önceden 'CUST-...' yereldeydi)
      const customer: Customer = {
        id,
        name: String(args.name),
        phone: args.phone || '',
        email: args.email || '',
        address: args.address || '',
        taxNumber: args.taxNumber || '',
        segment: args.segment || 'Standart',
        createdAt: NOW(),
      } as any;
      ctx.app.addCustomer(customer);
      return { ok: true, id, message: 'Müşteri oluşturuldu' };
    },
  },

  update_work_order_status: {
    schema: {
      type: 'function',
      function: {
        name: 'update_work_order_status',
        description: 'İş emrinin durumunu değiştirir. Status: "Onay Bekliyor"|"Başladı"|"Tamamlandı"|"İptal".',
        parameters: {
          type: 'object',
          required: ['id', 'status'],
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      const ok = ctx.app.updateWorkOrderStatus(String(args.id), args.status);
      return { ok, message: ok ? 'Durum güncellendi' : 'Güncelleme reddedildi (geçersiz geçiş veya kayıt yok)' };
    },
  },

  delete_work_order: {
    schema: {
      type: 'function',
      function: {
        name: 'delete_work_order',
        description: 'İş emrini siler. DESTRUCTIVE — onay gerekli.',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
    },
    destructive: true,
    handler: async (args, ctx) => {
      ctx.app.deleteWorkOrder(String(args.id));
      return { ok: true, message: 'İş emri silindi' };
    },
  },

  delete_customer: {
    schema: {
      type: 'function',
      function: {
        name: 'delete_customer',
        description: 'Müşteriyi siler. DESTRUCTIVE — onay gerekli.',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    destructive: true,
    handler: async (args, ctx) => {
      ctx.app.deleteCustomer(String(args.id));
      return { ok: true };
    },
  },

  // ----- SYSTEM HEALTH & SUGGESTIONS -----
  analyze_system_health: {
    schema: {
      type: 'function',
      function: {
        name: 'analyze_system_health',
        description:
          'Sistemi tarar: veri kalitesi, akıllı uyarılar, anomali, eksik bilgi, geciken işler. Sonuçları döner ama HENÜZ öneri olarak kaydetmez; onları add_suggestion ile sen ekleyeceksin.',
        parameters: { type: 'object', properties: {} },
      },
    },
    handler: async (_args, ctx) => {
      const findings: any[] = [];
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      // 1) Müşteri eksik telefon/email
      const custMissing = ctx.app.customers.filter(c => !c.phone && !c.email);
      if (custMissing.length)
        findings.push({
          kind: 'data_quality',
          severity: 'low',
          title: 'İletişim bilgisi eksik müşteriler',
          count: custMissing.length,
          examples: custMissing.slice(0, 5).map(c => ({ id: c.id, name: c.shortName })),
        });

      // 2) Açık iş emirleri — 7 günden eski "Onay Bekliyor"
      const stale = ctx.app.workOrders.filter(w => {
        if (w.status !== 'Onay Bekliyor') return false;
        const d = new Date(w.date || w.plannedStart || todayStr);
        return (today.getTime() - d.getTime()) / 86_400_000 > 7;
      });
      if (stale.length)
        findings.push({
          kind: 'workflow',
          severity: stale.length > 5 ? 'high' : 'medium',
          title: '7+ gündür onay bekleyen iş emirleri',
          count: stale.length,
          examples: stale.slice(0, 5).map(slimWO),
        });

      // 3) Tutarsız teklif: lines yok ama grandTotal > 0 (veya tersi)
      const inconsistent = ctx.app.quotes.filter(
        q => (!q.lines || q.lines.length === 0) && (q.grandTotal ?? 0) > 0,
      );
      if (inconsistent.length)
        findings.push({
          kind: 'data_quality',
          severity: 'medium',
          title: 'Kalemsiz ama tutarlı teklifler',
          count: inconsistent.length,
          examples: inconsistent.slice(0, 3).map(slimQuote),
        });

      // 4) 30+ gündür Taslak teklif
      const dustyDrafts = ctx.app.quotes.filter(q => {
        if (q.status !== 'Taslak') return false;
        const d = new Date(q.date);
        return (today.getTime() - d.getTime()) / 86_400_000 > 30;
      });
      if (dustyDrafts.length)
        findings.push({
          kind: 'business',
          severity: 'low',
          title: '30+ gündür taslak kalan teklifler',
          count: dustyDrafts.length,
          examples: dustyDrafts.slice(0, 5).map(slimQuote),
        });

      // 5) Aktif olmayan personele atanmış açık iş — attendance boşsa pasif kabul ediyoruz
      const inactiveIds = new Set(
        ctx.app.employees.filter(e => !e.attendance || Object.keys(e.attendance).length === 0).map(e => e.id),
      );
      const orphan = ctx.app.workOrders.filter(
        w => w.status !== 'Tamamlandı' && w.assignedTo && inactiveIds.has((w as any).assignedTo),
      );
      if (orphan.length)
        findings.push({
          kind: 'workflow',
          severity: 'high',
          title: 'Pasif personele atanmış açık iş emirleri',
          count: orphan.length,
          examples: orphan.slice(0, 5).map(slimWO),
        });

      return {
        totals: {
          workOrders: ctx.app.workOrders.length,
          quotes: ctx.app.quotes.length,
          customers: ctx.app.customers.length,
          employees: ctx.app.employees.length,
        },
        findings,
        hint: 'Her bulgu için add_suggestion ile detaylı öneri kaydı oluştur.',
      };
    },
  },

  add_suggestion: {
    schema: {
      type: 'function',
      function: {
        name: 'add_suggestion',
        description:
          'Sisteme bir öneri kaydı ekler (Öneriler ekranında görünür). Kullanıcı bunu inceleyip uygulayabilir veya reddedebilir.',
        parameters: {
          type: 'object',
          required: ['title', 'description', 'severity', 'category'],
          properties: {
            title: { type: 'string', description: 'Kısa başlık (max 80 karakter)' },
            description: { type: 'string', description: 'Detaylı açıklama' },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            category: {
              type: 'string',
              description: '"data_quality"|"workflow"|"security"|"performance"|"business" gibi',
            },
            suggestedAction: { type: 'string', description: 'Ne yapılmalı?' },
            evidence: { description: 'İlgili sayısal/örnek veri (opsiyonel)' },
          },
        },
      },
    },
    handler: async (args) => {
      const rec = await suggestionStore.add({
        title: String(args.title).slice(0, 200),
        description: String(args.description),
        severity: (args.severity as SuggestionSeverity) ?? 'medium',
        category: String(args.category ?? 'general'),
        suggestedAction: args.suggestedAction ? String(args.suggestedAction) : undefined,
        evidence: args.evidence,
      });
      return { ok: true, id: rec.id, message: 'Öneri kaydedildi' };
    },
  },

  list_suggestions: {
    schema: {
      type: 'function',
      function: {
        name: 'list_suggestions',
        description: 'Kayıtlı sistem önerilerini listeler.',
        parameters: {
          type: 'object',
          properties: {
            severity: { type: 'string' },
            limit: { type: 'number' },
          },
        },
      },
    },
    handler: async (args) => {
      let list = await suggestionStore.list();
      if (args.severity) list = list.filter(s => s.severity === args.severity);
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 20));
      return { total: list.length, items: list.slice(0, limit) };
    },
  },

  // ----- POZ + TEKLİF AKLI -----
  search_poz: {
    schema: {
      type: 'function',
      function: {
        name: 'search_poz',
        description:
          'POZ katalogunda ara. Teklif kalemleri (iş tanımları + birim fiyat + işçilik) bulmak için kullan. Kategoriye göre filtrelenebilir.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Aranacak metin (poz id / iş tanımı)' },
            category: {
              type: 'string',
              description: '"Malzeme"|"İşçilik"|"Servis"|"Mühendislik"|"Ulaşım"|"Diğer"',
            },
            limit: { type: 'number' },
          },
        },
      },
    },
    handler: async (args) => {
      let res: PozItem[] = POZ_CATALOG;
      if (args.category) res = res.filter(p => p.category === args.category);
      if (args.query) {
        const q = String(args.query).toLocaleLowerCase('tr-TR');
        res = res.filter(p =>
          (p.id + ' ' + p.name + ' ' + (p.description || '')).toLocaleLowerCase('tr-TR').includes(q),
        );
      }
      const limit = Math.max(1, Math.min(30, Number(args.limit) || 10));
      return {
        total: res.length,
        items: res.slice(0, limit).map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          materialPrice: p.materialPrice,
          installPrice: p.installPrice,
          dismantlePrice: p.dismantlePrice ?? 0,
        })),
      };
    },
  },

  get_quote_detail: {
    schema: {
      type: 'function',
      function: {
        name: 'get_quote_detail',
        description: 'Bir teklifin tüm satırlarını ve toplamlarını döner. Geçmiş benzer teklifleri incelemek için kullan.',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    handler: async (args, ctx) => {
      const q = ctx.app.quotes.find(x => x.id === args.id || x.number === args.id);
      if (!q) return { ok: false, error: 'Teklif bulunamadı' };
      return {
        id: q.id,
        number: q.number,
        title: q.title,
        customerName: q.customerName,
        date: q.date,
        status: q.status,
        subtotal: q.subtotal,
        vatTotal: q.vatTotal,
        grandTotal: q.grandTotal,
        lines: q.lines?.map(l => ({
          pozId: l.pozId,
          pozName: l.pozName,
          unit: l.unit,
          quantity: l.quantity,
          materialPrice: l.materialPrice,
          installPrice: l.installPrice,
          dismantlePrice: l.dismantlePrice,
          withDismantle: l.withDismantle,
          notes: l.notes,
        })),
      };
    },
  },

  find_similar_quotes: {
    schema: {
      type: 'function',
      function: {
        name: 'find_similar_quotes',
        description:
          'Geçmiş teklifler arasında verilen iş tanımına en benzer olanları bulur (başlık + müşteri + kalemler içinde arama yapar).',
        parameters: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Örn: "iç tesisat elektrik 130m2"' },
            limit: { type: 'number' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      const q = String(args.query || '').toLocaleLowerCase('tr-TR');
      if (!q) return { total: 0, items: [] };
      const limit = Math.max(1, Math.min(20, Number(args.limit) || 5));
      const tokens = q.split(/\s+/).filter(Boolean);
      const scored = ctx.app.quotes.map(qt => {
        const hay = (
          qt.title +
          ' ' +
          qt.customerName +
          ' ' +
          (qt.notes || '') +
          ' ' +
          (qt.lines || []).map(l => l.pozName + ' ' + l.pozId).join(' ')
        ).toLocaleLowerCase('tr-TR');
        const score = tokens.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
        return { qt, score };
      });
      scored.sort((a, b) => b.score - a.score);
      const hits = scored.filter(s => s.score > 0).slice(0, limit);
      return {
        total: hits.length,
        items: hits.map(h => ({
          id: h.qt.id,
          number: h.qt.number,
          title: h.qt.title,
          customerName: h.qt.customerName,
          date: h.qt.date,
          status: h.qt.status,
          lineCount: h.qt.lines?.length ?? 0,
          grandTotal: h.qt.grandTotal,
          matchScore: h.score,
        })),
      };
    },
  },

  match_poz_bulk: {
    schema: {
      type: 'function',
      function: {
        name: 'match_poz_bulk',
        description:
          'Fiyatsız malzeme/hizmet açıklamaları LİSTESİNİ tek seferde POZ kataloğuyla (1100+ kalem) eşleştirir; her biri için en uygun pozId + malzeme/montaj birim fiyatını döner. ÇOK KALEMLİ teklif hazırlarken (kullanıcı uzun bir liste verip "fiyatları sen bul" dediğinde) her kalemi search_poz ile tek tek aratmak yerine BUNU kullan — sonra create_quote_draft\'a doğrudan aktar.',
        parameters: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              description: 'Eşleştirilecek kalemler.',
              items: {
                type: 'object',
                required: ['description'],
                properties: {
                  description: { type: 'string', description: 'Malzeme/hizmet açıklaması (ör. "1000 kVA 34,5/0,4 kV hermetik yağlı trafo").' },
                  quantity: { type: 'number', description: 'Miktar (varsayılan 1).' },
                  unit: { type: 'string', description: 'Birim (Adet/Takım/m vb.).' },
                },
              },
            },
          },
        },
      },
    },
    handler: async (args) => {
      const items = Array.isArray(args.items) ? args.items : [];
      // Yalnız YÜKSEK güvenli (≥%50) ve birim-uyumlu eşleşmeleri otomatik fiyatla.
      // Aksi halde fiyat sessizce kataloga oturup yanlış olabilir (ör. kg miktarını
      // adet fiyatıyla çarpmak → milyonlarca TL şişme). Bunları "manuel fiyat gerekli"
      // olarak işaretle; ajan kullanıcıya sorar veya boş bırakır.
      const AUTO_PRICE_MIN = 0.5;
      let needsReview = 0;
      const out = items.map((it: any, i: number) => {
        const desc = String(it.description ?? '');
        const reqUnit = it.unit != null ? String(it.unit) : undefined;
        const m = bestPozMatch(desc);
        const conflict = m ? unitsConflict(reqUnit, m.item.unit) : false;
        const confident = !!m && m.score >= AUTO_PRICE_MIN && !conflict;
        if (!confident) needsReview += 1;
        return {
          line: i + 1,
          description: desc,
          quantity: Number(it.quantity ?? 1),
          unit: String(reqUnit ?? m?.item.unit ?? 'Adet'),
          // Sadece güvenli eşleşmeler fiyatlandırılır:
          matched: confident
            ? {
                pozId: m!.item.id,
                pozName: m!.item.name,
                materialPrice: m!.item.materialPrice,
                installPrice: m!.item.installPrice,
                confidence: Math.round(m!.score * 100),
              }
            : null,
          // Güvensiz/birim-uyumsuz en iyi tahmin (fiyatı OTOMATİK kullanma):
          suggestion: m && !confident
            ? {
                pozId: m.item.id,
                pozName: m.item.name,
                confidence: Math.round(m.score * 100),
                reason: conflict
                  ? `Birim uyuşmazlığı (istenen "${reqUnit}" ↔ katalog "${m.item.unit}") — fiyat güvenilmez`
                  : 'Düşük güven — manuel kontrol gerekir',
              }
            : null,
          needsManualPrice: !confident,
        };
      });
      const matched = items.length - needsReview;
      return {
        ok: true,
        total: items.length,
        matched,
        needsReview,
        items: out,
        hint:
          'matched!=null olanları create_quote_draft.lines içinde {pozId, quantity} olarak ver (fiyat katalogdan GÜVENİLİR dolar). ' +
          'needsManualPrice=true olanları {pozId:"MANUAL-n", pozName, quantity, unit} ile EKLE — fiyat verme, sistem 0 yazıp ' +
          '"fiyat girilmeli" işaretler (ASLA fiyat uydurma; suggestion fiyatı yanlış olabilir). create_quote_draft sonrası ' +
          'fiyatı 0 kalan kalemleri kullanıcıya AÇIKÇA listele ki kendisi girsin. Birim uyuşmazlığı (kg↔adet) olanları vurgula.',
      };
    },
  },

  create_quote_draft: {
    schema: {
      type: 'function',
      function: {
        name: 'create_quote_draft',
        description:
          'Bir teklif taslağı oluşturur. Birim fiyatlar YALNIZCA POZ kataloğundan alınır — ASLA fiyat uydurma. ' +
          'Katalogda olan kalem için {pozId, quantity} ver (fiyat otomatik dolar). Katalogda OLMAYAN kalem için ' +
          '{pozId:"MANUAL-n", pozName, quantity, unit} ver: fiyatı 0 yazılır ve "fiyat girilmeli" işaretlenir. ' +
          'Status="Taslak" olarak kaydedilir.',
        parameters: {
          type: 'object',
          required: ['customerName', 'title', 'lines'],
          properties: {
            customerName: { type: 'string' },
            title: { type: 'string' },
            engineer: { type: 'string' },
            notes: { type: 'string' },
            lines: {
              type: 'array',
              description: 'Teklif kalemleri. Fiyat alanı YOK — fiyat katalogdan gelir veya 0 kalır (uydurma yasak).',
              items: {
                type: 'object',
                required: ['pozId', 'quantity'],
                properties: {
                  pozId: { type: 'string', description: 'Katalogdaki POZ id (fiyat buradan); katalog dışıysa "MANUAL-n" (fiyat 0 kalır)' },
                  quantity: { type: 'number' },
                  withDismantle: { type: 'boolean' },
                  pozName: { type: 'string', description: 'Katalog dışı (MANUAL-*) kalemler için isim' },
                  unit: { type: 'string' },
                  discountPct: { type: 'number' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    destructive: true,
    handler: async (args, ctx) => {
      const inLines = Array.isArray(args.lines) ? args.lines : [];
      if (!inLines.length) return { ok: false, error: 'En az 1 kalem gerekli' };

      // FİYAT UYDURMA YASAK: birim fiyat YALNIZCA POZ kataloğundan gelir.
      // Katalogda olmayan (MANUAL-* veya bulunamayan) kalemde ajanın verdiği
      // materialPrice/installPrice YOK SAYILIR (0 yazılır) ve "fiyat girilmeli"
      // olarak işaretlenir. Böylece ajan teklife asla uydurma fiyat koyamaz.
      const manualPriceLines: { lineNo: number; pozName: string }[] = [];
      const lines: QuoteLine[] = inLines.map((l: any, i: number) => {
        const poz = POZ_CATALOG.find(p => p.id === l.pozId);
        const inCatalog = !!poz;
        const materialPrice = inCatalog ? Number(poz!.materialPrice ?? 0) : 0;
        const installPrice = inCatalog ? Number(poz!.installPrice ?? 0) : 0;
        const dismantlePrice = inCatalog ? Number(poz!.dismantlePrice ?? 0) : 0;
        const pozName = String(l.pozName ?? poz?.name ?? l.pozId);
        if (!inCatalog) manualPriceLines.push({ lineNo: i + 1, pozName });
        const baseNote = l.notes ? String(l.notes) : '';
        return {
          lineNo: i + 1,
          pozId: String(l.pozId),
          pozName,
          unit: String(l.unit ?? poz?.unit ?? 'Adet'),
          quantity: Number(l.quantity ?? 1),
          materialPrice,
          installPrice,
          dismantlePrice,
          withDismantle: Boolean(l.withDismantle),
          overheadPct: poz?.defaultOverhead ?? 10,
          profitPct: poz?.defaultProfit ?? 15,
          vatPct: poz?.vatRate ?? 20,
          discountPct: Number(l.discountPct ?? 0),
          notes: inCatalog
            ? (baseNote || undefined)
            : ('⚠ Birim fiyat girilmeli (katalogda yok)' + (baseNote ? ' · ' + baseNote : '')),
        };
      });

      const totals = calcQuoteTotals(lines);
      // Katalog dışı kalemler varsa teklif notuna uyarı düş (şeffaflık).
      const manualWarn = manualPriceLines.length
        ? `⚠ ${manualPriceLines.length} kalemin birim fiyatı katalogda yok ve 0 bırakıldı (uydurma yapılmadı). ` +
          `Lütfen şu kalemlerin fiyatını girin: ` +
          manualPriceLines.map(m => `#${m.lineNo} ${m.pozName}`).join('; ') + '.'
        : '';
      // id = UUID (DB primary key, uuid kolonu) → quotesRepo gerçekten DB'ye yazar.
      // Önceden id='QT-...' (UUID değil) olduğu için teklif yalnızca yerelde kalıyordu.
      const id = newUuid();
      const number = 'QT-' + new Date().getFullYear() + '-' + Date.now().toString(36).toUpperCase();
      const q: Quote = {
        id,
        number,
        customerName: String(args.customerName),
        title: String(args.title),
        date: new Date().toISOString().slice(0, 10),
        engineer: String(args.engineer ?? ctx.currentUserName ?? 'AI Ajan'),
        lines,
        status: 'Taslak',
        notes: [args.notes ? String(args.notes) : '', manualWarn].filter(Boolean).join('\n') || undefined,
        subtotal: totals.subtotal,
        vatTotal: totals.vatTotal,
        grandTotal: totals.grandTotal,
      };
      ctx.app.addQuote(q);
      return {
        ok: true,
        id,
        number,
        lineCount: lines.length,
        pricedFromCatalog: lines.length - manualPriceLines.length,
        manualPriceLines, // fiyatı 0 bırakılan (katalog dışı) kalemler — kullanıcıya bildir
        grandTotal: totals.grandTotal,
        message:
          'Taslak teklif oluşturuldu (fiyatlar yalnızca katalogdan, uydurma yok). ' +
          (manualPriceLines.length
            ? `DİKKAT: ${manualPriceLines.length} kalemin fiyatı katalogda yok, 0 bırakıldı — bunları kullanıcıya AÇIKÇA listele ve fiyatlarını girmesini iste.`
            : 'Tüm kalemler kataloğdan fiyatlandı.'),
      };
    },
  },

  // ----- UTIL -----
  think: {
    schema: {
      type: 'function',
      function: {
        name: 'think',
        description: 'Sesli düşünme. Sadece konsola not bırakır, state\'i değiştirmez. Plan yaparken kullan.',
        parameters: {
          type: 'object',
          required: ['note'],
          properties: { note: { type: 'string' } },
        },
      },
    },
    handler: async (args, ctx) => {
      ctx.log('💭 ' + String(args.note || ''));
      return { ok: true };
    },
  },

  finish: {
    schema: {
      type: 'function',
      function: {
        name: 'finish',
        description: 'Görev tamamlandı. Özet yaz ve durdur.',
        parameters: {
          type: 'object',
          required: ['summary'],
          properties: { summary: { type: 'string' } },
        },
      },
    },
    handler: async (args) => ({ ok: true, summary: String(args.summary || '') }),
  },

  // ----- QUOTE NOTES / DESCRIPTION (autofill) -----
  update_quote_notes: {
    schema: {
      type: 'function',
      function: {
        name: 'update_quote_notes',
        description:
          'Bir teklifin "notes" alanını günceller. Teklif açıklamasını otomatik dolduruken kullan (kapsam, varsayımlar, hariç tutulanlar, garanti süresi, ödeme koşulu, teslim süresi vb.). Mevcut notları "append" ile sona ekleyebilir veya tamamen yeniden yazabilirsin.',
        parameters: {
          type: 'object',
          required: ['id', 'notes'],
          properties: {
            id: { type: 'string', description: 'Teklif id.' },
            notes: { type: 'string', description: 'Yeni notes içeriği (Türkçe, çok satırlı destekli).' },
            mode: { type: 'string', description: '"replace" (varsayılan) veya "append".' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      const id = String(args.id);
      const q = ctx.app.quotes.find(x => x.id === id);
      if (!q) return { ok: false, error: 'Teklif bulunamadı: ' + id };
      const incoming = String(args.notes || '');
      const mode = String(args.mode || 'replace');
      const next = mode === 'append' && q.notes ? q.notes + '\n\n' + incoming : incoming;
      ctx.app.updateQuote({ ...q, notes: next });
      return { ok: true, id, mode, length: next.length, message: 'Teklif notu güncellendi.' };
    },
  },

  update_quote_line_notes: {
    schema: {
      type: 'function',
      function: {
        name: 'update_quote_line_notes',
        description:
          'Belirli bir teklif kaleminin "notes" alanını günceller. Tek tek kalemleri açıklamak için kullan (örn "TS-EN 60898 standardına uygun B tipi otomat").',
        parameters: {
          type: 'object',
          required: ['quoteId', 'lineIndex', 'notes'],
          properties: {
            quoteId: { type: 'string' },
            lineIndex: { type: 'number', description: '0-tabanlı kalem indeksi.' },
            notes: { type: 'string' },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      const q = ctx.app.quotes.find(x => x.id === String(args.quoteId));
      if (!q) return { ok: false, error: 'Teklif bulunamadı' };
      const idx = Number(args.lineIndex);
      if (idx < 0 || idx >= (q.lines?.length || 0)) return { ok: false, error: 'Geçersiz satır indeksi' };
      const lines = q.lines.map((l, i) => (i === idx ? { ...l, notes: String(args.notes) } : l));
      ctx.app.updateQuote({ ...q, lines });
      return { ok: true, message: 'Kalem notu güncellendi.' };
    },
  },

  set_quote_status: {
    schema: {
      type: 'function',
      function: {
        name: 'set_quote_status',
        description:
          'Bir teklifin durumunu değiştirir. Status SADECE şunlardan biri olabilir: ' +
          '"Taslak" | "Onay Bekliyor" | "Müşteriye Gönderildi" | "Kabul Edildi" | "Reddedildi" | "Faturalandırıldı".',
        parameters: {
          type: 'object',
          required: ['id', 'status'],
          properties: {
            id: { type: 'string' },
            status: {
              type: 'string',
              enum: VALID_QUOTE_STATUSES as unknown as string[],
            },
          },
        },
      },
    },
    handler: async (args, ctx) => {
      const status = normalizeQuoteStatus(args.status);
      if (!status) {
        return {
          ok: false,
          error: `Geçersiz durum: "${args.status}". Geçerli değerler: ${VALID_QUOTE_STATUSES.join(', ')}.`,
        };
      }
      ctx.app.setQuoteStatus(String(args.id), status);
      return { ok: true, message: `Teklif durumu güncellendi: ${status}` };
    },
  },

  // ----- WEB & INTEGRATION TOOLS (merged) -----
  ...WEB_TOOLS,
  ...INTEGRATION_TOOLS,
  ...APOLLO_TOOLS,
};

export function getAllToolSchemas(): ToolSchema[] {
  return Object.values(AGENT_TOOLS).map(t => t.schema);
}

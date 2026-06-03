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
import type { WorkOrder, Customer, Quote, QuoteLine, Employee, MaterialCatalogItem } from '../../types';
import type { AppContextType } from '../../context/AppContext';
import { calcQuoteTotals } from '../../context/AppContext';
import { MATERIAL_CATALOG } from '../../data/initialData';
import { POZ_CATALOG, type PozItem } from '../../data/pozCatalog';
import { suggestionStore, type SuggestionSeverity } from './suggestionStore';
import { WEB_TOOLS } from './webTools';
import { INTEGRATION_TOOLS } from './integrationStubs';
import { newUuid } from '../data/repository';

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

  create_quote_draft: {
    schema: {
      type: 'function',
      function: {
        name: 'create_quote_draft',
        description:
          'Bir teklif taslağı oluşturur. Lines için POZ id\'leri ile miktar ver; fiyatlar POZ katalogundan otomatik alınır. Status="Taslak" olarak kaydedilir.',
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
              description: 'Teklif kalemleri',
              items: {
                type: 'object',
                required: ['pozId', 'quantity'],
                properties: {
                  pozId: { type: 'string', description: 'POZ kataloğundaki id' },
                  quantity: { type: 'number' },
                  withDismantle: { type: 'boolean' },
                  // Override (opsiyonel)
                  pozName: { type: 'string' },
                  unit: { type: 'string' },
                  materialPrice: { type: 'number' },
                  installPrice: { type: 'number' },
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

      const lines: QuoteLine[] = inLines.map((l: any, i: number) => {
        const poz = POZ_CATALOG.find(p => p.id === l.pozId);
        const materialPrice = Number(l.materialPrice ?? poz?.materialPrice ?? 0);
        const installPrice = Number(l.installPrice ?? poz?.installPrice ?? 0);
        const dismantlePrice = Number(poz?.dismantlePrice ?? 0);
        return {
          lineNo: i + 1,
          pozId: String(l.pozId),
          pozName: String(l.pozName ?? poz?.name ?? l.pozId),
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
          notes: l.notes ? String(l.notes) : undefined,
        };
      });

      const totals = calcQuoteTotals(lines);
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
        notes: args.notes ? String(args.notes) : undefined,
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
        grandTotal: totals.grandTotal,
        message: 'Taslak teklif oluşturuldu. Teklifler ekranından açıp düzenleyebilirsiniz.',
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
          'Bir teklifin durumunu değiştirir. Status: "Taslak" | "Gönderildi" | "Onaylandı" | "Reddedildi" | "Süresi Doldu".',
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
      ctx.app.setQuoteStatus(String(args.id), args.status);
      return { ok: true, message: 'Teklif durumu güncellendi.' };
    },
  },

  // ----- WEB & INTEGRATION TOOLS (merged) -----
  ...WEB_TOOLS,
  ...INTEGRATION_TOOLS,
};

export function getAllToolSchemas(): ToolSchema[] {
  return Object.values(AGENT_TOOLS).map(t => t.schema);
}

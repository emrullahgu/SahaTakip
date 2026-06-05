// Faz 43 — Akıllı Teklif Servisi
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SurveyForm, SurveyItem, SurveyItemKind, PozLibraryItem, PriceListVersion,
  QuoteCalculation, HvTransformerQuoteInput, PeriodicCheckQuoteInput,
  SqGesQuoteInput, CompensationQuoteInput, QuoteRevisionDiff, QuoteOutcomeRecord,
  AiQuoteImprovementSuggestion, QuoteLostReason, QuoteOutcome,
} from '../types';

const K = {
  surveys: 'sq_surveys_v1',
  poz: 'sq_poz_v1',
  prices: 'sq_prices_v1',
  calcs: 'sq_calcs_v1',
  hv: 'sq_hv_v1',
  pc: 'sq_pc_v1',
  ges: 'sq_ges_v1',
  comp: 'sq_comp_v1',
  diffs: 'sq_diffs_v1',
  outcomes: 'sq_outcomes_v1',
  improve: 'sq_improve_v1',
};

export const KIND_LABEL: Record<SurveyItemKind, string> = { product: 'Ürün', cable: 'Kablo', panel: 'Pano', service: 'Hizmet', labor: 'İşçilik' };
export const KIND_ICON: Record<SurveyItemKind, string> = { product: 'cube', cable: 'git-branch', panel: 'apps', service: 'construct', labor: 'people' };
export const KIND_COLOR: Record<SurveyItemKind, string> = { product: '#0ea5e9', cable: '#f59e0b', panel: '#8b5cf6', service: '#22c55e', labor: '#06b6d4' };
export const LOST_REASON_LABEL: Record<QuoteLostReason, string> = { price: 'Fiyat', timing: 'Zamanlama', competitor: 'Rakip', scope: 'Kapsam', no_response: 'Yanıt yok', other: 'Diğer' };
export const OUTCOME_LABEL: Record<QuoteOutcome, string> = { won: 'Kazanıldı', lost: 'Kaybedildi', pending: 'Bekliyor' };
export const OUTCOME_COLOR: Record<QuoteOutcome, string> = { won: '#22c55e', lost: '#ef4444', pending: '#f59e0b' };

const get = async <T,>(k: string, fb: T): Promise<T> => { try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const set = async (k: string, v: unknown) => { try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

// === Surveys ===
async function seedSurveys(): Promise<SurveyForm[]> {
  return [];
}
export async function listSurveys(): Promise<SurveyForm[]> {
  const cur = await get<SurveyForm[] | null>(K.surveys, null);
  if (cur) return cur;
  const s = await seedSurveys(); await set(K.surveys, s); return s;
}
export async function getSurvey(id: string): Promise<SurveyForm | undefined> { return (await listSurveys()).find(s => s.id === id); }
export async function deleteSurvey(id: string): Promise<void> {
  const list = await listSurveys();
  await set(K.surveys, list.filter(s => s.id !== id));
}
export async function createSurvey(customerName: string, title: string): Promise<SurveyForm> {
  const list = await listSurveys();
  const item: SurveyForm = { id: uid('sv'), customerName, title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: [] };
  await set(K.surveys, [item, ...list]);
  return item;
}
export async function addSurveyItem(surveyId: string, item: Omit<SurveyItem, 'id'>): Promise<void> {
  const list = await listSurveys();
  const idx = list.findIndex(s => s.id === surveyId);
  if (idx < 0) return;
  list[idx].items = [...list[idx].items, { ...item, id: uid('si') }];
  list[idx].updatedAt = new Date().toISOString();
  await set(K.surveys, list);
}
export async function removeSurveyItem(surveyId: string, itemId: string): Promise<void> {
  const list = await listSurveys();
  const idx = list.findIndex(s => s.id === surveyId);
  if (idx < 0) return;
  list[idx].items = list[idx].items.filter(i => i.id !== itemId);
  list[idx].updatedAt = new Date().toISOString();
  await set(K.surveys, list);
}
export function surveyTotal(s: SurveyForm): number {
  return s.items.reduce((sum, it) => sum + it.qty * (it.unitPrice || 0), 0);
}
export async function generateQuoteItemsFromSurvey(surveyId: string): Promise<SurveyItem[]> {
  const s = await getSurvey(surveyId);
  return s ? s.items : [];
}

// === POZ Library ===
async function seedPoz(): Promise<PozLibraryItem[]> {
  return [];
}
export async function listPoz(): Promise<PozLibraryItem[]> {
  const cur = await get<PozLibraryItem[] | null>(K.poz, null);
  if (cur) return cur;
  const s = await seedPoz(); await set(K.poz, s); return s;
}
export async function togglePoz(id: string): Promise<void> {
  const list = await listPoz();
  await set(K.poz, list.map(p => p.id === id ? { ...p, active: !p.active } : p));
}

// === Price Lists ===
async function seedPrices(): Promise<PriceListVersion[]> {
  return [];
}
export async function listPriceVersions(): Promise<PriceListVersion[]> {
  const cur = await get<PriceListVersion[] | null>(K.prices, null);
  if (cur) return cur;
  const s = await seedPrices(); await set(K.prices, s); return s;
}
export async function setCurrentPriceVersion(id: string): Promise<void> {
  const list = await listPriceVersions();
  await set(K.prices, list.map(p => ({ ...p, isCurrent: p.id === id })));
}

// === Calculator ===
export function calculate(base: number, labor: number, material: number, overhead: number, risk: number, profit: number, discount: number, tax: number = 20): QuoteCalculation {
  const baseSum = base + labor + material;
  const withOverhead = baseSum * (1 + overhead / 100);
  const withRisk = withOverhead * (1 + risk / 100);
  const withProfit = withRisk * (1 + profit / 100);
  const afterDiscount = withProfit * (1 - discount / 100);
  const totalWithTax = afterDiscount * (1 + tax / 100);
  return {
    id: uid('calc'), baseAmount: base, laborCost: labor, materialCost: material,
    overheadRate: overhead, riskRate: risk, profitRate: profit, discountRate: discount, taxRate: tax,
    subTotal: Math.round(afterDiscount), totalWithTax: Math.round(totalWithTax),
    createdAt: new Date().toISOString(),
  };
}
export async function saveCalc(c: QuoteCalculation): Promise<void> {
  const list = await get<QuoteCalculation[]>(K.calcs, []);
  await set(K.calcs, [c, ...list].slice(0, 50));
}
export async function listCalcs(): Promise<QuoteCalculation[]> { return get<QuoteCalculation[]>(K.calcs, []); }

// === HV Transformer ===
export function calculateHvTransformer(customerName: string, kva: number, count: number, region: HvTransformerQuoteInput['region'], has24h7: boolean): HvTransformerQuoteInput {
  const baseMonthly = kva <= 400 ? 8000 : kva <= 1000 ? 12000 : kva <= 2000 ? 16000 : 22000;
  const regionMult = region === 'Marmara' || region === 'Ege' ? 1.2 : 1.0;
  const monthly = baseMonthly * count * regionMult * (has24h7 ? 1.35 : 1);
  return { id: uid('hv'), customerName, transformerKva: kva, count, region, has24h7, monthlyFee: Math.round(monthly), yearlyFee: Math.round(monthly * 12), createdAt: new Date().toISOString() };
}
export async function saveHv(item: HvTransformerQuoteInput): Promise<void> {
  const list = await get<HvTransformerQuoteInput[]>(K.hv, []);
  await set(K.hv, [item, ...list].slice(0, 50));
}
export async function listHv(): Promise<HvTransformerQuoteInput[]> { return get<HvTransformerQuoteInput[]>(K.hv, []); }

// === Periodic Check ===
export function calculatePeriodicCheck(customerName: string, panelCount: number, measurementCount: number, groundCount: number): PeriodicCheckQuoteInput {
  const base = 1500;
  const total = base + panelCount * 850 + measurementCount * 350 + groundCount * 250;
  return { id: uid('pc'), customerName, panelCount, measurementCount, groundCount, basePrice: base, totalPrice: total, createdAt: new Date().toISOString() };
}
export async function savePc(item: PeriodicCheckQuoteInput): Promise<void> {
  const list = await get<PeriodicCheckQuoteInput[]>(K.pc, []);
  await set(K.pc, [item, ...list].slice(0, 50));
}
export async function listPc(): Promise<PeriodicCheckQuoteInput[]> { return get<PeriodicCheckQuoteInput[]>(K.pc, []); }

// === GES ===
export function calculateGes(customerName: string, capacityKwp: number, pricePerKwp: number = 22000): SqGesQuoteInput {
  const total = capacityKwp * pricePerKwp;
  const days = Math.ceil(capacityKwp / 30);
  return { id: uid('ges'), customerName, capacityKwp, pricePerKwp, installationDays: days, totalPrice: total, createdAt: new Date().toISOString() };
}
export async function saveGes(item: SqGesQuoteInput): Promise<void> {
  const list = await get<SqGesQuoteInput[]>(K.ges, []);
  await set(K.ges, [item, ...list].slice(0, 50));
}
export async function listGes(): Promise<SqGesQuoteInput[]> { return get<SqGesQuoteInput[]>(K.ges, []); }

// === Compensation ===
export function calculateCompensation(customerName: string, kvar: number, pricePerKvar: number = 850): CompensationQuoteInput {
  const panelCount = Math.ceil(kvar / 100);
  const total = kvar * pricePerKvar + panelCount * 22000;
  return { id: uid('co'), customerName, reactivePowerKvar: kvar, pricePerKvar, panelCount, totalPrice: total, createdAt: new Date().toISOString() };
}
export async function saveComp(item: CompensationQuoteInput): Promise<void> {
  const list = await get<CompensationQuoteInput[]>(K.comp, []);
  await set(K.comp, [item, ...list].slice(0, 50));
}
export async function listComp(): Promise<CompensationQuoteInput[]> { return get<CompensationQuoteInput[]>(K.comp, []); }

// === Quote Revision Diffs ===
async function seedDiffs(): Promise<QuoteRevisionDiff[]> {
  return [];
}
export async function listDiffs(): Promise<QuoteRevisionDiff[]> {
  const cur = await get<QuoteRevisionDiff[] | null>(K.diffs, null);
  if (cur) return cur;
  const s = await seedDiffs(); await set(K.diffs, s); return s;
}

// === Outcomes ===
async function seedOutcomes(): Promise<QuoteOutcomeRecord[]> {
  return [];
}
export async function listOutcomes(): Promise<QuoteOutcomeRecord[]> {
  const cur = await get<QuoteOutcomeRecord[] | null>(K.outcomes, null);
  if (cur) return cur;
  const s = await seedOutcomes(); await set(K.outcomes, s); return s;
}
export async function setOutcome(id: string, outcome: QuoteOutcome, reason?: QuoteLostReason, notes?: string, competitorName?: string): Promise<void> {
  const list = await listOutcomes();
  await set(K.outcomes, list.map(o => o.id === id ? { ...o, outcome, reason, notes, competitorName, decidedAt: new Date().toISOString() } : o));
}
export async function outcomeStats(): Promise<{ won: number; lost: number; pending: number; winRate: number; lostByReason: Record<QuoteLostReason, number> }> {
  const list = await listOutcomes();
  const won = list.filter(o => o.outcome === 'won').length;
  const lost = list.filter(o => o.outcome === 'lost').length;
  const pending = list.filter(o => o.outcome === 'pending').length;
  const lostByReason: Record<QuoteLostReason, number> = { price: 0, timing: 0, competitor: 0, scope: 0, no_response: 0, other: 0 };
  list.forEach(o => { if (o.outcome === 'lost' && o.reason) lostByReason[o.reason]++; });
  return { won, lost, pending, winRate: won + lost === 0 ? 0 : Math.round(won / (won + lost) * 100), lostByReason };
}

// === AI Quote Improvements ===
async function seedImprove(): Promise<AiQuoteImprovementSuggestion[]> {
  return [];
}
export async function listImprovements(): Promise<AiQuoteImprovementSuggestion[]> {
  const cur = await get<AiQuoteImprovementSuggestion[] | null>(K.improve, null);
  if (cur) return cur;
  const s = await seedImprove(); await set(K.improve, s); return s;
}
export async function generateImprovement(customerName: string): Promise<AiQuoteImprovementSuggestion> {
  const list = await listImprovements();
  const cats: AiQuoteImprovementSuggestion['category'][] = ['price', 'scope', 'wording', 'discount', 'timing'];
  const cat = cats[Math.floor(Math.random() * cats.length)];
  const tips: Record<AiQuoteImprovementSuggestion['category'], string> = {
    price: 'Fiyat optimizasyonu: kâr marjını koruyarak %4-7 indirim önerilir.',
    scope: 'Kapsam modüler hale getirilebilir; opsiyonel ek hizmetler ayrılmalı.',
    wording: 'Teknik dilden uzaklaşıp müşteri faydası vurgulanmalı.',
    discount: 'Erken karar indirimi (%5) eklemek ivme yaratabilir.',
    timing: 'Müşterinin bütçe döngüsü dikkate alınarak teklif zamanlaması güncellenmeli.',
  };
  const item: AiQuoteImprovementSuggestion = { id: uid('im'), customerName, category: cat, suggestion: tips[cat], impactScore: 60 + Math.floor(Math.random() * 35), createdAt: new Date().toISOString() };
  await set(K.improve, [item, ...list].slice(0, 50));
  return item;
}

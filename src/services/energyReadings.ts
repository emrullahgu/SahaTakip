// energyReadings.ts — POZ-DEV-083, POZ-DEV-084
// Sayaç / Pano / Trafo / GES ölçüm kayıtları. Supabase + AsyncStorage cache.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnergyReading, EnergyReadingKind } from '../types';
import { supabase, SUPABASE_CONFIGURED } from './supabase';

const KEY = '@SahaTakip:energy_readings';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidOrNull(v?: string | null): string | null { return v && UUID_RE.test(v) ? v : null; }
function numOrUndef(v: any): number | undefined { return v == null ? undefined : Number(v); }

function fromRow(r: any, prev?: EnergyReading): EnergyReading {
  return {
    id: r.id,
    kind: r.kind,
    assetId: r.asset_id ?? undefined,
    assetName: prev?.assetName,
    customerId: r.customer_id ?? undefined,
    workOrderId: r.work_order_id ?? undefined,
    date: r.date,
    inspectorId: r.inspector_id ?? undefined,
    inspectorName: prev?.inspectorName,
    meterActiveKwh: numOrUndef(r.meter_active_kwh),
    meterReactiveKvarh: numOrUndef(r.meter_reactive_kvarh),
    meterDemandKw: numOrUndef(r.meter_demand_kw),
    panelVoltageL1: numOrUndef(r.panel_voltage_l1),
    panelVoltageL2: numOrUndef(r.panel_voltage_l2),
    panelVoltageL3: numOrUndef(r.panel_voltage_l3),
    panelCurrentL1: numOrUndef(r.panel_current_l1),
    panelCurrentL2: numOrUndef(r.panel_current_l2),
    panelCurrentL3: numOrUndef(r.panel_current_l3),
    panelPowerFactor: numOrUndef(r.panel_power_factor),
    panelTempC: numOrUndef(r.panel_temp_c),
    trafoOilTempC: numOrUndef(r.trafo_oil_temp_c),
    trafoWindingTempC: numOrUndef(r.trafo_winding_temp_c),
    trafoOilLevel: r.trafo_oil_level ?? undefined,
    trafoSilicaGel: r.trafo_silica_gel ?? undefined,
    trafoBuchholzOk: r.trafo_buchholz_ok ?? undefined,
    trafoGroundingOk: r.trafo_grounding_ok ?? undefined,
    gesDcVoltage: numOrUndef(r.ges_dc_voltage),
    gesAcVoltage: numOrUndef(r.ges_ac_voltage),
    gesPowerKw: numOrUndef(r.ges_power_kw),
    gesEnergyTotalKwh: numOrUndef(r.ges_energy_total_kwh),
    gesIrradiance: numOrUndef(r.ges_irradiance),
    gesPanelTempC: numOrUndef(r.ges_panel_temp_c),
    notes: r.notes ?? undefined,
    photos: prev?.photos,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
function toRow(e: EnergyReading): Record<string, any> {
  const row: Record<string, any> = {
    kind: e.kind,
    asset_id: uuidOrNull(e.assetId),
    customer_id: uuidOrNull(e.customerId),
    work_order_id: uuidOrNull(e.workOrderId),
    date: e.date,
    inspector_id: uuidOrNull(e.inspectorId),
    meter_active_kwh: e.meterActiveKwh ?? null,
    meter_reactive_kvarh: e.meterReactiveKvarh ?? null,
    meter_demand_kw: e.meterDemandKw ?? null,
    panel_voltage_l1: e.panelVoltageL1 ?? null,
    panel_voltage_l2: e.panelVoltageL2 ?? null,
    panel_voltage_l3: e.panelVoltageL3 ?? null,
    panel_current_l1: e.panelCurrentL1 ?? null,
    panel_current_l2: e.panelCurrentL2 ?? null,
    panel_current_l3: e.panelCurrentL3 ?? null,
    panel_power_factor: e.panelPowerFactor ?? null,
    panel_temp_c: e.panelTempC ?? null,
    trafo_oil_temp_c: e.trafoOilTempC ?? null,
    trafo_winding_temp_c: e.trafoWindingTempC ?? null,
    trafo_oil_level: e.trafoOilLevel ?? null,
    trafo_silica_gel: e.trafoSilicaGel ?? null,
    trafo_buchholz_ok: e.trafoBuchholzOk ?? null,
    trafo_grounding_ok: e.trafoGroundingOk ?? null,
    ges_dc_voltage: e.gesDcVoltage ?? null,
    ges_ac_voltage: e.gesAcVoltage ?? null,
    ges_power_kw: e.gesPowerKw ?? null,
    ges_energy_total_kwh: e.gesEnergyTotalKwh ?? null,
    ges_irradiance: e.gesIrradiance ?? null,
    ges_panel_temp_c: e.gesPanelTempC ?? null,
    notes: e.notes ?? null,
  };
  if (UUID_RE.test(e.id)) row.id = e.id;
  return row;
}

function rid(): string {
  return 'rd_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export async function listReadings(): Promise<EnergyReading[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('energy_readings')
        .select('*')
        .order('date', { ascending: false });
      if (!error && data) {
        const cacheRaw = await AsyncStorage.getItem(KEY);
        const cache: EnergyReading[] = cacheRaw ? JSON.parse(cacheRaw) : [];
        const cacheById = new Map(cache.map(c => [c.id, c]));
        const list = data.map((r: any) => fromRow(r, cacheById.get(r.id)));
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return list;
      }
    } catch { /* fallback */ }
  }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EnergyReading[]) : [];
  } catch {
    return [];
  }
}

export async function getReading(id: string): Promise<EnergyReading | undefined> {
  const all = await listReadings();
  return all.find(r => r.id === id);
}

export async function createReading(
  input: Omit<EnergyReading, 'id' | 'createdAt'>,
): Promise<EnergyReading> {
  let next: EnergyReading = {
    ...input,
    id: rid(),
    date: input.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('energy_readings')
        .insert(toRow(next))
        .select()
        .single();
      if (!error && data) next = fromRow(data, next);
    } catch { /* keep local */ }
  }
  const all = await listReadings();
  all.unshift(next);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export async function updateReading(
  id: string,
  patch: Partial<EnergyReading>,
): Promise<EnergyReading | undefined> {
  const all = await listReadings();
  const i = all.findIndex(r => r.id === id);
  if (i < 0) return undefined;
  let merged: EnergyReading = { ...all[i], ...patch, id: all[i].id };
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try {
      const { data, error } = await supabase
        .from('energy_readings')
        .update(toRow(merged))
        .eq('id', id)
        .select()
        .single();
      if (!error && data) merged = fromRow(data, merged);
    } catch { /* ignore */ }
  }
  all[i] = merged;
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return all[i];
}

export async function deleteReading(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('energy_readings').delete().eq('id', id); } catch { /* ignore */ }
  }
  const all = await listReadings();
  const next = all.filter(r => r.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function listByAsset(assetId: string): Promise<EnergyReading[]> {
  const all = await listReadings();
  return all.filter(r => r.assetId === assetId);
}

export const READING_KINDS: { value: EnergyReadingKind; label: string; icon: string }[] = [
  { value: 'meter', label: 'Sayaç Okuma', icon: 'speedometer-outline' },
  { value: 'panel', label: 'Pano Kontrol', icon: 'grid-outline' },
  { value: 'transformer', label: 'Trafo Bakım', icon: 'flash-outline' },
  { value: 'ges', label: 'GES Saha', icon: 'sunny-outline' },
];

export const READING_KIND_LABEL: Record<EnergyReadingKind, string> = {
  meter: 'Sayaç',
  panel: 'Pano',
  transformer: 'Trafo',
  ges: 'GES',
};

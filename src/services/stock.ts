// ====================================================================
// stock — POZ-DEV-055, 058, 059
// Stok bakiyeleri + hareket günlüğü + minimum stok uyarısı.
// AsyncStorage tabanlı. Hareket eklendiğinde bakiye otomatik güncellenir.
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StockBalance,
  StockMovement,
  StockMovementKind,
  Material,
} from '../types';
import { listMaterials } from './materials';

const BAL_KEY = '@SahaTakip:stock_balances';
const MOV_KEY = '@SahaTakip:stock_movements';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function nowISO() {
  return new Date().toISOString();
}

// ---------------- BALANCES ----------------

export async function listBalances(): Promise<StockBalance[]> {
  try {
    const raw = await AsyncStorage.getItem(BAL_KEY);
    return raw ? (JSON.parse(raw) as StockBalance[]) : [];
  } catch {
    return [];
  }
}

export async function saveBalances(list: StockBalance[]) {
  await AsyncStorage.setItem(BAL_KEY, JSON.stringify(list));
}

export async function getBalance(materialId: string, warehouseId: string): Promise<number> {
  const all = await listBalances();
  return all.find(b => b.materialId === materialId && b.warehouseId === warehouseId)?.qty ?? 0;
}

export async function listBalancesByWarehouse(warehouseId: string): Promise<StockBalance[]> {
  const all = await listBalances();
  return all.filter(b => b.warehouseId === warehouseId && b.qty !== 0);
}

export async function listBalancesByMaterial(materialId: string): Promise<StockBalance[]> {
  const all = await listBalances();
  return all.filter(b => b.materialId === materialId);
}

async function applyDelta(materialId: string, warehouseId: string, delta: number) {
  const all = await listBalances();
  const idx = all.findIndex(b => b.materialId === materialId && b.warehouseId === warehouseId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], qty: all[idx].qty + delta };
  } else {
    all.push({ materialId, warehouseId, qty: delta });
  }
  await saveBalances(all);
}

// ---------------- MOVEMENTS ----------------

export async function listMovements(): Promise<StockMovement[]> {
  try {
    const raw = await AsyncStorage.getItem(MOV_KEY);
    return raw ? (JSON.parse(raw) as StockMovement[]) : [];
  } catch {
    return [];
  }
}

export async function listMovementsByMaterial(materialId: string): Promise<StockMovement[]> {
  const all = await listMovements();
  return all.filter(m => m.materialId === materialId);
}

export async function listMovementsByWarehouse(warehouseId: string): Promise<StockMovement[]> {
  const all = await listMovements();
  return all.filter(m => m.fromWarehouseId === warehouseId || m.toWarehouseId === warehouseId);
}

export async function listMovementsByWorkOrder(workOrderId: string): Promise<StockMovement[]> {
  const all = await listMovements();
  return all.filter(m => m.workOrderId === workOrderId);
}

async function saveMovements(list: StockMovement[]) {
  await AsyncStorage.setItem(MOV_KEY, JSON.stringify(list));
}

export async function addMovement(input: {
  kind: StockMovementKind;
  materialId: string;
  materialName: string;
  materialUnit: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  qty: number;
  unitPrice?: number;
  workOrderId?: string;
  userId?: string;
  userName?: string;
  note?: string;
}): Promise<StockMovement> {
  const mov: StockMovement = { id: uid(), createdAt: nowISO(), ...input };

  // Bakiye etkisi:
  // giris        → +to
  // cikis        → -from
  // transfer     → -from, +to
  // is-emri      → -from (iş emrinde kullanılan)
  // sayim        → bakiyeyi farka eşitle (qty = yeni qty; from = depo)
  if (input.kind === 'giris' && input.toWarehouseId) {
    await applyDelta(input.materialId, input.toWarehouseId, input.qty);
  } else if (input.kind === 'cikis' && input.fromWarehouseId) {
    await applyDelta(input.materialId, input.fromWarehouseId, -input.qty);
  } else if (input.kind === 'transfer' && input.fromWarehouseId && input.toWarehouseId) {
    await applyDelta(input.materialId, input.fromWarehouseId, -input.qty);
    await applyDelta(input.materialId, input.toWarehouseId, input.qty);
  } else if (input.kind === 'is-emri' && input.fromWarehouseId) {
    await applyDelta(input.materialId, input.fromWarehouseId, -input.qty);
  } else if (input.kind === 'sayim' && input.fromWarehouseId) {
    const current = await getBalance(input.materialId, input.fromWarehouseId);
    await applyDelta(input.materialId, input.fromWarehouseId, input.qty - current);
  }

  const all = await listMovements();
  await saveMovements([mov, ...all]);
  return mov;
}

// ---------------- LOW STOCK ----------------

export interface LowStockRow {
  material: Material;
  totalQty: number;
  shortage: number; // minStock - totalQty
}

export async function lowStockAlerts(): Promise<LowStockRow[]> {
  const [mats, bals] = await Promise.all([listMaterials(), listBalances()]);
  const out: LowStockRow[] = [];
  for (const m of mats) {
    if (!m.minStock || m.minStock <= 0) continue;
    const totalQty = bals
      .filter(b => b.materialId === m.id)
      .reduce((s, b) => s + b.qty, 0);
    if (totalQty < m.minStock) {
      out.push({ material: m, totalQty, shortage: m.minStock - totalQty });
    }
  }
  return out.sort((a, b) => b.shortage - a.shortage);
}

export async function totalQtyOfMaterial(materialId: string): Promise<number> {
  const bals = await listBalancesByMaterial(materialId);
  return bals.reduce((s, b) => s + b.qty, 0);
}

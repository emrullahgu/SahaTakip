// ====================================================================
// expenses — masraf kalıcılığı (AsyncStorage + Supabase best-effort)
// Şema: public.expenses (id,date,category,description,amount,created_by,...)
// ====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { auditRepo } from './data/auditRepo';
import { enqueueSync, clearSyncOp } from './data/repository';

export interface Expense {
  id: string;
  type: string;        // category
  amount: number;
  date: string;        // YYYY-MM-DD
  description: string;
  status: 'Bekliyor' | 'Onaylandı';
  createdBy?: string | null;
}

const KEY = '@SahaTakip:expenses';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uid(): string {
  const hex = (n: number) => {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  };
  const variant = (8 + Math.floor(Math.random() * 4)).toString(16);
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}

function fromRow(r: any): Expense {
  return {
    id: r.id,
    type: r.category ?? 'Diğer',
    amount: Number(r.amount ?? 0),
    date: (r.date ?? '').slice(0, 10),
    description: r.description ?? '',
    status: 'Bekliyor',
    createdBy: r.created_by ?? null,
  };
}

function toRow(e: Expense): Record<string, any> {
  const row: Record<string, any> = {
    category: e.type,
    amount: e.amount,
    description: e.description ?? null,
    date: e.date,
  };
  if (UUID_RE.test(e.id)) row.id = e.id;
  if (e.createdBy) row.created_by = e.createdBy;
  return row;
}

async function getCache(): Promise<Expense[]> {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
async function setCache(list: Expense[]) {
  // Yerel yazım hatası GERÇEK veri kaybıdır (bulut da başarısızsa) — sessizce
  // yutma; en azından logla ki teşhis edilebilsin.
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list)); }
  catch (e: any) { console.warn('[expenses.setCache] yerel kayıt başarısız:', e?.message ?? e); }
}

export async function listExpenses(): Promise<Expense[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(fromRow);
        await setCache(list);
        return list;
      }
      if (error) console.warn('[expenses.list]', error.message);
    } catch (e: any) {
      console.warn('[expenses.list.exception]', e?.message ?? e);
    }
  }
  return getCache();
}

export async function addExpense(input: Omit<Expense, 'id' | 'status'> & Partial<Pick<Expense, 'status'>>): Promise<Expense> {
  // userId çek
  let createdBy: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    createdBy = data.user?.id ?? null;
  } catch {}
  const e: Expense = {
    id: uid(),
    type: input.type,
    amount: input.amount,
    date: input.date,
    description: input.description ?? '',
    status: input.status ?? 'Bekliyor',
    createdBy,
  };
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert(toRow(e))
        .select()
        .single();
      if (error) {
        // DB yazımı koptu → sessizce yerelde bırakma; sync kuyruğuna al ki yeniden
        // bağlanınca drenajda Supabase'e gitsin (önceden masraf kalıcı olarak yalnız
        // bu cihazda kalıp yöneticiye/diğer cihaza hiç ulaşmıyordu).
        console.warn('[expenses.insert]', error.message);
        await enqueueSync({ id: e.id, table: 'expenses', action: 'insert', payload: e }).catch(() => {});
      } else if (data) {
        const fromDb = fromRow(data);
        const all = await getCache();
        await setCache([fromDb, ...all]);
        if (createdBy) {
          void auditRepo.log(createdBy, {
            action: 'expense.create',
            tableName: 'expenses',
            refId: fromDb.id,
            meta: { category: fromDb.type, amount: fromDb.amount },
          });
        }
        return fromDb;
      }
    } catch (ex: any) {
      console.warn('[expenses.insert.exception]', ex?.message ?? ex);
      await enqueueSync({ id: e.id, table: 'expenses', action: 'insert', payload: e }).catch(() => {});
    }
  }
  const all = await getCache();
  await setCache([e, ...all]);
  if (createdBy) {
    void auditRepo.log(createdBy, {
      action: 'expense.create',
      tableName: 'expenses',
      refId: e.id,
      meta: { category: e.type, amount: e.amount, offline: !SUPABASE_CONFIGURED },
    });
  }
  return e;
}

export async function deleteExpense(id: string) {
  let createdBy: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    createdBy = data.user?.id ?? null;
  } catch {}
  if (SUPABASE_CONFIGURED && UUID_RE.test(id)) {
    try { await supabase.from('expenses').delete().eq('id', id); } catch {}
  }
  // Henüz drain edilmemiş bekleyen insert op'unu kuyruktan düşür: aksi halde silinen
  // masraf sonraki drain'de DB'ye yazılıp "zombi" olarak geri geliyordu (offline ekle→sil).
  await clearSyncOp(id).catch(() => {});
  const all = await getCache();
  await setCache(all.filter(x => x.id !== id));
  if (createdBy) {
    void auditRepo.log(createdBy, { action: 'expense.delete', tableName: 'expenses', refId: id });
  }
}

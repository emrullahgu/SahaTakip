// officeWorkspace.ts — Ofis Takip (Notion benzeri ofis çalışma alanı) veri katmanı.
// Üç varlık: Sayfa (blok editör + alt-sayfa ağacı), Pano (kanban), Toplantı notu.
// Kalıcılık deseni governance.ts ile aynı: Supabase birincil + AsyncStorage cache
// (offline/demo fallback). SUPABASE_CONFIGURED false ise yalnız yerel çalışır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from './supabase';
import { newUuid } from './data/repository';
import { localDateISO } from '../utils/date';
import type {
  OfficePage, OfficeBlock, OfficeBlockType,
  OfficeBoard, OfficeBoardColumn, OfficeBoardCard, OfficeCardPriority,
  OfficeMeeting, OfficeActionItem,
} from '../types';

const KEYS = {
  pages: 'office_pages_v1',
  boards: 'office_boards_v1',
  meetings: 'office_meetings_v1',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidOrNull = (v?: string | null): string | null => (v && UUID_RE.test(v) ? v : null);

async function loadList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}
async function saveList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

const now = () => new Date().toISOString();

// =============================================================
// BLOK yardımcıları (Notion benzeri editör)
// =============================================================
export const BLOCK_LABEL: Record<OfficeBlockType, string> = {
  heading1: 'Başlık 1', heading2: 'Başlık 2', heading3: 'Başlık 3',
  text: 'Metin', todo: 'Yapılacak', bullet: 'Madde', numbered: 'Numaralı',
  divider: 'Ayraç', callout: 'Vurgu', quote: 'Alıntı', code: 'Kod',
};
export const BLOCK_ICON: Record<OfficeBlockType, string> = {
  heading1: 'text-outline', heading2: 'text-outline', heading3: 'text-outline',
  text: 'reorder-four-outline', todo: 'checkbox-outline', bullet: 'ellipse-outline',
  numbered: 'list-outline', divider: 'remove-outline', callout: 'bulb-outline',
  quote: 'chatbox-ellipses-outline', code: 'code-slash-outline',
};
export const BLOCK_MENU: OfficeBlockType[] = [
  'text', 'heading1', 'heading2', 'heading3', 'todo', 'bullet', 'numbered', 'callout', 'quote', 'code', 'divider',
];

export function newBlock(type: OfficeBlockType = 'text', text = ''): OfficeBlock {
  return { id: newUuid(), type, text, ...(type === 'todo' ? { checked: false } : {}) };
}

// =============================================================
// SAYFALAR
// =============================================================
function pageToRow(p: OfficePage) {
  return {
    id: p.id,
    parent_id: uuidOrNull(p.parentId),
    title: p.title,
    icon: p.icon,
    blocks: p.blocks,
    is_favorite: p.isFavorite,
    archived: p.archived,
    order_index: p.orderIndex,
    created_by: uuidOrNull(p.createdBy),
    created_by_name: p.createdByName ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt ?? p.createdAt,
  };
}
function pageFromRow(r: any): OfficePage {
  return {
    id: r.id,
    parentId: r.parent_id ?? null,
    title: r.title ?? '',
    icon: r.icon ?? '📄',
    blocks: Array.isArray(r.blocks) ? r.blocks : [],
    isFavorite: !!r.is_favorite,
    archived: !!r.archived,
    orderIndex: r.order_index ?? 0,
    createdBy: r.created_by ?? undefined,
    createdByName: r.created_by_name ?? undefined,
    createdAt: r.created_at ?? now(),
    updatedAt: r.updated_at ?? undefined,
  };
}

export async function listPages(): Promise<OfficePage[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('office_pages').select('*').order('order_index', { ascending: true });
      if (!error && data) {
        const list = data.map(pageFromRow);
        await saveList(KEYS.pages, list);
        return list;
      }
    } catch { /* offline fallback */ }
  }
  return loadList<OfficePage>(KEYS.pages);
}

/** Belirli ebeveynin (null = kök) arşivlenmemiş alt sayfaları, sıraya göre. */
export function childrenOf(all: OfficePage[], parentId: string | null): OfficePage[] {
  return all
    .filter(p => !p.archived && (p.parentId ?? null) === parentId)
    .sort((a, b) => a.orderIndex - b.orderIndex || a.createdAt.localeCompare(b.createdAt));
}

export async function getPage(id: string): Promise<OfficePage | undefined> {
  return (await listPages()).find(p => p.id === id);
}

export async function savePage(
  input: Partial<OfficePage> & { id?: string },
): Promise<OfficePage> {
  const list = await loadList<OfficePage>(KEYS.pages);
  let page: OfficePage;
  if (input.id) {
    const idx = list.findIndex(p => p.id === input.id);
    if (idx >= 0) {
      page = { ...list[idx], ...input, id: input.id, updatedAt: now() } as OfficePage;
      list[idx] = page;
    } else {
      page = normalizeNewPage(input);
      list.unshift(page);
    }
  } else {
    page = normalizeNewPage(input);
    list.unshift(page);
  }
  if (SUPABASE_CONFIGURED) {
    // DÜRÜSTLÜK: DB reddederse (RLS) fırlat — sahte "kaydedildi" gösterilmesin.
    const { data, error } = await supabase
      .from('office_pages').upsert(pageToRow(page)).select().single();
    if (error) throw new Error(`Sayfa kaydedilemedi: ${error.message}`);
    if (data) page = pageFromRow(data);
    const fresh = await loadList<OfficePage>(KEYS.pages);
    await saveList(KEYS.pages, [page, ...fresh.filter(p => p.id !== page.id)]);
    return page;
  }
  await saveList(KEYS.pages, list);
  return page;
}

function normalizeNewPage(input: Partial<OfficePage>): OfficePage {
  return {
    id: input.id || newUuid(),
    parentId: input.parentId ?? null,
    title: input.title ?? 'Adsız sayfa',
    icon: input.icon ?? '📄',
    blocks: input.blocks ?? [],
    isFavorite: input.isFavorite ?? false,
    archived: input.archived ?? false,
    orderIndex: input.orderIndex ?? Date.now(),
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: input.createdAt ?? now(),
    updatedAt: now(),
  };
}

/** Sayfayı ve TÜM alt ağacını siler (Supabase'te FK cascade; yerelde elle). */
export async function deletePage(id: string): Promise<void> {
  const list = await loadList<OfficePage>(KEYS.pages);
  const toDelete = new Set<string>();
  const collect = (pid: string) => {
    toDelete.add(pid);
    list.filter(p => p.parentId === pid).forEach(c => collect(c.id));
  };
  collect(id);
  if (SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('office_pages').delete().in('id', Array.from(toDelete));
    if (error) throw new Error(`Sayfa silinemedi: ${error.message}`);
  }
  await saveList(KEYS.pages, list.filter(p => !toDelete.has(p.id)));
}

export async function toggleFavorite(id: string): Promise<void> {
  const p = await getPage(id);
  if (!p) return;
  await savePage({ id, isFavorite: !p.isFavorite });
}

// =============================================================
// PANOLAR (Kanban)
// =============================================================
export const PRIORITY_LABEL: Record<OfficeCardPriority, string> = {
  low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil',
};
export const PRIORITY_COLOR: Record<OfficeCardPriority, string> = {
  low: '#64748b', normal: '#3b82f6', high: '#f59e0b', urgent: '#ef4444',
};

export function defaultColumns(): OfficeBoardColumn[] {
  return [
    { id: newUuid(), title: 'Yapılacak', color: '#64748b', cards: [] },
    { id: newUuid(), title: 'Devam Eden', color: '#3b82f6', cards: [] },
    { id: newUuid(), title: 'İncelemede', color: '#a855f7', cards: [] },
    { id: newUuid(), title: 'Tamamlandı', color: '#22c55e', cards: [] },
  ];
}

function boardToRow(b: OfficeBoard) {
  return {
    id: b.id,
    title: b.title,
    icon: b.icon,
    description: b.description ?? null,
    columns: b.columns,
    archived: b.archived,
    created_by: uuidOrNull(b.createdBy),
    created_by_name: b.createdByName ?? null,
    created_at: b.createdAt,
    updated_at: b.updatedAt ?? b.createdAt,
  };
}
function boardFromRow(r: any): OfficeBoard {
  return {
    id: r.id,
    title: r.title ?? '',
    icon: r.icon ?? '📋',
    description: r.description ?? undefined,
    columns: Array.isArray(r.columns) ? r.columns : [],
    archived: !!r.archived,
    createdBy: r.created_by ?? undefined,
    createdByName: r.created_by_name ?? undefined,
    createdAt: r.created_at ?? now(),
    updatedAt: r.updated_at ?? undefined,
  };
}

export async function listBoards(): Promise<OfficeBoard[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('office_boards').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const list = data.map(boardFromRow);
        await saveList(KEYS.boards, list);
        return list;
      }
    } catch { /* offline fallback */ }
  }
  return loadList<OfficeBoard>(KEYS.boards);
}

export async function getBoard(id: string): Promise<OfficeBoard | undefined> {
  return (await listBoards()).find(b => b.id === id);
}

export async function saveBoard(input: Partial<OfficeBoard> & { id?: string }): Promise<OfficeBoard> {
  const list = await loadList<OfficeBoard>(KEYS.boards);
  let board: OfficeBoard;
  const idx = input.id ? list.findIndex(b => b.id === input.id) : -1;
  if (idx >= 0) {
    board = { ...list[idx], ...input, id: input.id!, updatedAt: now() } as OfficeBoard;
    list[idx] = board;
  } else {
    board = {
      id: input.id || newUuid(),
      title: input.title ?? 'Adsız pano',
      icon: input.icon ?? '📋',
      description: input.description,
      columns: input.columns ?? defaultColumns(),
      archived: input.archived ?? false,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: input.createdAt ?? now(),
      updatedAt: now(),
    };
    list.unshift(board);
  }
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await supabase
      .from('office_boards').upsert(boardToRow(board)).select().single();
    if (error) throw new Error(`Pano kaydedilemedi: ${error.message}`);
    if (data) board = boardFromRow(data);
    const fresh = await loadList<OfficeBoard>(KEYS.boards);
    await saveList(KEYS.boards, [board, ...fresh.filter(b => b.id !== board.id)]);
    return board;
  }
  await saveList(KEYS.boards, list);
  return board;
}

export async function deleteBoard(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('office_boards').delete().eq('id', id);
    if (error) throw new Error(`Pano silinemedi: ${error.message}`);
  }
  const list = await loadList<OfficeBoard>(KEYS.boards);
  await saveList(KEYS.boards, list.filter(b => b.id !== id));
}

export function newCard(title: string): OfficeBoardCard {
  return { id: newUuid(), title, priority: 'normal' };
}

/** Kartı kolonlar arası taşır (yeni columns dizisi döndürür — saf). */
export function moveCard(
  columns: OfficeBoardColumn[], cardId: string, toColumnId: string,
): OfficeBoardColumn[] {
  let moving: OfficeBoardCard | undefined;
  const stripped = columns.map(col => {
    const found = col.cards.find(c => c.id === cardId);
    if (found) moving = found;
    return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
  });
  if (!moving) return columns;
  return stripped.map(col =>
    col.id === toColumnId ? { ...col, cards: [...col.cards, moving!] } : col,
  );
}

export function countCards(b: OfficeBoard): number {
  return b.columns.reduce((sum, c) => sum + c.cards.length, 0);
}

// =============================================================
// TOPLANTI NOTLARI
// =============================================================
function meetingToRow(m: OfficeMeeting) {
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    time: m.time ?? null,
    attendees: m.attendees,
    notes: m.notes,
    action_items: m.actionItems,
    created_by: uuidOrNull(m.createdBy),
    created_by_name: m.createdByName ?? null,
    created_at: m.createdAt,
    updated_at: m.updatedAt ?? m.createdAt,
  };
}
function meetingFromRow(r: any): OfficeMeeting {
  return {
    id: r.id,
    title: r.title ?? '',
    date: r.date ?? localDateISO(),
    time: r.time ?? undefined,
    attendees: Array.isArray(r.attendees) ? r.attendees : [],
    notes: r.notes ?? '',
    actionItems: Array.isArray(r.action_items) ? r.action_items : [],
    createdBy: r.created_by ?? undefined,
    createdByName: r.created_by_name ?? undefined,
    createdAt: r.created_at ?? now(),
    updatedAt: r.updated_at ?? undefined,
  };
}

export async function listMeetings(): Promise<OfficeMeeting[]> {
  if (SUPABASE_CONFIGURED) {
    try {
      const { data, error } = await supabase
        .from('office_meetings').select('*').order('date', { ascending: false });
      if (!error && data) {
        const list = data.map(meetingFromRow);
        await saveList(KEYS.meetings, list);
        return list;
      }
    } catch { /* offline fallback */ }
  }
  const list = await loadList<OfficeMeeting>(KEYS.meetings);
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function getMeeting(id: string): Promise<OfficeMeeting | undefined> {
  return (await listMeetings()).find(m => m.id === id);
}

export async function saveMeeting(input: Partial<OfficeMeeting> & { id?: string }): Promise<OfficeMeeting> {
  const list = await loadList<OfficeMeeting>(KEYS.meetings);
  let m: OfficeMeeting;
  const idx = input.id ? list.findIndex(x => x.id === input.id) : -1;
  if (idx >= 0) {
    m = { ...list[idx], ...input, id: input.id!, updatedAt: now() } as OfficeMeeting;
    list[idx] = m;
  } else {
    m = {
      id: input.id || newUuid(),
      title: input.title ?? 'Toplantı',
      date: input.date ?? localDateISO(),
      time: input.time,
      attendees: input.attendees ?? [],
      notes: input.notes ?? '',
      actionItems: input.actionItems ?? [],
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: input.createdAt ?? now(),
      updatedAt: now(),
    };
    list.unshift(m);
  }
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await supabase
      .from('office_meetings').upsert(meetingToRow(m)).select().single();
    if (error) throw new Error(`Toplantı kaydedilemedi: ${error.message}`);
    if (data) m = meetingFromRow(data);
    const fresh = await loadList<OfficeMeeting>(KEYS.meetings);
    await saveList(KEYS.meetings, [m, ...fresh.filter(x => x.id !== m.id)]);
    return m;
  }
  await saveList(KEYS.meetings, list);
  return m;
}

export async function deleteMeeting(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const { error } = await supabase.from('office_meetings').delete().eq('id', id);
    if (error) throw new Error(`Toplantı silinemedi: ${error.message}`);
  }
  const list = await loadList<OfficeMeeting>(KEYS.meetings);
  await saveList(KEYS.meetings, list.filter(m => m.id !== id));
}

export function newActionItem(text: string): OfficeActionItem {
  return { id: newUuid(), text, done: false };
}

export function openActionItems(meetings: OfficeMeeting[]): OfficeActionItem[] {
  return meetings.flatMap(m => m.actionItems.filter(a => !a.done));
}

// =============================================================
// ÖZET (Hub istatistikleri)
// =============================================================
export interface OfficeStats {
  pages: number;
  favorites: number;
  boards: number;
  openCards: number;
  meetings: number;
  openActions: number;
}

export async function officeStats(): Promise<OfficeStats> {
  const [pages, boards, meetings] = await Promise.all([listPages(), listBoards(), listMeetings()]);
  const active = pages.filter(p => !p.archived);
  return {
    pages: active.length,
    favorites: active.filter(p => p.isFavorite).length,
    boards: boards.filter(b => !b.archived).length,
    openCards: boards.reduce((s, b) => s + countCards(b), 0),
    meetings: meetings.length,
    openActions: openActionItems(meetings).length,
  };
}

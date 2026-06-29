// officeWorkspace — Ofis Takip (sayfa/pano/toplantı) offline akışı.
// Test ortamında SUPABASE_CONFIGURED=false → AsyncStorage yolu çalışır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listPages, savePage, getPage, deletePage, toggleFavorite, childrenOf, newBlock,
  listBoards, saveBoard, getBoard, deleteBoard, newCard, moveCard, countCards, defaultColumns,
  listMeetings, saveMeeting, getMeeting, deleteMeeting, newActionItem, openActionItems,
  officeStats, pagePlainText, PAGE_TEMPLATES, searchPages, descendantIds, movePage, reorderSibling,
  touchRecent, recentPageIds, orderByRecent, newLabel, newChecklistItem, checklistProgress, dueStatus,
} from '../officeWorkspace';
import { localDateISO } from '../../utils/date';

beforeEach(async () => { await AsyncStorage.clear(); });

describe('officeWorkspace — sayfalar', () => {
  test('savePage UUID id döner, listede görünür', async () => {
    const p = await savePage({ title: 'Prosedürler', icon: '📋' });
    expect(p.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
    expect(p.title).toBe('Prosedürler');
    const list = await listPages();
    expect(list.find(x => x.id === p.id)).toBeTruthy();
  });

  test('savePage mevcut sayfayı günceller (yeni kayıt oluşturmaz)', async () => {
    const p = await savePage({ title: 'A' });
    await savePage({ id: p.id, title: 'A güncel', blocks: [newBlock('text', 'satır')] });
    const got = await getPage(p.id);
    expect(got?.title).toBe('A güncel');
    expect(got?.blocks).toHaveLength(1);
    expect((await listPages()).length).toBe(1);
  });

  test('childrenOf iç içe ağacı ebeveyne göre verir, arşivliyi atlar', async () => {
    const root = await savePage({ title: 'Kök' });
    const child = await savePage({ title: 'Çocuk', parentId: root.id });
    await savePage({ title: 'Arşiv', parentId: root.id, archived: true });
    const all = await listPages();
    const kids = childrenOf(all, root.id);
    expect(kids.map(k => k.id)).toEqual([child.id]);
    expect(childrenOf(all, null).map(k => k.id)).toEqual([root.id]);
  });

  test('deletePage alt ağacı da siler (cascade)', async () => {
    const root = await savePage({ title: 'Kök' });
    const child = await savePage({ title: 'Çocuk', parentId: root.id });
    await savePage({ title: 'Torun', parentId: child.id });
    await deletePage(root.id);
    expect(await listPages()).toHaveLength(0);
  });

  test('toggleFavorite favori durumunu çevirir', async () => {
    const p = await savePage({ title: 'Fav' });
    expect(p.isFavorite).toBe(false);
    await toggleFavorite(p.id);
    expect((await getPage(p.id))?.isFavorite).toBe(true);
  });
});

describe('officeWorkspace — panolar', () => {
  test('saveBoard varsayılan 4 kolonla oluşur', async () => {
    const b = await saveBoard({ title: 'Q3' });
    expect(b.columns).toHaveLength(4);
    expect(countCards(b)).toBe(0);
  });

  test('moveCard kartı kolonlar arası taşır (saf)', () => {
    const cols = defaultColumns();
    const card = newCard('İş');
    cols[0].cards.push(card);
    const moved = moveCard(cols, card.id, cols[1].id);
    expect(moved[0].cards).toHaveLength(0);
    expect(moved[1].cards.map(c => c.id)).toContain(card.id);
  });

  test('deleteBoard panoyu kaldırır', async () => {
    const b = await saveBoard({ title: 'Sil' });
    await deleteBoard(b.id);
    expect(await getBoard(b.id)).toBeUndefined();
    expect(await listBoards()).toHaveLength(0);
  });
});

describe('officeWorkspace — toplantılar', () => {
  test('saveMeeting + openActionItems açık aksiyonları sayar', async () => {
    const m = await saveMeeting({
      title: 'Haftalık',
      attendees: ['Ali', 'Veli'],
      actionItems: [newActionItem('Teklif gönder'), { ...newActionItem('Rapor'), done: true }],
    });
    expect(m.id).toMatch(/^[0-9a-f]{8}-/i);
    const open = openActionItems(await listMeetings());
    expect(open).toHaveLength(1);
    expect(open[0].text).toBe('Teklif gönder');
  });

  test('deleteMeeting kaydı siler', async () => {
    const m = await saveMeeting({ title: 'X' });
    await deleteMeeting(m.id);
    expect(await getMeeting(m.id)).toBeUndefined();
  });
});

describe('officeWorkspace — Notion seviyesi yardımcılar', () => {
  test('savePage local-first: çağrı sonrası kayıt hep yerelde (DB yapılandırılmamış)', async () => {
    const p = await savePage({ title: 'Yerel', blocks: [newBlock('text', 'içerik')] });
    const got = await getPage(p.id);
    expect(got?.blocks[0].text).toBe('içerik');
  });

  test('PAGE_TEMPLATES her şablon blok üretir; toplantı şablonu todo içerir', () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    const meeting = PAGE_TEMPLATES.find(t => t.key === 'meeting')!;
    const blocks = meeting.build();
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.some(b => b.type === 'todo')).toBe(true);
    // her blok benzersiz id
    expect(new Set(blocks.map(b => b.id)).size).toBe(blocks.length);
  });

  test('searchPages başlık + blok içeriğinde aksan-duyarsız bulur, arşivliyi atlar', async () => {
    await savePage({ title: 'Şantiye Prosedürü', blocks: [newBlock('text', 'güvenlik ekipmanı')] });
    await savePage({ title: 'Eski', archived: true, blocks: [newBlock('text', 'güvenlik')] });
    const all = await listPages();
    expect(searchPages(all, 'santiye').length).toBe(1);        // aksan-duyarsız
    expect(searchPages(all, 'güvenlik').length).toBe(1);       // içerikte + arşivli hariç
    expect(searchPages(all, 'yokboyle').length).toBe(0);
    expect(searchPages(all, '').length).toBe(0);
  });

  test('descendantIds alt-ağacı toplar; movePage döngüye düşmeden taşır', async () => {
    const a = await savePage({ title: 'A' });
    const b = await savePage({ title: 'B', parentId: a.id });
    const c = await savePage({ title: 'C' });
    let all = await listPages();
    expect(descendantIds(all, a.id).has(b.id)).toBe(true);
    expect(descendantIds(all, a.id).has(c.id)).toBe(false);
    await movePage(c.id, a.id);
    all = await listPages();
    expect(childrenOf(all, a.id).map(p => p.id).sort()).toEqual([b.id, c.id].sort());
  });

  test('reorderSibling kardeş sırasını değiştirir', async () => {
    const x = await savePage({ title: 'X', orderIndex: 1 });
    const y = await savePage({ title: 'Y', orderIndex: 2 });
    let all = await listPages();
    expect(childrenOf(all, null).map(p => p.id)).toEqual([x.id, y.id]);
    await reorderSibling(all, y.id, -1);
    all = await listPages();
    expect(childrenOf(all, null).map(p => p.id)).toEqual([y.id, x.id]);
  });

  test('reorderSibling EŞİT orderIndex olsa bile çalışır (no-op değil)', async () => {
    // çakışan index + deterministik createdAt sıralaması (x önce)
    const x = await savePage({ title: 'X', orderIndex: 5, createdAt: '2026-01-01T00:00:00.000Z' });
    const y = await savePage({ title: 'Y', orderIndex: 5, createdAt: '2026-01-02T00:00:00.000Z' });
    let all = await listPages();
    expect(childrenOf(all, null).map(p => p.id)).toEqual([x.id, y.id]); // başlangıç [x,y]
    await reorderSibling(all, x.id, 1); // x'i aşağı al
    all = await listPages();
    expect(childrenOf(all, null).map(p => p.id)).toEqual([y.id, x.id]);
    // kesin artan, çakışmasız index üretildi
    const ox = (await getPage(x.id))!.orderIndex, oy = (await getPage(y.id))!.orderIndex;
    expect(ox).not.toBe(oy);
  });

  test('movePage döngü oluşturacak hedefi reddeder', async () => {
    const a = await savePage({ title: 'A' });
    const b = await savePage({ title: 'B', parentId: a.id });
    await expect(movePage(a.id, b.id)).rejects.toThrow();      // a, b'nin altına gidemez
    await expect(movePage(a.id, a.id)).rejects.toThrow();      // kendine gidemez
  });

  test('descendantIds döngülü veride sonsuz özyinelemeye düşmez', async () => {
    // bozuk veri: a<->b karşılıklı parent
    const a = await savePage({ title: 'A' });
    const b = await savePage({ title: 'B' });
    await savePage({ id: a.id, parentId: b.id });
    await savePage({ id: b.id, parentId: a.id });
    const all = await listPages();
    const ids = descendantIds(all, a.id); // çökmemeli
    expect(ids.has(a.id)).toBe(true);
    expect(ids.has(b.id)).toBe(true);
  });

  test('touchRecent + orderByRecent görüntüleme sırasını verir', async () => {
    const a = await savePage({ title: 'A' });
    const b = await savePage({ title: 'B' });
    await touchRecent(a.id);
    await touchRecent(b.id);   // en son b
    const ids = await recentPageIds();
    expect(ids[0]).toBe(b.id);
    const all = await listPages();
    expect(orderByRecent(all, ids, 5).map(p => p.id)).toEqual([b.id, a.id]);
  });

  test('checklistProgress done/total/pct hesaplar', () => {
    const card = { ...newCard('İş'), checklist: [newChecklistItem('a'), { ...newChecklistItem('b'), done: true }] };
    expect(checklistProgress(card)).toEqual({ done: 1, total: 2, pct: 50 });
    expect(checklistProgress(newCard('boş'))).toEqual({ done: 0, total: 0, pct: 0 });
  });

  test('newLabel renk atar; dueStatus gecikme/bugün/ileri ayırır', () => {
    expect(newLabel('Acil').color).toBeTruthy();
    expect(dueStatus(undefined)).toBe('none');
    expect(dueStatus('2000-01-01')).toBe('overdue');
    expect(dueStatus(localDateISO())).toBe('today');
    expect(dueStatus('2099-01-01')).toBe('future');
  });

  test('pagePlainText blok metinlerini birleştirir', async () => {
    const p = await savePage({ title: 'T', blocks: [newBlock('heading2', 'Başlık'), newBlock('text', 'gövde')] });
    expect(pagePlainText(p)).toBe('Başlık gövde');
  });
});

describe('officeWorkspace — özet', () => {
  test('officeStats aktif sayfa/pano/toplantı + açık aksiyonu toplar', async () => {
    await savePage({ title: 'S1', isFavorite: true });
    await savePage({ title: 'Arşiv', archived: true });
    const b = await saveBoard({ title: 'P1' });
    b.columns[0].cards.push(newCard('k1'));
    await saveBoard({ id: b.id, columns: b.columns });
    await saveMeeting({ title: 'T1', actionItems: [newActionItem('iş')] });

    const stats = await officeStats();
    expect(stats.pages).toBe(1);       // arşivli hariç
    expect(stats.favorites).toBe(1);
    expect(stats.boards).toBe(1);
    expect(stats.openCards).toBe(1);
    expect(stats.meetings).toBe(1);
    expect(stats.openActions).toBe(1);
  });
});

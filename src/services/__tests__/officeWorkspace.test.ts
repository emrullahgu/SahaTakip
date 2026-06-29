// officeWorkspace — Ofis Takip (sayfa/pano/toplantı) offline akışı.
// Test ortamında SUPABASE_CONFIGURED=false → AsyncStorage yolu çalışır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  listPages, savePage, getPage, deletePage, toggleFavorite, childrenOf, newBlock,
  listBoards, saveBoard, getBoard, deleteBoard, newCard, moveCard, countCards, defaultColumns,
  listMeetings, saveMeeting, getMeeting, deleteMeeting, newActionItem, openActionItems,
  officeStats,
} from '../officeWorkspace';

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

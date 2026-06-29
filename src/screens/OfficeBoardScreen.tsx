// OfficeBoardScreen — kanban pano (Notion-database benzeri). Mobil-öncelikli:
// tek-dokunuş kolon taşıma okları, satır-içi hızlı kart ekleme, kolon yönetimi
// (ad/renk/sil/sırala), etiket + kontrol listesi, termin gecikme vurgusu, snap kaydırma.
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, Pressable, Alert, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import {
  RootStackParamList, OfficeBoard, OfficeBoardCard, OfficeBoardColumn, OfficeCardPriority,
} from '../types';
import {
  getBoard, saveBoard, deleteBoard, newCard, moveCard, subscribeOffice,
  PRIORITY_LABEL, PRIORITY_COLOR, LABEL_COLORS, newLabel, newChecklistItem, checklistProgress,
  dueStatus, DUE_COLOR,
} from '../services/officeWorkspace';
import { newUuid } from '../services/data/repository';
import { localDateISO } from '../utils/date';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'OfficeBoard'>;
const HS = { top: 8, bottom: 8, left: 8, right: 8 };
const PRIORITIES: OfficeCardPriority[] = ['low', 'normal', 'high', 'urgent'];
const COLUMN_COLORS = ['#64748b', '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];
const DUE_LABEL: Record<string, string> = { overdue: 'Gecikti', today: 'Bugün', soon: 'Yakında', future: '', none: '' };

export default function OfficeBoardScreen() {
  const route = useRoute<Rt>();
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const colW = Math.max(260, Math.min(320, Math.round(width * 0.82)));
  const boardId = route.params?.boardId;

  const [board, setBoard] = useState<OfficeBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ columnId: string; cardId: string } | null>(null);
  const [colMenu, setColMenu] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [remoteChanged, setRemoteChanged] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const load = useCallback(async () => {
    if (!boardId) { setLoading(false); return; }
    setBoard((await getBoard(boardId)) ?? null);
    setLoading(false);
  }, [boardId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useFocusEffect(useCallback(() => {
    const off = subscribeOffice('office_boards', () => { if (dirtyRef.current) setRemoteChanged(true); else load(); });
    return off;
  }, [load]));

  const persist = (next: OfficeBoard, debounced = false) => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = () => saveBoard({ id: next.id, title: next.title, icon: next.icon, description: next.description, columns: next.columns })
      .then(() => { dirtyRef.current = false; }).catch(() => {});
    if (debounced) saveTimer.current = setTimeout(run, 600); else run();
  };
  const update = (mut: (b: OfficeBoard) => OfficeBoard, debounced = false) =>
    setBoard(prev => { if (!prev) return prev; const next = mut(prev); persist(next, debounced); return next; });

  const setColumns = (columns: OfficeBoardColumn[], debounced = false) => update(b => ({ ...b, columns }), debounced);

  const addCard = (columnId: string, title: string) => {
    const t = title.trim(); if (!t) return;
    update(b => ({ ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, cards: [...c.cards, newCard(t)] } : c) }), false);
  };
  const saveCard = (columnId: string, card: OfficeBoardCard) =>
    update(b => ({ ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, cards: c.cards.map(k => k.id === card.id ? card : k) } : c) }), false);
  const deleteCard = (columnId: string, cardId: string) => {
    update(b => ({ ...b, columns: b.columns.map(c => c.id === columnId ? { ...c, cards: c.cards.filter(k => k.id !== cardId) } : c) }), false);
    setEditing(null);
  };
  const shiftCard = (cardId: string, dir: -1 | 1) =>
    update(b => {
      const idx = b.columns.findIndex(c => c.cards.some(k => k.id === cardId));
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= b.columns.length) return b;
      return { ...b, columns: moveCard(b.columns, cardId, b.columns[to].id) };
    }, false);

  const addColumn = () => update(b => ({ ...b, columns: [...b.columns, { id: newUuid(), title: 'Yeni kolon', color: '#64748b', cards: [] }] }), false);
  const deleteColumn = (colId: string) => {
    const col = board?.columns.find(c => c.id === colId);
    setColMenu(null);
    const go = () => update(b => ({ ...b, columns: b.columns.filter(c => c.id !== colId) }), false);
    if (col && col.cards.length > 0) {
      Alert.alert('Kolonu sil', `${col.cards.length} kart da silinecek. Emin misiniz?`, [
        { text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: go },
      ]);
    } else go();
  };
  const moveColumn = (colId: string, dir: -1 | 1) => update(b => {
    const i = b.columns.findIndex(c => c.id === colId); const j = i + dir;
    if (i < 0 || j < 0 || j >= b.columns.length) return b;
    const cols = b.columns.slice(); [cols[i], cols[j]] = [cols[j], cols[i]]; return { ...b, columns: cols };
  }, false);
  const setColumnColor = (colId: string, color: string) => setColumns((board?.columns ?? []).map(c => c.id === colId ? { ...c, color } : c), false);

  const onDeleteBoard = () => {
    if (!board) return;
    Alert.alert('Panoyu sil', 'Bu pano ve tüm kartları silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { try { await deleteBoard(board.id); nav.goBack(); } catch (e: any) { Alert.alert('Silinemedi', e?.message || 'Hata'); } } },
    ]);
  };

  if (loading) return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  if (!board) return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><Text style={s.muted}>Pano bulunamadı.</Text></View></SafeAreaView>;

  const editCard = editing ? board.columns.find(c => c.id === editing.columnId)?.cards.find(k => k.id === editing.cardId) : undefined;
  const menuCol = colMenu ? board.columns.find(c => c.id === colMenu) : undefined;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.boardIcon}>{board.icon}</Text>
        <TextInput style={s.boardTitle} value={board.title} onChangeText={t => update(b => ({ ...b, title: t }), true)} placeholder="Pano adı" placeholderTextColor={colors.text.faint} />
        <TouchableOpacity onPress={onDeleteBoard} hitSlop={HS}><Ionicons name="trash-outline" size={20} color={colors.rose.default} /></TouchableOpacity>
      </View>

      {remoteChanged && (
        <TouchableOpacity style={s.remoteBanner} onPress={() => { setRemoteChanged(false); load(); }} activeOpacity={0.85}>
          <Ionicons name="sync-outline" size={16} color="#fff" />
          <Text style={s.remoteText}>Pano güncellendi. Yenilemek için dokun.</Text>
        </TouchableOpacity>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.columns} snapToInterval={colW + spacing.md} decelerationRate="fast">
        {board.columns.map((col, ci) => (
          <View key={col.id} style={[s.column, { width: colW }]}>
            <View style={s.colHeader}>
              <View style={[s.colDot, { backgroundColor: col.color }]} />
              <TextInput style={s.colTitle} value={col.title} onChangeText={t => setColumns(board.columns.map(c => c.id === col.id ? { ...c, title: t } : c), true)} />
              <Text style={s.colCount}>{col.cards.length}</Text>
              <TouchableOpacity onPress={() => setColMenu(col.id)} hitSlop={HS}><Ionicons name="ellipsis-horizontal" size={18} color={colors.text.faint} /></TouchableOpacity>
            </View>

            <ScrollView style={s.colScroll} showsVerticalScrollIndicator={false}>
              {col.cards.length === 0 && addingIn !== col.id && <Text style={s.colEmpty}>Buraya görev ekleyin</Text>}
              {col.cards.map(card => {
                const ds = dueStatus(card.dueDate);
                const prog = checklistProgress(card);
                return (
                  <TouchableOpacity key={card.id} style={[s.kanbanCard, card.priority && { borderLeftWidth: 3, borderLeftColor: PRIORITY_COLOR[card.priority] }]} onPress={() => setEditing({ columnId: col.id, cardId: card.id })} activeOpacity={0.8}>
                    <Text style={s.kanbanTitle} numberOfLines={3}>{card.title}</Text>
                    {!!card.labels?.length && (
                      <View style={s.labelRow}>
                        {card.labels.map((l, i) => <View key={i} style={[s.labelChip, { backgroundColor: l.color + '22', borderColor: l.color }]}><Text style={[s.labelText, { color: l.color }]}>{l.text}</Text></View>)}
                      </View>
                    )}
                    {!!card.description && <Text style={s.kanbanDesc} numberOfLines={2}>{card.description}</Text>}
                    <View style={s.kanbanMeta}>
                      {card.priority && card.priority !== 'normal' && <View style={[s.prioPill, { backgroundColor: PRIORITY_COLOR[card.priority] + '22', borderColor: PRIORITY_COLOR[card.priority] }]}><Text style={[s.prioText, { color: PRIORITY_COLOR[card.priority] }]}>{PRIORITY_LABEL[card.priority]}</Text></View>}
                      {prog.total > 0 && <Text style={[s.metaChip, prog.pct === 100 && { color: brand.green }]}>☑ {prog.done}/{prog.total}</Text>}
                      {!!card.dueDate && <Text style={[s.metaChip, { color: DUE_COLOR[ds] }]}>📅 {card.dueDate}{DUE_LABEL[ds] ? ` · ${DUE_LABEL[ds]}` : ''}</Text>}
                      {!!card.assignee && <Text style={s.metaChip} numberOfLines={1}>👤 {card.assignee}</Text>}
                    </View>
                    <View style={s.cardMoveRow}>
                      {ci > 0 && <TouchableOpacity onPress={() => shiftCard(card.id, -1)} hitSlop={HS} style={s.moveArrow}><Ionicons name="arrow-back" size={15} color={colors.text.muted} /></TouchableOpacity>}
                      <View style={{ flex: 1 }} />
                      {ci < board.columns.length - 1 && <TouchableOpacity onPress={() => shiftCard(card.id, 1)} hitSlop={HS} style={s.moveArrow}><Ionicons name="arrow-forward" size={15} color={colors.text.muted} /></TouchableOpacity>}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {addingIn === col.id ? (
                <View style={s.quickAdd}>
                  <TextInput
                    style={s.quickInput} value={draft} onChangeText={setDraft} placeholder="Kart başlığı…" placeholderTextColor={colors.text.faint}
                    autoFocus blurOnSubmit={false} returnKeyType="done"
                    onSubmitEditing={() => { addCard(col.id, draft); setDraft(''); }}
                    onBlur={() => { if (draft.trim()) addCard(col.id, draft); setDraft(''); setAddingIn(null); }}
                  />
                </View>
              ) : (
                <TouchableOpacity style={s.addCard} onPress={() => { setDraft(''); setAddingIn(col.id); }} activeOpacity={0.7}>
                  <Ionicons name="add" size={16} color={colors.text.muted} /><Text style={s.addCardText}>Kart ekle</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        ))}

        <TouchableOpacity style={s.addColumn} onPress={addColumn} activeOpacity={0.8}><Ionicons name="add" size={22} color={colors.text.muted} /><Text style={s.addColText}>Kolon</Text></TouchableOpacity>
      </ScrollView>

      {/* Kolon menüsü */}
      <Modal visible={!!colMenu} transparent animationType="fade" onRequestClose={() => setColMenu(null)}>
        <Pressable style={s.modalBg} onPress={() => setColMenu(null)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle} numberOfLines={1}>{menuCol?.title || 'Kolon'}</Text>
            <Text style={s.label}>Renk</Text>
            <View style={s.swatchRow}>
              {COLUMN_COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.swatch, { backgroundColor: c }, menuCol?.color === c && s.swatchSel]} onPress={() => { if (colMenu) setColumnColor(colMenu, c); }} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <TouchableOpacity style={s.menuBtn} onPress={() => { if (colMenu) moveColumn(colMenu, -1); setColMenu(null); }}><Ionicons name="arrow-back" size={16} color={colors.text.primary} /><Text style={s.menuBtnText}>Sola</Text></TouchableOpacity>
              <TouchableOpacity style={s.menuBtn} onPress={() => { if (colMenu) moveColumn(colMenu, 1); setColMenu(null); }}><Ionicons name="arrow-forward" size={16} color={colors.text.primary} /><Text style={s.menuBtnText}>Sağa</Text></TouchableOpacity>
              <TouchableOpacity style={[s.menuBtn, { borderColor: colors.rose.default }]} onPress={() => colMenu && deleteColumn(colMenu)}><Ionicons name="trash-outline" size={16} color={colors.rose.default} /><Text style={[s.menuBtnText, { color: colors.rose.default }]}>Sil</Text></TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Kart düzenleyici */}
      {editing && editCard && (
        <CardEditor
          card={editCard} columns={board.columns} currentColumnId={editing.columnId}
          onClose={() => setEditing(null)}
          onSave={c => saveCard(editing.columnId, c)}
          onDelete={() => deleteCard(editing.columnId, editing.cardId)}
          onMove={colId => { update(b => ({ ...b, columns: moveCard(b.columns, editing.cardId, colId) }), false); setEditing(null); }}
        />
      )}
    </SafeAreaView>
  );
}

function CardEditor({ card, columns, currentColumnId, onClose, onSave, onDelete, onMove }: {
  card: OfficeBoardCard; columns: OfficeBoardColumn[]; currentColumnId: string;
  onClose: () => void; onSave: (c: OfficeBoardCard) => void; onDelete: () => void; onMove: (colId: string) => void;
}) {
  const [draft, setDraft] = useState<OfficeBoardCard>(card);
  const [labelText, setLabelText] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);
  const [checkText, setCheckText] = useState('');
  const commit = (patch: Partial<OfficeBoardCard>) => { const next = { ...draft, ...patch }; setDraft(next); onSave(next); };
  const prog = checklistProgress(draft);

  const addLabel = () => { const t = labelText.trim(); if (!t) return; commit({ labels: [...(draft.labels ?? []), newLabel(t, labelColor)] }); setLabelText(''); };
  const addCheck = () => { const t = checkText.trim(); if (!t) return; commit({ checklist: [...(draft.checklist ?? []), newChecklistItem(t)] }); setCheckText(''); };
  const quickDue = (days: number | null) => commit({ dueDate: days === null ? undefined : addDays(localDateISO(), days) });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={s.editor} onPress={e => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.editorHeader}>
              <Text style={s.editorTitle}>Kart</Text>
              <TouchableOpacity onPress={onClose} hitSlop={HS}><Ionicons name="close" size={22} color={colors.text.muted} /></TouchableOpacity>
            </View>

            <Text style={s.label}>Başlık</Text>
            <TextInput style={s.input} value={draft.title} onChangeText={t => commit({ title: t })} placeholder="Kart başlığı" placeholderTextColor={colors.text.faint} multiline />

            <Text style={s.label}>Açıklama</Text>
            <TextInput style={[s.input, s.textarea]} value={draft.description} onChangeText={t => commit({ description: t })} placeholder="Detay" placeholderTextColor={colors.text.faint} multiline />

            <Text style={s.label}>Öncelik</Text>
            <View style={s.prioRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p} style={[s.prioChoice, draft.priority === p && { backgroundColor: PRIORITY_COLOR[p] + '22', borderColor: PRIORITY_COLOR[p] }]} onPress={() => commit({ priority: p })}>
                  <Text style={[s.prioChoiceText, draft.priority === p && { color: PRIORITY_COLOR[p] }]}>{PRIORITY_LABEL[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Etiketler</Text>
            <View style={s.labelRowEdit}>
              {(draft.labels ?? []).map((l, i) => (
                <TouchableOpacity key={i} style={[s.labelChip, { backgroundColor: l.color + '22', borderColor: l.color }]} onPress={() => commit({ labels: (draft.labels ?? []).filter((_, j) => j !== i) })}>
                  <Text style={[s.labelText, { color: l.color }]}>{l.text}</Text>
                  <Ionicons name="close" size={11} color={l.color} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.addRow}>
              <View style={s.swatchRowSm}>
                {LABEL_COLORS.map(c => <TouchableOpacity key={c} style={[s.swatchSm, { backgroundColor: c }, labelColor === c && s.swatchSel]} onPress={() => setLabelColor(c)} />)}
              </View>
            </View>
            <View style={s.addRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={labelText} onChangeText={setLabelText} placeholder="Etiket ekle" placeholderTextColor={colors.text.faint} onSubmitEditing={addLabel} returnKeyType="done" />
              <TouchableOpacity style={s.addMini} onPress={addLabel}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
            </View>

            <View style={s.checkHeader}>
              <Text style={s.label}>Kontrol Listesi</Text>
              {prog.total > 0 && <Text style={s.progTag}>{prog.done}/{prog.total} · %{prog.pct}</Text>}
            </View>
            {(draft.checklist ?? []).map(it => (
              <View key={it.id} style={s.checkItem}>
                <TouchableOpacity onPress={() => commit({ checklist: (draft.checklist ?? []).map(x => x.id === it.id ? { ...x, done: !x.done } : x) })} hitSlop={HS}>
                  <Ionicons name={it.done ? 'checkbox' : 'square-outline'} size={20} color={it.done ? brand.green : colors.text.muted} />
                </TouchableOpacity>
                <Text style={[s.checkText, it.done && s.checkDone]}>{it.text}</Text>
                <TouchableOpacity onPress={() => commit({ checklist: (draft.checklist ?? []).filter(x => x.id !== it.id) })} hitSlop={HS}><Ionicons name="close" size={15} color={colors.text.faint} /></TouchableOpacity>
              </View>
            ))}
            <View style={s.addRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={checkText} onChangeText={setCheckText} placeholder="Madde ekle" placeholderTextColor={colors.text.faint} onSubmitEditing={addCheck} returnKeyType="done" />
              <TouchableOpacity style={s.addMini} onPress={addCheck}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
            </View>

            <Text style={s.label}>Sorumlu</Text>
            <TextInput style={s.input} value={draft.assignee} onChangeText={t => commit({ assignee: t })} placeholder="İsim" placeholderTextColor={colors.text.faint} />

            <Text style={s.label}>Termin</Text>
            <View style={s.prioRow}>
              <TouchableOpacity style={s.dueChip} onPress={() => quickDue(0)}><Text style={s.dueChipText}>Bugün</Text></TouchableOpacity>
              <TouchableOpacity style={s.dueChip} onPress={() => quickDue(1)}><Text style={s.dueChipText}>+1 gün</Text></TouchableOpacity>
              <TouchableOpacity style={s.dueChip} onPress={() => quickDue(7)}><Text style={s.dueChipText}>+1 hafta</Text></TouchableOpacity>
              <TouchableOpacity style={s.dueChip} onPress={() => quickDue(null)}><Text style={s.dueChipText}>Temizle</Text></TouchableOpacity>
            </View>
            <TextInput style={[s.input, { marginTop: 8 }]} value={draft.dueDate} onChangeText={t => commit({ dueDate: t })} placeholder="2026-07-15 (YYYY-AA-GG)" placeholderTextColor={colors.text.faint} />

            <Text style={s.label}>Taşı</Text>
            <View style={s.prioRow}>
              {columns.filter(c => c.id !== currentColumnId).map(c => (
                <TouchableOpacity key={c.id} style={s.moveChoice} onPress={() => onMove(c.id)}>
                  <View style={[s.colDot, { backgroundColor: c.color }]} /><Text style={s.moveText} numberOfLines={1}>{c.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.deleteBtn} onPress={onDelete} activeOpacity={0.85}><Ionicons name="trash-outline" size={18} color="#fff" /><Text style={s.deleteText}>Kartı sil</Text></TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.text.muted },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  boardIcon: { fontSize: 22 },
  boardTitle: { flex: 1, color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', padding: 0 },
  remoteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.blue.default, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  remoteText: { color: '#fff', fontSize: typography.xs, fontWeight: '600', flex: 1 },
  columns: { padding: spacing.md, gap: spacing.md, alignItems: 'flex-start' },
  column: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, maxHeight: '100%', paddingBottom: spacing.sm },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  colDot: { width: 10, height: 10, borderRadius: 5 },
  colTitle: { flex: 1, color: colors.text.primary, fontWeight: '800', fontSize: typography.base, padding: 0 },
  colCount: { color: colors.text.faint, fontSize: typography.xs, fontWeight: '700' },
  colScroll: { paddingHorizontal: spacing.sm },
  colEmpty: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', paddingVertical: spacing.md },
  kanbanCard: { backgroundColor: colors.bg.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, padding: spacing.sm, marginBottom: 8 },
  kanbanTitle: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  kanbanDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 3 },
  kanbanMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metaChip: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  prioPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  prioText: { fontSize: 10, fontWeight: '700' },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  labelRowEdit: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  labelChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  labelText: { fontSize: 10, fontWeight: '700' },
  cardMoveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  moveArrow: { width: 30, height: 26, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, marginBottom: 6 },
  addCardText: { color: colors.text.muted, fontSize: typography.sm },
  quickAdd: { marginBottom: 8 },
  quickInput: { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: brand.green, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, color: colors.text.primary, fontSize: typography.base },
  addColumn: { width: 110, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border.secondary },
  addColText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.sm },
  swatchRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: 34, height: 34, borderRadius: radius.full, borderWidth: 2, borderColor: 'transparent' },
  swatchRowSm: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  swatchSm: { width: 26, height: 26, borderRadius: radius.full, borderWidth: 2, borderColor: 'transparent' },
  swatchSel: { borderColor: colors.text.primary },
  menuBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  menuBtnText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  editor: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl, maxHeight: '90%' },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  editorTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text.primary, fontSize: typography.base },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  prioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prioChoice: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary },
  prioChoiceText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  dueChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary },
  dueChipText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addMini: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: brand.green, alignItems: 'center', justifyContent: 'center' },
  checkHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progTag: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.md },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  checkText: { flex: 1, color: colors.text.primary, fontSize: typography.base },
  checkDone: { textDecorationLine: 'line-through', color: colors.text.faint },
  moveChoice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, maxWidth: 160 },
  moveText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.rose.default, paddingVertical: 12, borderRadius: radius.md, marginTop: spacing.xl },
  deleteText: { color: '#fff', fontWeight: '800', fontSize: typography.base },
});

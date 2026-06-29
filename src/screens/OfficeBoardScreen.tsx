// OfficeBoardScreen — kanban pano (yatay kolonlar + kartlar). Kart ekle/düzenle/taşı/sil.
// Sürükle-bırak yerine mobil-dostu "taşı" eylemi (hedef kolon seçimi) kullanılır.
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList, OfficeBoard, OfficeBoardCard, OfficeBoardColumn, OfficeCardPriority } from '../types';
import {
  getBoard, saveBoard, deleteBoard, newCard, moveCard,
  PRIORITY_LABEL, PRIORITY_COLOR,
} from '../services/officeWorkspace';
import { newUuid } from '../services/data/repository';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'OfficeBoard'>;

const PRIORITIES: OfficeCardPriority[] = ['low', 'normal', 'high', 'urgent'];

export default function OfficeBoardScreen() {
  const route = useRoute<Rt>();
  const nav = useNavigation<Nav>();
  const boardId = route.params?.boardId;
  const [board, setBoard] = useState<OfficeBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ columnId: string; card: OfficeBoardCard } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!boardId) { setLoading(false); return; }
    setBoard((await getBoard(boardId)) ?? null);
    setLoading(false);
  }, [boardId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const persist = (next: OfficeBoard, debounced = false) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = () => saveBoard({ id: next.id, title: next.title, icon: next.icon, description: next.description, columns: next.columns }).catch(() => {});
    if (debounced) saveTimer.current = setTimeout(run, 600); else run();
  };
  const update = (mut: (b: OfficeBoard) => OfficeBoard, debounced = false) => {
    setBoard(prev => { if (!prev) return prev; const next = mut(prev); persist(next, debounced); return next; });
  };

  const setColumns = (columns: OfficeBoardColumn[]) => update(b => ({ ...b, columns }), false);

  const addCard = (columnId: string) => {
    update(b => ({
      ...b,
      columns: b.columns.map(c => c.id === columnId ? { ...c, cards: [...c.cards, newCard('Yeni kart')] } : c),
    }), false);
  };

  const saveCard = (columnId: string, card: OfficeBoardCard) => {
    update(b => ({
      ...b,
      columns: b.columns.map(c => c.id === columnId ? { ...c, cards: c.cards.map(k => k.id === card.id ? card : k) } : c),
    }), false);
  };

  const deleteCard = (columnId: string, cardId: string) => {
    update(b => ({
      ...b,
      columns: b.columns.map(c => c.id === columnId ? { ...c, cards: c.cards.filter(k => k.id !== cardId) } : c),
    }), false);
    setEditing(null);
  };

  const moveCardTo = (cardId: string, toColumnId: string) => {
    update(b => ({ ...b, columns: moveCard(b.columns, cardId, toColumnId) }), false);
    setEditing(null);
  };

  const addColumn = () => {
    update(b => ({ ...b, columns: [...b.columns, { id: newUuid(), title: 'Yeni kolon', color: '#64748b', cards: [] }] }), false);
  };

  const onDeleteBoard = () => {
    if (!board) return;
    Alert.alert('Panoyu sil', 'Bu pano ve tüm kartları silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { try { await deleteBoard(board.id); nav.goBack(); } catch (e: any) { Alert.alert('Silinemedi', e?.message || 'Hata'); } } },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }
  if (!board) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><Text style={s.muted}>Pano bulunamadı.</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.boardIcon}>{board.icon}</Text>
        <TextInput
          style={s.boardTitle}
          value={board.title}
          onChangeText={t => update(b => ({ ...b, title: t }), true)}
          placeholder="Pano adı"
          placeholderTextColor={colors.text.faint}
        />
        <TouchableOpacity onPress={onDeleteBoard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={20} color={colors.rose.default} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.columns}>
        {board.columns.map(col => (
          <View key={col.id} style={s.column}>
            <View style={s.colHeader}>
              <View style={[s.colDot, { backgroundColor: col.color }]} />
              <TextInput
                style={s.colTitle}
                value={col.title}
                onChangeText={t => setColumns(board.columns.map(c => c.id === col.id ? { ...c, title: t } : c))}
              />
              <Text style={s.colCount}>{col.cards.length}</Text>
            </View>

            <ScrollView style={s.colScroll} showsVerticalScrollIndicator={false}>
              {col.cards.map(card => (
                <TouchableOpacity key={card.id} style={s.kanbanCard} onPress={() => setEditing({ columnId: col.id, card })} activeOpacity={0.8}>
                  <Text style={s.kanbanTitle} numberOfLines={3}>{card.title}</Text>
                  {!!card.description && <Text style={s.kanbanDesc} numberOfLines={2}>{card.description}</Text>}
                  <View style={s.kanbanMeta}>
                    {card.priority && (
                      <View style={[s.prioPill, { backgroundColor: PRIORITY_COLOR[card.priority] + '22', borderColor: PRIORITY_COLOR[card.priority] }]}>
                        <Text style={[s.prioText, { color: PRIORITY_COLOR[card.priority] }]}>{PRIORITY_LABEL[card.priority]}</Text>
                      </View>
                    )}
                    {!!card.assignee && <Text style={s.assignee} numberOfLines={1}>👤 {card.assignee}</Text>}
                    {!!card.dueDate && <Text style={s.due}>📅 {card.dueDate}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.addCard} onPress={() => addCard(col.id)} activeOpacity={0.7}>
                <Ionicons name="add" size={16} color={colors.text.muted} />
                <Text style={s.addCardText}>Kart ekle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ))}

        <TouchableOpacity style={s.addColumn} onPress={addColumn} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color={colors.text.muted} />
          <Text style={s.addColText}>Kolon</Text>
        </TouchableOpacity>
      </ScrollView>

      {editing && (
        <CardEditor
          card={editing.card}
          columns={board.columns}
          currentColumnId={editing.columnId}
          onClose={() => setEditing(null)}
          onSave={c => saveCard(editing.columnId, c)}
          onDelete={() => deleteCard(editing.columnId, editing.card.id)}
          onMove={colId => moveCardTo(editing.card.id, colId)}
        />
      )}
    </SafeAreaView>
  );
}

function CardEditor({
  card, columns, currentColumnId, onClose, onSave, onDelete, onMove,
}: {
  card: OfficeBoardCard; columns: OfficeBoardColumn[]; currentColumnId: string;
  onClose: () => void; onSave: (c: OfficeBoardCard) => void; onDelete: () => void; onMove: (colId: string) => void;
}) {
  const [draft, setDraft] = useState<OfficeBoardCard>(card);
  const commit = (patch: Partial<OfficeBoardCard>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onSave(next);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalBg} onPress={onClose}>
        <Pressable style={s.editor} onPress={e => e.stopPropagation()}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.editorHeader}>
              <Text style={s.editorTitle}>Kart</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.text.muted} />
              </TouchableOpacity>
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

            <Text style={s.label}>Sorumlu</Text>
            <TextInput style={s.input} value={draft.assignee} onChangeText={t => commit({ assignee: t })} placeholder="İsim" placeholderTextColor={colors.text.faint} />

            <Text style={s.label}>Termin (YYYY-AA-GG)</Text>
            <TextInput style={s.input} value={draft.dueDate} onChangeText={t => commit({ dueDate: t })} placeholder="2026-07-15" placeholderTextColor={colors.text.faint} />

            <Text style={s.label}>Taşı</Text>
            <View style={s.prioRow}>
              {columns.filter(c => c.id !== currentColumnId).map(c => (
                <TouchableOpacity key={c.id} style={s.moveChoice} onPress={() => onMove(c.id)}>
                  <View style={[s.colDot, { backgroundColor: c.color }]} />
                  <Text style={s.moveText} numberOfLines={1}>{c.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.deleteBtn} onPress={onDelete} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={s.deleteText}>Kartı sil</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.text.muted },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  boardIcon: { fontSize: 22 },
  boardTitle: { flex: 1, color: colors.text.primary, fontSize: typography.lg, fontWeight: '800', padding: 0 },
  columns: { padding: spacing.md, gap: spacing.md, alignItems: 'flex-start' },
  column: { width: 260, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, maxHeight: '100%', paddingBottom: spacing.sm },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  colDot: { width: 10, height: 10, borderRadius: 5 },
  colTitle: { flex: 1, color: colors.text.primary, fontWeight: '800', fontSize: typography.base, padding: 0 },
  colCount: { color: colors.text.faint, fontSize: typography.xs, fontWeight: '700' },
  colScroll: { paddingHorizontal: spacing.sm },
  kanbanCard: { backgroundColor: colors.bg.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, padding: spacing.sm, marginBottom: 8 },
  kanbanTitle: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  kanbanDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 3 },
  kanbanMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  prioPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  prioText: { fontSize: 10, fontWeight: '700' },
  assignee: { color: colors.text.muted, fontSize: typography.xs },
  due: { color: colors.text.muted, fontSize: typography.xs },
  addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, marginBottom: 6 },
  addCardText: { color: colors.text.muted, fontSize: typography.sm },
  addColumn: { width: 100, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border.secondary },
  addColText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  editor: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl, maxHeight: '88%' },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  editorTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text.primary, fontSize: typography.base },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  prioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prioChoice: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary },
  prioChoiceText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  moveChoice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, maxWidth: 160 },
  moveText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.rose.default, paddingVertical: 12, borderRadius: radius.md, marginTop: spacing.xl },
  deleteText: { color: '#fff', fontWeight: '800', fontSize: typography.base },
});

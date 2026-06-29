// OfficePagesScreen — Notion benzeri çalışma alanı: arama + şablonlar + son görüntülenenler
// + iç içe sayfa ağacı (taşı/sırala/favori/sil). Realtime ile ekip değişiklikleri yansır.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList, OfficePage } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import {
  listPages, savePage, deletePage, toggleFavorite, childrenOf, newBlock,
  movePage, reorderSibling, descendantIds, searchPages, recentPageIds, orderByRecent,
  subscribeOffice, PAGE_TEMPLATES,
} from '../services/officeWorkspace';
import EmptyState from '../components/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const HS = { top: 8, bottom: 8, left: 8, right: 8 };

export default function OfficePagesScreen() {
  const nav = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const { showToast } = useAppContext();
  const [pages, setPages] = useState<OfficePage[]>([]);
  const [recent, setRecent] = useState<OfficePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [tplOpen, setTplOpen] = useState<{ parentId: string | null } | null>(null);
  const [actionFor, setActionFor] = useState<OfficePage | null>(null);
  const [moveFor, setMoveFor] = useState<OfficePage | null>(null);
  const autoExpanded = useRef(false);

  const refresh = useCallback(async () => {
    const all = await listPages();
    setPages(all);
    const ids = await recentPageIds();
    setRecent(orderByRecent(all, ids, 6));
    if (!autoExpanded.current) {
      autoExpanded.current = true;
      setExpanded(new Set(childrenOf(all, null).map(p => p.id))); // ilk seviye açık
    }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => subscribeOffice('office_pages', refresh), [refresh]);

  const toggleExpand = (id: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const createPage = async (parentId: string | null, tplKey = 'blank') => {
    if (busy) return;
    setBusy(true);
    try {
      const tpl = PAGE_TEMPLATES.find(t => t.key === tplKey) ?? PAGE_TEMPLATES[0];
      const created = await savePage({
        parentId, title: tplKey === 'blank' ? 'Adsız sayfa' : tpl.label, icon: tpl.icon,
        blocks: tpl.build(), createdBy: user?.id, createdByName: profile?.full_name ?? undefined,
      });
      if (parentId) setExpanded(prev => new Set(prev).add(parentId));
      setTplOpen(null);
      await refresh();
      nav.navigate('OfficePage', { pageId: created.id });
    } catch (e: any) {
      Alert.alert('Sayfa oluşturulamadı', e?.message || 'Hata');
    } finally { setBusy(false); }
  };

  const doDelete = (p: OfficePage) => {
    setActionFor(null);
    Alert.alert('Sayfayı sil', 'Bu sayfa ve tüm alt sayfaları silinecek. Emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try { await deletePage(p.id); showToast('Sayfa silindi'); refresh(); }
          catch (e: any) { Alert.alert('Silinemedi', e?.message || 'Hata'); }
        },
      },
    ]);
  };

  const doMove = async (target: OfficePage, newParentId: string | null) => {
    try { await movePage(target.id, newParentId); setMoveFor(null); refresh(); showToast('Sayfa taşındı'); }
    catch (e: any) { Alert.alert('Taşınamadı', e?.message || 'Hata'); }
  };

  const doReorder = async (p: OfficePage, dir: -1 | 1) => {
    setActionFor(null);
    try { await reorderSibling(pages, p.id, dir); }
    catch (e: any) { Alert.alert('Sıralanamadı', e?.message || 'Hata'); }
    refresh();
  };

  const favorites = pages.filter(p => p.isFavorite && !p.archived);
  const roots = childrenOf(pages, null);
  const hits = query.trim() ? searchPages(pages, query) : [];

  const renderNode = (p: OfficePage, depth: number): React.ReactNode => {
    const kids = childrenOf(pages, p.id);
    const isOpen = expanded.has(p.id);
    return (
      <View key={p.id}>
        <View style={[s.row, depth > 0 && { marginLeft: 14, borderLeftWidth: 1, borderLeftColor: colors.border.primary, paddingLeft: spacing.sm }]}>
          <TouchableOpacity onPress={() => kids.length > 0 && toggleExpand(p.id)} hitSlop={HS} style={s.caret}>
            {kids.length > 0
              ? <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={15} color={colors.text.muted} />
              : <View style={{ width: 15 }} />}
          </TouchableOpacity>
          <TouchableOpacity style={s.rowMain} onPress={() => nav.navigate('OfficePage', { pageId: p.id })} activeOpacity={0.7}>
            <Text style={s.emoji}>{p.icon}</Text>
            <Text style={s.title} numberOfLines={1}>{p.title || 'Adsız sayfa'}</Text>
            {p.isFavorite && <Ionicons name="star" size={13} color="#f59e0b" />}
            {kids.length > 0 && <Text style={s.count}>{kids.length}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => createPage(p.id)} hitSlop={HS} style={s.rowBtn}><Ionicons name="add" size={18} color={colors.text.faint} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setActionFor(p)} hitSlop={HS} style={s.rowBtn}><Ionicons name="ellipsis-horizontal" size={18} color={colors.text.faint} /></TouchableOpacity>
        </View>
        {isOpen && kids.map(k => renderNode(k, depth + 1))}
      </View>
    );
  };

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Arama */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.text.faint} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Sayfalarda ara (başlık + içerik)"
          placeholderTextColor={colors.text.faint}
          returnKeyType="search"
        />
        {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')} hitSlop={HS}><Ionicons name="close-circle" size={18} color={colors.text.faint} /></TouchableOpacity>}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {query.trim() ? (
          /* Arama sonuçları */
          hits.length === 0 ? (
            <EmptyState icon="search-outline" title="Sonuç yok" description={`"${query}" için sayfa bulunamadı.`} />
          ) : (
            <View style={s.card}>
              {hits.map(h => (
                <TouchableOpacity key={h.page.id} style={s.hitRow} onPress={() => nav.navigate('OfficePage', { pageId: h.page.id })} activeOpacity={0.7}>
                  <Text style={s.emoji}>{h.page.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title} numberOfLines={1}>{h.page.title || 'Adsız sayfa'}</Text>
                    {!!h.snippet && <Text style={s.snippet} numberOfLines={1}>{h.snippet}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.faint} />
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : (
          <>
            {recent.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Son Görüntülenenler</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recentRow}>
                  {recent.map(p => (
                    <TouchableOpacity key={p.id} style={s.recentChip} onPress={() => nav.navigate('OfficePage', { pageId: p.id })} activeOpacity={0.8}>
                      <Text style={s.emoji}>{p.icon}</Text>
                      <Text style={s.recentChipText} numberOfLines={1}>{p.title || 'Adsız'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {favorites.length > 0 && (
              <>
                <Text style={s.sectionLabel}>★ Favoriler</Text>
                <View style={s.card}>
                  {favorites.map(p => (
                    <TouchableOpacity key={p.id} style={s.favRow} onPress={() => nav.navigate('OfficePage', { pageId: p.id })} activeOpacity={0.7}>
                      <Text style={s.emoji}>{p.icon}</Text>
                      <Text style={s.title} numberOfLines={1}>{p.title || 'Adsız sayfa'}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.text.faint} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={s.sectionLabel}>Sayfalar</Text>
            {roots.length === 0 ? (
              <EmptyState icon="documents-outline" title="Henüz sayfa yok" description="İlk çalışma sayfanızı oluşturun — şablonla hızlı başlayın." />
            ) : (
              <View style={s.card}>{roots.map(p => renderNode(p, 0))}</View>
            )}

            <TouchableOpacity style={s.newBtn} onPress={() => setTplOpen({ parentId: null })} activeOpacity={0.85} disabled={busy}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={s.newBtnText}>Yeni Sayfa</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Şablon seçici */}
      <Modal visible={!!tplOpen} transparent animationType="slide" onRequestClose={() => setTplOpen(null)}>
        <Pressable style={s.modalBg} onPress={() => setTplOpen(null)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Şablon seç</Text>
            {PAGE_TEMPLATES.map(t => (
              <TouchableOpacity key={t.key} style={s.tplRow} onPress={() => createPage(tplOpen!.parentId, t.key)} activeOpacity={0.7} disabled={busy}>
                <Text style={s.tplIcon}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.tplLabel}>{t.label}</Text>
                  <Text style={s.tplDesc}>{t.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.faint} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Satır aksiyon menüsü */}
      <Modal visible={!!actionFor} transparent animationType="fade" onRequestClose={() => setActionFor(null)}>
        <Pressable style={s.modalBg} onPress={() => setActionFor(null)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle} numberOfLines={1}>{actionFor?.icon} {actionFor?.title || 'Sayfa'}</Text>
            <ActionItem icon={actionFor?.isFavorite ? 'star' : 'star-outline'} label={actionFor?.isFavorite ? 'Favoriden çıkar' : 'Favorile'} onPress={async () => { if (actionFor) { await toggleFavorite(actionFor.id); setActionFor(null); refresh(); } }} />
            <ActionItem icon="add-outline" label="Alt sayfa ekle" onPress={() => { if (actionFor) createPage(actionFor.id); setActionFor(null); }} />
            <ActionItem icon="arrow-up-outline" label="Yukarı taşı" onPress={() => actionFor && doReorder(actionFor, -1)} />
            <ActionItem icon="arrow-down-outline" label="Aşağı taşı" onPress={() => actionFor && doReorder(actionFor, 1)} />
            <ActionItem icon="git-branch-outline" label="Başka sayfaya taşı" onPress={() => { setMoveFor(actionFor); setActionFor(null); }} />
            <ActionItem icon="trash-outline" label="Sil" danger onPress={() => actionFor && doDelete(actionFor)} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Taşı: ebeveyn seçici (alt-ağaç hariç) */}
      <Modal visible={!!moveFor} transparent animationType="slide" onRequestClose={() => setMoveFor(null)}>
        <Pressable style={s.modalBg} onPress={() => setMoveFor(null)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Taşı: hedef sayfa</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <TouchableOpacity style={s.tplRow} onPress={() => moveFor && doMove(moveFor, null)} activeOpacity={0.7}>
                <Ionicons name="home-outline" size={18} color={colors.text.muted} />
                <Text style={[s.tplLabel, { flex: 1, marginLeft: 8 }]}>Kök (en üst)</Text>
              </TouchableOpacity>
              {moveFor && pages.filter(p => !p.archived && !descendantIds(pages, moveFor.id).has(p.id)).map(p => (
                <TouchableOpacity key={p.id} style={s.tplRow} onPress={() => doMove(moveFor, p.id)} activeOpacity={0.7}>
                  <Text style={s.tplIcon}>{p.icon}</Text>
                  <Text style={[s.tplLabel, { flex: 1 }]} numberOfLines={1}>{p.title || 'Adsız sayfa'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function ActionItem({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={s.actionItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={danger ? colors.rose.default : colors.text.muted} />
      <Text style={[s.actionLabel, danger && { color: colors.rose.default }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: spacing.lg, marginBottom: 0, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.base, padding: 0 },
  content: { padding: spacing.lg, paddingBottom: 90, gap: spacing.sm },
  sectionLabel: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, overflow: 'hidden', paddingHorizontal: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBtn: { padding: 4 },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.xs, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  hitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.xs, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  caret: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 17 },
  title: { flex: 1, color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  snippet: { color: colors.text.muted, fontSize: typography.xs, marginTop: 1 },
  count: { color: colors.text.faint, fontSize: typography.xs, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  recentRow: { gap: 8, paddingVertical: 4 },
  recentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.bg.secondary, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, maxWidth: 180 },
  recentChipText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: brand.green, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  tplRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  tplIcon: { fontSize: 22 },
  tplLabel: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  tplDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 1 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  actionLabel: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
});

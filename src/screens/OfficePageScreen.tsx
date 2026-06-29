// OfficePageScreen — Notion benzeri blok editör (Ofis Takip çalışma alanı çekirdeği).
// Emoji ikon + başlık + bloklar (başlık/metin/yapılacak/madde/numaralı/ayraç/vurgu/alıntı/kod).
// Blok ekle/değiştir/sil/taşı. Otomatik kayıt (metin debounce, yapısal anında).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, Alert, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList, OfficePage, OfficeBlock, OfficeBlockType } from '../types';
import {
  getPage, savePage, deletePage, newBlock, childrenOf, listPages,
  BLOCK_LABEL, BLOCK_ICON, BLOCK_MENU,
} from '../services/officeWorkspace';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'OfficePage'>;

const EMOJIS = ['📄', '📝', '📌', '📋', '✅', '📊', '📁', '💡', '🎯', '🚀', '⚙️', '🔧', '🏢', '👥', '📅', '💰', '⚡', '🔌', '🛠️', '📦', '🚗', '⭐', '🔥', '📈'];

export default function OfficePageScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const pageId = route.params?.pageId;

  const [page, setPage] = useState<OfficePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [subPages, setSubPages] = useState<OfficePage[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typeMenuFor, setTypeMenuFor] = useState<{ blockId: string | null } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef<OfficePage | null>(null);

  const load = useCallback(async () => {
    if (!pageId) { setLoading(false); return; }
    const p = await getPage(pageId);
    setPage(p ?? null);
    pageRef.current = p ?? null;
    const all = await listPages();
    setSubPages(childrenOf(all, pageId));
    setLoading(false);
  }, [pageId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Çıkışta bekleyen kaydı flush et.
  useEffect(() => () => { flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const p = pageRef.current;
    if (p) savePage({ id: p.id, title: p.title, icon: p.icon, blocks: p.blocks }).catch(() => {});
  };

  const persist = (next: OfficePage, debounced: boolean) => {
    pageRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (debounced) {
      saveTimer.current = setTimeout(() => {
        savePage({ id: next.id, title: next.title, icon: next.icon, blocks: next.blocks }).catch(() => {});
      }, 700);
    } else {
      savePage({ id: next.id, title: next.title, icon: next.icon, blocks: next.blocks }).catch(() => {});
    }
  };

  const update = (mut: (p: OfficePage) => OfficePage, debounced = false) => {
    setPage(prev => {
      if (!prev) return prev;
      const next = mut(prev);
      persist(next, debounced);
      return next;
    });
  };

  const setTitle = (title: string) => update(p => ({ ...p, title }), true);
  const setIcon = (icon: string) => { update(p => ({ ...p, icon }), false); setShowEmoji(false); };

  const setBlockText = (blockId: string, text: string) =>
    update(p => ({ ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, text } : b) }), true);

  const toggleCheck = (blockId: string) =>
    update(p => ({ ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b) }), false);

  const changeType = (blockId: string | null, type: OfficeBlockType) => {
    if (blockId === null) {
      // yeni blok ekle
      update(p => ({ ...p, blocks: [...p.blocks, newBlock(type)] }), false);
    } else {
      update(p => ({
        ...p,
        blocks: p.blocks.map(b => b.id === blockId
          ? { ...b, type, ...(type === 'todo' && b.checked === undefined ? { checked: false } : {}) }
          : b),
      }), false);
    }
    setTypeMenuFor(null);
  };

  const removeBlock = (blockId: string) =>
    update(p => ({ ...p, blocks: p.blocks.filter(b => b.id !== blockId) }), false);

  const moveBlock = (blockId: string, dir: -1 | 1) =>
    update(p => {
      const i = p.blocks.findIndex(b => b.id === blockId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.blocks.length) return p;
      const blocks = p.blocks.slice();
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...p, blocks };
    }, false);

  const addSubPage = async () => {
    if (!page) return;
    const created = await savePage({ parentId: page.id, title: 'Adsız sayfa', icon: '📄', blocks: [] });
    nav.navigate('OfficePage', { pageId: created.id });
  };

  const onDeletePage = () => {
    if (!page) return;
    Alert.alert('Sayfayı sil', 'Bu sayfa ve tüm alt sayfaları silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try { await deletePage(page.id); nav.goBack(); }
          catch (e: any) { Alert.alert('Silinemedi', e?.message || 'Hata'); }
        },
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }
  if (!page) {
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <View style={s.center}><Text style={s.muted}>Sayfa bulunamadı.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Üst aksiyon çubuğu */}
        <View style={s.toolbar}>
          <TouchableOpacity onPress={() => { flush(); update(p => ({ ...p, isFavorite: !p.isFavorite }), false); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={page.isFavorite ? 'star' : 'star-outline'} size={22} color={page.isFavorite ? '#f59e0b' : colors.text.muted} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onDeletePage} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={20} color={colors.rose.default} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Başlık + ikon */}
          <View style={s.titleRow}>
            <TouchableOpacity onPress={() => setShowEmoji(true)} style={s.iconBtn}>
              <Text style={s.iconEmoji}>{page.icon}</Text>
            </TouchableOpacity>
            <TextInput
              style={s.titleInput}
              value={page.title}
              onChangeText={setTitle}
              placeholder="Adsız sayfa"
              placeholderTextColor={colors.text.faint}
              multiline
            />
          </View>

          {/* Bloklar */}
          {page.blocks.map((b, idx) => (
            <BlockRow
              key={b.id}
              block={b}
              index={idx}
              total={page.blocks.length}
              onChangeText={t => setBlockText(b.id, t)}
              onToggleCheck={() => toggleCheck(b.id)}
              onMenu={() => setTypeMenuFor({ blockId: b.id })}
              onMove={dir => moveBlock(b.id, dir)}
              onDelete={() => removeBlock(b.id)}
            />
          ))}

          {/* Blok ekle */}
          <TouchableOpacity style={s.addBlock} onPress={() => setTypeMenuFor({ blockId: null })} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={colors.text.muted} />
            <Text style={s.addBlockText}>Blok ekle</Text>
          </TouchableOpacity>

          {/* Alt sayfalar */}
          <View style={s.subHeader}>
            <Text style={s.subTitle}>Alt Sayfalar</Text>
            <TouchableOpacity onPress={addSubPage} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="add-circle-outline" size={20} color={brand.green} />
            </TouchableOpacity>
          </View>
          {subPages.length === 0 ? (
            <Text style={s.subEmpty}>Alt sayfa yok.</Text>
          ) : subPages.map(sp => (
            <TouchableOpacity key={sp.id} style={s.subRow} onPress={() => { flush(); nav.push('OfficePage', { pageId: sp.id }); }} activeOpacity={0.7}>
              <Text style={s.iconEmoji}>{sp.icon}</Text>
              <Text style={s.subRowTitle} numberOfLines={1}>{sp.title || 'Adsız sayfa'}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.faint} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Emoji seçici */}
      <Modal visible={showEmoji} transparent animationType="fade" onRequestClose={() => setShowEmoji(false)}>
        <Pressable style={s.modalBg} onPress={() => setShowEmoji(false)}>
          <Pressable style={s.emojiSheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle}>İkon seç</Text>
            <View style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} style={s.emojiCell} onPress={() => setIcon(e)}>
                  <Text style={s.emojiCellText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Blok tipi menüsü */}
      <Modal visible={!!typeMenuFor} transparent animationType="slide" onRequestClose={() => setTypeMenuFor(null)}>
        <Pressable style={s.modalBg} onPress={() => setTypeMenuFor(null)}>
          <Pressable style={s.typeSheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle}>{typeMenuFor?.blockId ? 'Blok tipini değiştir' : 'Blok ekle'}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {BLOCK_MENU.map(t => (
                <TouchableOpacity key={t} style={s.typeRow} onPress={() => changeType(typeMenuFor!.blockId, t)} activeOpacity={0.7}>
                  <Ionicons name={BLOCK_ICON[t] as any} size={18} color={colors.text.muted} />
                  <Text style={s.typeLabel}>{BLOCK_LABEL[t]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function BlockRow({
  block, index, total, onChangeText, onToggleCheck, onMenu, onMove, onDelete,
}: {
  block: OfficeBlock; index: number; total: number;
  onChangeText: (t: string) => void; onToggleCheck: () => void; onMenu: () => void;
  onMove: (dir: -1 | 1) => void; onDelete: () => void;
}) {
  const [focused, setFocused] = useState(false);

  if (block.type === 'divider') {
    return (
      <View style={s.blockWrap}>
        <View style={s.dividerLine} />
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.dividerDel}>
          <Ionicons name="close" size={14} color={colors.text.faint} />
        </TouchableOpacity>
      </View>
    );
  }

  const inputStyle = [
    s.blockInput,
    block.type === 'heading1' && s.h1,
    block.type === 'heading2' && s.h2,
    block.type === 'heading3' && s.h3,
    block.type === 'quote' && s.quote,
    block.type === 'code' && s.code,
    block.type === 'todo' && block.checked && s.todoDone,
  ];

  const placeholder = BLOCK_LABEL[block.type];

  return (
    <View style={[s.blockWrap, block.type === 'callout' && s.calloutWrap, block.type === 'quote' && s.quoteWrap]}>
      {/* sol gösterge */}
      {block.type === 'todo' ? (
        <TouchableOpacity onPress={onToggleCheck} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={s.lead}>
          <Ionicons name={block.checked ? 'checkbox' : 'square-outline'} size={20} color={block.checked ? brand.green : colors.text.muted} />
        </TouchableOpacity>
      ) : block.type === 'bullet' ? (
        <View style={s.lead}><Text style={s.bulletDot}>•</Text></View>
      ) : block.type === 'numbered' ? (
        <View style={s.lead}><Text style={s.numDot}>{index + 1}.</Text></View>
      ) : block.type === 'callout' ? (
        <View style={s.lead}><Ionicons name="bulb" size={16} color="#f59e0b" /></View>
      ) : null}

      <TextInput
        style={[inputStyle, { flex: 1 }]}
        value={block.text}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.faint}
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />

      <TouchableOpacity onPress={onMenu} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={s.handle}>
        <Ionicons name="ellipsis-vertical" size={16} color={colors.text.faint} />
      </TouchableOpacity>
      {focused && (
        <View style={s.blockActions}>
          {index > 0 && (
            <TouchableOpacity onPress={() => onMove(-1)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="arrow-up" size={16} color={colors.text.faint} />
            </TouchableOpacity>
          )}
          {index < total - 1 && (
            <TouchableOpacity onPress={() => onMove(1)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="arrow-down" size={16} color={colors.text.faint} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="trash-outline" size={15} color={colors.rose.default} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.text.muted },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  content: { padding: spacing.lg, paddingBottom: 120 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.md },
  iconBtn: { paddingTop: 2 },
  iconEmoji: { fontSize: 30 },
  titleInput: { flex: 1, color: colors.text.primary, fontSize: 26, fontWeight: '800', padding: 0, lineHeight: 32 },
  blockWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 3 },
  calloutWrap: { backgroundColor: 'rgba(251,191,36,0.10)', borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: '#f59e0b', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, marginVertical: 2 },
  quoteWrap: { borderLeftWidth: 3, borderLeftColor: colors.border.secondary, paddingLeft: spacing.sm, marginVertical: 2 },
  lead: { paddingTop: 7, minWidth: 20, alignItems: 'center' },
  bulletDot: { color: colors.text.primary, fontSize: 18, lineHeight: 22 },
  numDot: { color: colors.text.muted, fontSize: typography.base, lineHeight: 22, fontWeight: '600' },
  blockInput: { color: colors.text.primary, fontSize: typography.base, lineHeight: 22, paddingVertical: 4, paddingHorizontal: 0 },
  h1: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  h2: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  quote: { fontStyle: 'italic', color: colors.text.secondary },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: typography.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  todoDone: { textDecorationLine: 'line-through', color: colors.text.faint },
  handle: { paddingTop: 6 },
  blockActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.secondary, marginVertical: 12 },
  dividerDel: { paddingTop: 8, paddingLeft: 6 },
  addBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, marginTop: 4, opacity: 0.8 },
  addBlockText: { color: colors.text.muted, fontSize: typography.base },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.primary, paddingTop: spacing.md },
  subTitle: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  subEmpty: { color: colors.text.faint, fontSize: typography.sm },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, marginBottom: 6 },
  subRowTitle: { flex: 1, color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  emojiSheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiCell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.bg.secondary },
  emojiCellText: { fontSize: 24 },
  typeSheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  typeLabel: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
});

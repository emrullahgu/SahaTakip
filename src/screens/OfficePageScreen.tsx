// OfficePageScreen — Notion benzeri blok editör (Ofis Takip çekirdeği).
// Akış: yaz → Enter ile aynı tipte yeni blok; boş blokta Backspace → öncekiyle birleş.
// Breadcrumb, otomatik odak, '/' tip menüsü, kayıt-hata bannerı (sessiz kayıp YOK),
// realtime yenileme (dirty değilken), klavye-üstü görünürlük. Mobil-öncelikli.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getPage, savePage, deletePage, newBlock, childrenOf, listPages, touchRecent,
  BLOCK_LABEL, BLOCK_ICON, BLOCK_MENU, subscribeOffice,
} from '../services/officeWorkspace';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'OfficePage'>;

const EMOJIS = ['📄', '📝', '📌', '📋', '✅', '📊', '📁', '💡', '🎯', '🚀', '⚙️', '🔧', '🏢', '👥', '📅', '💰', '⚡', '🔌', '🛠️', '📦', '🚗', '⭐', '🔥', '📈'];
// Enter'da satır içi yeni-satır YERİNE blok bölünmesi uygulanmayan tipler (gerçek çok-satır):
const MULTILINE_TYPES: OfficeBlockType[] = ['code'];
// Enter sonrası devam tipi (liste tipleri kendini sürdürür, başlık → metin).
function continuationType(t: OfficeBlockType): OfficeBlockType {
  if (t === 'bullet' || t === 'numbered' || t === 'todo') return t;
  return 'text';
}

export default function OfficePageScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const pageId = route.params?.pageId;

  const [page, setPage] = useState<OfficePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [subPages, setSubPages] = useState<OfficePage[]>([]);
  const [crumbs, setCrumbs] = useState<OfficePage[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typeMenuFor, setTypeMenuFor] = useState<{ blockId: string | null } | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [remoteChanged, setRemoteChanged] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef<OfficePage | null>(null);
  const dirtyRef = useRef(false);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const pendingFocus = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!pageId) { setLoading(false); return; }
    const all = await listPages();
    const p = all.find(x => x.id === pageId) ?? null;
    setPage(p);
    pageRef.current = p;
    setSubPages(childrenOf(all, pageId));
    // breadcrumb zinciri (kök → bu sayfa)
    const chain: OfficePage[] = [];
    let cur = p;
    const byId = new Map(all.map(x => [x.id, x]));
    while (cur) { chain.unshift(cur); cur = cur.parentId ? byId.get(cur.parentId) ?? null : null; }
    setCrumbs(chain);
    setLoading(false);
    touchRecent(pageId);
  }, [pageId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Realtime: başka biri değiştirince, ben düzenlemiyorsam yenile; düzenliyorsam uyar.
  useEffect(() => {
    const off = subscribeOffice('office_pages', () => {
      if (dirtyRef.current) setRemoteChanged(true); else load();
    });
    return off;
  }, [load]);

  // Çıkışta bekleyen kaydı flush et.
  useEffect(() => () => { flushNow(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni eklenen bloğa odak (render sonrası).
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const tryFocus = (n: number) => {
      const node = inputRefs.current[id];
      if (node) { try { node.focus(); } catch { /* yok */ } }
      else if (n > 0) requestAnimationFrame(() => tryFocus(n - 1));
    };
    requestAnimationFrame(() => tryFocus(5));
  });

  const persist = useCallback((next: OfficePage, debounced: boolean) => {
    pageRef.current = next;
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const run = async () => {
      setStatus('saving');
      try {
        await savePage({ id: next.id, title: next.title, icon: next.icon, blocks: next.blocks, isFavorite: next.isFavorite });
        dirtyRef.current = false;
        setStatus('saved');
      } catch {
        setStatus('error'); // sessiz kayıp YOK — banner gösterilir, yerel kopya durur
      }
    };
    if (debounced) saveTimer.current = setTimeout(run, 600); else run();
  }, []);

  const flushNow = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const p = pageRef.current;
    if (p && dirtyRef.current) {
      savePage({ id: p.id, title: p.title, icon: p.icon, blocks: p.blocks, isFavorite: p.isFavorite })
        .then(() => { dirtyRef.current = false; }).catch(() => setStatus('error'));
    }
  }, []);

  const update = useCallback((mut: (p: OfficePage) => OfficePage, debounced = false) => {
    setPage(prev => {
      if (!prev) return prev;
      const next = mut(prev);
      persist(next, debounced);
      return next;
    });
  }, [persist]);

  // ── Başlık / ikon ──
  const setTitle = useCallback((title: string) => update(p => ({ ...p, title }), true), [update]);
  const setIcon = useCallback((icon: string) => { update(p => ({ ...p, icon }), false); setShowEmoji(false); }, [update]);

  // ── Blok mutasyonları (stabil callback'ler — BlockRow memo edilebilsin) ──
  const setBlockText = useCallback((blockId: string, text: string) => {
    // code dışı bloklarda '\n' = Enter → blok böl (Notion davranışı). Çoklu satır
    // (yapıştırma/IME) için HER satır ayrı blok olur; hiçbir blokta gömülü '\n' kalmaz.
    const cur = pageRef.current?.blocks.find(b => b.id === blockId);
    if (cur && !MULTILINE_TYPES.includes(cur.type) && text.indexOf('\n') >= 0) {
      const segs = text.split('\n');
      // boş liste maddesinde tek Enter (iki boş segment) → listeden çık (metne dönüştür)
      if (segs.length === 2 && segs[0] === '' && segs[1] === '' && (cur.type === 'bullet' || cur.type === 'numbered' || cur.type === 'todo')) {
        update(p => ({ ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, type: 'text', text: '' } : b) }), false);
        return;
      }
      const contType = continuationType(cur.type);
      const fresh = segs.slice(1).map(seg => newBlock(contType, seg));
      if (fresh.length) pendingFocus.current = fresh[fresh.length - 1].id;
      update(p => {
        const i = p.blocks.findIndex(b => b.id === blockId);
        if (i < 0) return p;
        const blocks = p.blocks.slice();
        blocks[i] = { ...blocks[i], text: segs[0] };
        blocks.splice(i + 1, 0, ...fresh);
        return { ...p, blocks };
      }, false);
      return;
    }
    update(p => ({ ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, text } : b) }), true);
  }, [update]);

  const onBlockBackspaceEmpty = useCallback((blockId: string) => {
    update(p => {
      const i = p.blocks.findIndex(b => b.id === blockId);
      if (i <= 0) return p; // ilk blok — bir şey yapma
      pendingFocus.current = p.blocks[i - 1].id;
      return { ...p, blocks: p.blocks.filter(b => b.id !== blockId) };
    }, false);
  }, [update]);

  const toggleCheck = useCallback((blockId: string) =>
    update(p => ({ ...p, blocks: p.blocks.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b) }), false), [update]);

  const changeType = useCallback((blockId: string | null, type: OfficeBlockType) => {
    if (blockId === null) {
      const fresh = newBlock(type);
      pendingFocus.current = fresh.id;
      update(p => ({ ...p, blocks: [...p.blocks, fresh] }), false);
    } else {
      update(p => ({
        ...p,
        blocks: p.blocks.map(b => b.id === blockId
          ? { ...b, type, text: b.text.replace(/^\/$/, ''), ...(type === 'todo' && b.checked === undefined ? { checked: false } : {}) }
          : b),
      }), false);
      pendingFocus.current = blockId;
    }
    setTypeMenuFor(null);
  }, [update]);

  const removeBlock = useCallback((blockId: string) =>
    update(p => ({ ...p, blocks: p.blocks.filter(b => b.id !== blockId) }), false), [update]);

  const moveBlock = useCallback((blockId: string, dir: -1 | 1) =>
    update(p => {
      const i = p.blocks.findIndex(b => b.id === blockId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.blocks.length) return p;
      const blocks = p.blocks.slice();
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...p, blocks };
    }, false), [update]);

  const openTypeMenu = useCallback((blockId: string) => setTypeMenuFor({ blockId }), []);
  const registerRef = useCallback((id: string, node: TextInput | null) => { inputRefs.current[id] = node; }, []);

  const addSubPage = async () => {
    if (!page) return;
    flushNow();
    const created = await savePage({ parentId: page.id, title: 'Adsız sayfa', icon: '📄', blocks: [newBlock('text', '')] });
    nav.push('OfficePage', { pageId: created.id });
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

  const numberFor = useMemo(() => {
    // numbered bloklara ardışık no ver (araya başka tip girince sıfırlanır)
    const map: Record<string, number> = {};
    let n = 0;
    page?.blocks.forEach(b => {
      if (b.type === 'numbered') { n += 1; map[b.id] = n; } else { n = 0; }
    });
    return map;
  }, [page?.blocks]);

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }
  if (!page) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><Text style={s.muted}>Sayfa bulunamadı.</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Üst çubuk: breadcrumb + kayıt durumu + favori + sil */}
        <View style={s.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={s.crumbs}>
            <TouchableOpacity onPress={() => { flushNow(); nav.navigate('OfficePages'); }}><Text style={s.crumbRoot}>Çalışma Alanı</Text></TouchableOpacity>
            {crumbs.map((c, i) => (
              <View key={c.id} style={s.crumbItem}>
                <Ionicons name="chevron-forward" size={12} color={colors.text.faint} />
                {i === crumbs.length - 1
                  ? <Text style={s.crumbCur} numberOfLines={1}>{c.icon} {c.title || 'Adsız'}</Text>
                  : <TouchableOpacity onPress={() => { flushNow(); nav.push('OfficePage', { pageId: c.id }); }}><Text style={s.crumb} numberOfLines={1}>{c.icon} {c.title || 'Adsız'}</Text></TouchableOpacity>}
              </View>
            ))}
          </ScrollView>
          <SaveDot status={status} />
          <TouchableOpacity onPress={() => update(p => ({ ...p, isFavorite: !p.isFavorite }), false)} hitSlop={HS} style={s.tBtn}>
            <Ionicons name={page.isFavorite ? 'star' : 'star-outline'} size={20} color={page.isFavorite ? '#f59e0b' : colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDeletePage} hitSlop={HS} style={s.tBtn}>
            <Ionicons name="trash-outline" size={19} color={colors.rose.default} />
          </TouchableOpacity>
        </View>

        {status === 'error' && (
          <TouchableOpacity style={s.errBanner} onPress={() => flushNow()} activeOpacity={0.85}>
            <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
            <Text style={s.errText}>Sunucuya kaydedilemedi (yerel kopya güvende). Tekrar denemek için dokun.</Text>
          </TouchableOpacity>
        )}
        {remoteChanged && (
          <TouchableOpacity style={s.remoteBanner} onPress={() => { setRemoteChanged(false); load(); }} activeOpacity={0.85}>
            <Ionicons name="sync-outline" size={16} color="#fff" />
            <Text style={s.errText}>Bu sayfa başka biri tarafından güncellendi. Yenilemek için dokun.</Text>
          </TouchableOpacity>
        )}

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Başlık + ikon */}
          <View style={s.titleRow}>
            <TouchableOpacity onPress={() => setShowEmoji(true)} style={s.iconBtn} hitSlop={HS}>
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
              number={numberFor[b.id]}
              onChangeText={setBlockText}
              onBackspaceEmpty={onBlockBackspaceEmpty}
              onToggleCheck={toggleCheck}
              onMenu={openTypeMenu}
              onSlash={openTypeMenu}
              onMove={moveBlock}
              onDelete={removeBlock}
              registerRef={registerRef}
            />
          ))}

          {/* Blok ekle */}
          <TouchableOpacity style={s.addBlock} onPress={() => changeType(null, 'text')} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={colors.text.muted} />
            <Text style={s.addBlockText}>Yazmaya başla ya da blok ekle</Text>
          </TouchableOpacity>

          {/* Alt sayfalar */}
          <View style={s.subHeader}>
            <Text style={s.subTitle}>Alt Sayfalar</Text>
            <TouchableOpacity onPress={addSubPage} hitSlop={HS}>
              <Ionicons name="add-circle-outline" size={22} color={brand.green} />
            </TouchableOpacity>
          </View>
          {subPages.length === 0 ? (
            <Text style={s.subEmpty}>Alt sayfa yok.</Text>
          ) : subPages.map(sp => (
            <TouchableOpacity key={sp.id} style={s.subRow} onPress={() => { flushNow(); nav.push('OfficePage', { pageId: sp.id }); }} activeOpacity={0.7}>
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
            <ScrollView style={{ maxHeight: 380 }}>
              {BLOCK_MENU.map(t => (
                <TouchableOpacity key={t} style={s.typeRow} onPress={() => changeType(typeMenuFor!.blockId, t)} activeOpacity={0.7}>
                  <View style={s.typeIcon}><Ionicons name={BLOCK_ICON[t] as any} size={18} color={colors.text.muted} /></View>
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

const HS = { top: 8, bottom: 8, left: 8, right: 8 };

function SaveDot({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'saving') return <ActivityIndicator size="small" color={colors.text.faint} style={{ marginHorizontal: 4 }} />;
  if (status === 'error') return <Ionicons name="alert-circle" size={16} color={colors.rose.default} style={{ marginHorizontal: 4 }} />;
  if (status === 'saved') return <Ionicons name="checkmark-circle" size={16} color={brand.green} style={{ marginHorizontal: 4 }} />;
  return <View style={{ width: 8 }} />;
}

const BlockRow = React.memo(function BlockRow({
  block, index, total, number, onChangeText, onBackspaceEmpty, onToggleCheck, onMenu, onSlash, onMove, onDelete, registerRef,
}: {
  block: OfficeBlock; index: number; total: number; number?: number;
  onChangeText: (id: string, t: string) => void;
  onBackspaceEmpty: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onMenu: (id: string) => void;
  onSlash: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  registerRef: (id: string, node: TextInput | null) => void;
}) {
  const [focused, setFocused] = useState(false);

  if (block.type === 'divider') {
    return (
      <View style={s.blockWrap}>
        <View style={s.dividerLine} />
        <TouchableOpacity onPress={() => onDelete(block.id)} hitSlop={HS} style={s.dividerDel}>
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

  return (
    <View style={[s.blockWrap, block.type === 'callout' && s.calloutWrap, block.type === 'quote' && s.quoteWrap]}>
      {block.type === 'todo' ? (
        <TouchableOpacity onPress={() => onToggleCheck(block.id)} hitSlop={HS} style={s.lead}>
          <Ionicons name={block.checked ? 'checkbox' : 'square-outline'} size={22} color={block.checked ? brand.green : colors.text.muted} />
        </TouchableOpacity>
      ) : block.type === 'bullet' ? (
        <View style={s.lead}><Text style={s.bulletDot}>•</Text></View>
      ) : block.type === 'numbered' ? (
        <View style={s.lead}><Text style={s.numDot}>{number ?? 1}.</Text></View>
      ) : block.type === 'callout' ? (
        <View style={s.lead}><Ionicons name="bulb" size={16} color="#f59e0b" /></View>
      ) : null}

      <TextInput
        ref={node => registerRef(block.id, node)}
        style={[inputStyle, { flex: 1 }]}
        value={block.text}
        onChangeText={t => onChangeText(block.id, t)}
        onKeyPress={e => { if (e.nativeEvent.key === 'Backspace' && block.text === '') onBackspaceEmpty(block.id); }}
        placeholder={focused || !block.text ? (block.text === '/' ? 'Tip seçin…' : "Yazın, '/' ile blok tipi") : ''}
        placeholderTextColor={colors.text.faint}
        multiline
        onFocus={() => { setFocused(true); if (block.text === '/') onSlash(block.id); }}
        onBlur={() => setFocused(false)}
      />

      {focused && (
        <View style={s.blockActions}>
          <TouchableOpacity onPress={() => onMenu(block.id)} hitSlop={HS}><Ionicons name="swap-vertical-outline" size={16} color={colors.text.faint} /></TouchableOpacity>
          {index > 0 && <TouchableOpacity onPress={() => onMove(block.id, -1)} hitSlop={HS}><Ionicons name="arrow-up" size={16} color={colors.text.faint} /></TouchableOpacity>}
          {index < total - 1 && <TouchableOpacity onPress={() => onMove(block.id, 1)} hitSlop={HS}><Ionicons name="arrow-down" size={16} color={colors.text.faint} /></TouchableOpacity>}
          <TouchableOpacity onPress={() => onDelete(block.id)} hitSlop={HS}><Ionicons name="trash-outline" size={15} color={colors.rose.default} /></TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.text.muted },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  tBtn: { padding: 4 },
  crumbs: { alignItems: 'center', gap: 2, paddingRight: 8 },
  crumbItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  crumbRoot: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  crumb: { color: colors.text.muted, fontSize: typography.xs, maxWidth: 120 },
  crumbCur: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', maxWidth: 160 },
  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.rose.default, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  remoteBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.blue.default, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errText: { color: '#fff', fontSize: typography.xs, fontWeight: '600', flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 160 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.md },
  iconBtn: { paddingTop: 2 },
  iconEmoji: { fontSize: 30 },
  titleInput: { flex: 1, color: colors.text.primary, fontSize: 26, fontWeight: '800', padding: 0, lineHeight: 32 },
  blockWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 5, minHeight: 38 },
  calloutWrap: { backgroundColor: 'rgba(251,191,36,0.10)', borderRadius: radius.sm, borderLeftWidth: 3, borderLeftColor: '#f59e0b', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, marginVertical: 2 },
  quoteWrap: { borderLeftWidth: 3, borderLeftColor: colors.border.secondary, paddingLeft: spacing.sm, marginVertical: 2 },
  lead: { paddingTop: 8, minWidth: 24, alignItems: 'center' },
  bulletDot: { color: colors.text.primary, fontSize: 18, lineHeight: 24 },
  numDot: { color: colors.text.muted, fontSize: typography.base, lineHeight: 24, fontWeight: '600' },
  blockInput: { color: colors.text.primary, fontSize: typography.base, lineHeight: 23, paddingVertical: 5, paddingHorizontal: 0 },
  h1: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  h2: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  quote: { fontStyle: 'italic', color: colors.text.secondary },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: typography.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  todoDone: { textDecorationLine: 'line-through', color: colors.text.faint },
  blockActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingLeft: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.secondary, marginVertical: 12 },
  dividerDel: { paddingTop: 8, paddingLeft: 6 },
  addBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14, marginTop: 4, opacity: 0.8 },
  addBlockText: { color: colors.text.muted, fontSize: typography.base },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.primary, paddingTop: spacing.md },
  subTitle: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  subEmpty: { color: colors.text.faint, fontSize: typography.sm },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, marginBottom: 6 },
  subRowTitle: { flex: 1, color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  emojiSheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiCell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.bg.secondary },
  emojiCellText: { fontSize: 24 },
  typeSheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  typeIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
});

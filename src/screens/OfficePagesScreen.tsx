// OfficePagesScreen — Notion benzeri çalışma alanı: iç içe sayfa ağacı.
// Favoriler bölümü + genişleyebilir ağaç. Sayfa oluştur / favori / sil.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList, OfficePage } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { listPages, savePage, deletePage, toggleFavorite, childrenOf } from '../services/officeWorkspace';
import EmptyState from '../components/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function OfficePagesScreen() {
  const nav = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const { showToast } = useAppContext();
  const [pages, setPages] = useState<OfficePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPages(await listPages());
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createPage = async (parentId: string | null) => {
    if (busy) return;
    setBusy(true);
    try {
      const created = await savePage({
        parentId,
        title: 'Adsız sayfa',
        icon: '📄',
        blocks: [],
        createdBy: user?.id,
        createdByName: profile?.full_name ?? undefined,
      });
      if (parentId) setExpanded(prev => new Set(prev).add(parentId));
      await refresh();
      nav.navigate('OfficePage', { pageId: created.id });
    } catch (e: any) {
      Alert.alert('Sayfa oluşturulamadı', e?.message || 'Hata');
    } finally {
      setBusy(false);
    }
  };

  const onLongPress = (p: OfficePage) => {
    Alert.alert(p.title || 'Sayfa', undefined, [
      { text: p.isFavorite ? 'Favoriden çıkar' : 'Favorile', onPress: async () => { await toggleFavorite(p.id); refresh(); } },
      { text: 'Alt sayfa ekle', onPress: () => createPage(p.id) },
      {
        text: 'Sil', style: 'destructive', onPress: () => {
          Alert.alert('Sayfayı sil', 'Bu sayfa ve tüm alt sayfaları silinecek. Emin misiniz?', [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Sil', style: 'destructive', onPress: async () => {
                try { await deletePage(p.id); showToast('Sayfa silindi'); refresh(); }
                catch (e: any) { Alert.alert('Silinemedi', e?.message || 'Hata'); }
              },
            },
          ]);
        },
      },
      { text: 'Kapat', style: 'cancel' },
    ]);
  };

  const favorites = pages.filter(p => p.isFavorite && !p.archived);
  const roots = childrenOf(pages, null);

  const renderNode = (p: OfficePage, depth: number): React.ReactNode => {
    const kids = childrenOf(pages, p.id);
    const isOpen = expanded.has(p.id);
    return (
      <View key={p.id}>
        <TouchableOpacity
          style={[s.row, { paddingLeft: spacing.md + depth * 18 }]}
          onPress={() => nav.navigate('OfficePage', { pageId: p.id })}
          onLongPress={() => onLongPress(p)}
          activeOpacity={0.7}
        >
          <TouchableOpacity
            onPress={() => kids.length > 0 && toggleExpand(p.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.caret}
          >
            <Ionicons
              name={kids.length === 0 ? 'ellipse' : isOpen ? 'chevron-down' : 'chevron-forward'}
              size={kids.length === 0 ? 5 : 14}
              color={colors.text.faint}
            />
          </TouchableOpacity>
          <Text style={s.emoji}>{p.icon}</Text>
          <Text style={s.title} numberOfLines={1}>{p.title || 'Adsız sayfa'}</Text>
          {p.isFavorite && <Ionicons name="star" size={13} color="#f59e0b" />}
          {kids.length > 0 && <Text style={s.count}>{kids.length}</Text>}
          <TouchableOpacity onPress={() => createPage(p.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="add" size={18} color={colors.text.faint} />
          </TouchableOpacity>
        </TouchableOpacity>
        {isOpen && kids.map(k => renderNode(k, depth + 1))}
      </View>
    );
  };

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
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
          <EmptyState icon="documents-outline" title="Henüz sayfa yok" description="İlk çalışma sayfanızı oluşturun — notlar, kontrol listeleri, prosedürler." />
        ) : (
          <View style={s.card}>{roots.map(p => renderNode(p, 0))}</View>
        )}

        <TouchableOpacity style={s.newBtn} onPress={() => createPage(null)} activeOpacity={0.85} disabled={busy}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={s.newBtnText}>Yeni Sayfa</Text>
        </TouchableOpacity>
        <Text style={s.hint}>İpucu: bir sayfaya uzun basınca favorile / alt sayfa ekle / sil seçenekleri açılır.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 90, gap: spacing.sm },
  sectionLabel: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: spacing.md, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.primary },
  caret: { width: 16, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 17 },
  title: { flex: 1, color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  count: { color: colors.text.faint, fontSize: typography.xs, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: brand.green, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  hint: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.sm },
});

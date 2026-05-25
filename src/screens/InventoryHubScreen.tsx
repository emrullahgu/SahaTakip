// InventoryHubScreen — POZ-DEV-241 Ürün Takip merkez
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { listProductItems } from '../services/productItems';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function InventoryHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;
  const [c, setC] = useState({ total: 0, stock: 0, inuse: 0, maint: 0 });
  const refresh = useCallback(async () => {
    const all = await listProductItems();
    setC({
      total: all.length,
      stock: all.filter(p => p.status === 'in_stock').length,
      inuse: all.filter(p => p.status === 'in_use').length,
      maint: all.filter(p => p.status === 'maintenance').length,
    });
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const TILES = [
    { key: 'ProductCatalog',  label: 'Ürün Kataloğu',  desc: '16K+ ürün · marka · kategori', icon: 'library-outline' as const,    color: '#10b981', poz: 'POZ-CAT-001' },
    { key: 'ProductItems',    label: 'Ürün Listesi',  desc: 'Seri no + lokasyon',     icon: 'cube-outline' as const,        color: '#0ea5e9', poz: 'POZ-DEV-242' },
    { key: 'ProductItemForm', label: 'Yeni Ürün',     desc: 'Envantere ürün ekle',    icon: 'add-circle-outline' as const,  color: '#22c55e', poz: 'POZ-DEV-243' },
    { key: 'Stock',           label: 'Klasik Stok',   desc: 'Malzeme stoğu',          icon: 'layers-outline' as const,      color: '#8b5cf6', poz: 'POZ-DEV-156' },
    { key: 'BarcodeScan',     label: 'Barkod Tarat',  desc: 'Hızlı arama / sayım',    icon: 'barcode-outline' as const,     color: '#f59e0b', poz: 'POZ-DEV-159' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="cube-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Ürün Takip</Text>
            <Text style={s.heroS}>Envanter · Seri no · Lokasyon</Text>
          </View>
        </View>
        <View style={s.statusRow}>
          <Pill label={`Toplam: ${c.total}`} color="#64748b" icon="layers-outline" />
          <Pill label={`Depoda: ${c.stock}`} color="#22c55e" icon="archive-outline" />
          <Pill label={`Kullanımda: ${c.inuse}`} color="#0ea5e9" icon="hammer-outline" />
          <Pill label={`Bakımda: ${c.maint}`} color={c.maint > 0 ? '#a855f7' : '#64748b'} icon="construct-outline" />
        </View>
        <View style={[s.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key} style={[s.tile, { width: tileWidth }]} onPress={() => nav.navigate(t.key as never)} activeOpacity={0.85}>
              <View style={[s.tileIcon, { backgroundColor: t.color }]}><Ionicons name={t.icon} size={22} color="#fff" /></View>
              <Text style={s.tileLabel}>{t.label}</Text>
              <Text style={s.tileDesc}>{t.desc}</Text>
              <Text style={s.tilePoz}>{t.poz}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[s.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[s.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroS: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});

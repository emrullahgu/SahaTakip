// ProductItemDetailScreen — POZ-DEV-244 Ürün detay
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, ProductItem } from '../types';
import { getProductItem, deleteProductItem, PRODUCT_ITEM_STATUS_LABEL, PRODUCT_ITEM_STATUS_COLOR } from '../services/productItems';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ProductItemDetail'>;

export default function ProductItemDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const id = route.params.itemId;
  const [item, setItem] = useState<ProductItem | null>(null);

  useEffect(() => { (async () => { setItem((await getProductItem(id)) || null); })(); }, [id]);

  if (!item) return <SafeAreaView style={s.safe}><Text style={s.empty}>Ürün bulunamadı</Text></SafeAreaView>;
  const color = PRODUCT_ITEM_STATUS_COLOR[item.status];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: color }]}>
          <View style={s.heroIcon}><Ionicons name="cube-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>{item.name}</Text>
            <Text style={s.heroS}>{item.code} · {PRODUCT_ITEM_STATUS_LABEL[item.status]}</Text>
          </View>
        </View>

        <Info label="Kategori" value={item.category} />
        <Info label="Üretici" value={item.manufacturer} />
        <Info label="Model" value={item.model} />
        <Info label="Seri No" value={item.serialNo} />
        <Info label="Lokasyon" value={item.location} />
        <Info label="Atanan" value={item.assignedTo} />
        <Info label="Alış Fiyatı" value={item.purchasePrice ? `₺${item.purchasePrice.toLocaleString('tr-TR')}` : undefined} />
        <Info label="Alış Tarihi" value={item.purchaseDate} />
        <Info label="Garanti Sonu" value={item.warrantyEnd} />
        <Info label="Not" value={item.notes} />
        <Info label="Eklendi" value={item.createdAt.slice(0, 10)} />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0ea5e9', flex: 1 }]} onPress={() => nav.navigate('ProductItemForm', { itemId: item.id })}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={s.btnText}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={() => Alert.alert('Sil', 'Ürün silinsin mi?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: async () => { await deleteProductItem(item.id); nav.goBack(); } },
          ])}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={s.btnText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null;
  return (<View style={s.infoRow}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoVal}>{value}</Text></View>);
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.xl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroS: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm },
  infoLabel: { color: colors.text.muted, fontSize: typography.xs },
  infoVal: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.md },
  btnText: { color: '#fff', fontWeight: '800' },
});

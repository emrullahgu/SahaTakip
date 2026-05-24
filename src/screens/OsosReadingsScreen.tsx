// OsosReadingsScreen — POZ-DEV-247 OSOS sayaç okuma listesi + inline ekleme
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, OsosReading } from '../types';
import { listReadings, addReading, deleteReading } from '../services/osos';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'OsosReadings'>;

export default function OsosReadingsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [items, setItems] = useState<OsosReading[]>([]);
  const [meterNo, setMN] = useState('');
  const [actImp, setImp] = useState('');
  const [actExp, setExp] = useState('');
  const [peak, setPeak] = useState('');
  const refresh = useCallback(async () => {
    let xs = await listReadings();
    if (route.params?.customerId) xs = xs.filter(x => x.customerId === route.params!.customerId);
    setItems(xs);
  }, [route.params?.customerId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onAdd = async () => {
    if (!meterNo.trim() || !actImp.trim()) return Alert.alert('Eksik', 'Sayaç no ve aktif çekiş girin');
    await addReading({
      meterNo: meterNo.trim(),
      customerId: route.params?.customerId,
      readingAt: new Date().toISOString(),
      activeImportKwh: Number(actImp) || 0,
      activeExportKwh: actExp ? Number(actExp) : 0,
      reactiveImportKvarh: 0,
      reactiveExportKvarh: 0,
      demandKw: peak ? Number(peak) : undefined,
      source: 'manual',
    });
    setMN(''); setImp(''); setExp(''); setPeak('');
    refresh();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.formCard}>
          <Text style={s.formTitle}>Hızlı Ekle</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TextInput style={[s.input, { flex: 2 }]} value={meterNo} onChangeText={setMN} placeholder="Sayaç No" placeholderTextColor={colors.text.faint} />
            <TextInput style={[s.input, { flex: 1 }]} value={actImp} onChangeText={setImp} placeholder="Çekiş kWh" placeholderTextColor={colors.text.faint} keyboardType="numeric" />
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TextInput style={[s.input, { flex: 1 }]} value={actExp} onChangeText={setExp} placeholder="Veriş kWh" placeholderTextColor={colors.text.faint} keyboardType="numeric" />
            <TextInput style={[s.input, { flex: 1 }]} value={peak} onChangeText={setPeak} placeholder="Demand kW" placeholderTextColor={colors.text.faint} keyboardType="numeric" />
          </View>
          <TouchableOpacity style={s.addBtn} onPress={onAdd}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnText}>Ekle</Text>
          </TouchableOpacity>
        </View>

        <View style={s.headerRow}>
          <Text style={s.title}>Okumalar ({items.length})</Text>
          <TouchableOpacity onPress={() => nav.navigate('OsosImport')}>
            <Text style={s.linkText}>CSV İçe Aktar →</Text>
          </TouchableOpacity>
        </View>
        {items.length === 0 && <Text style={s.empty}>Okuma yok</Text>}
        {items.map(r => (
          <View key={r.id} style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{r.meterNo}</Text>
              <Text style={s.cardMeta}>{new Date(r.readingAt).toLocaleString('tr-TR')}</Text>
              <Text style={s.cardMeta}>Çekiş: {r.activeImportKwh.toLocaleString('tr-TR')} kWh {r.activeExportKwh ? ` · Veriş: ${r.activeExportKwh.toLocaleString('tr-TR')} kWh` : ''}</Text>
              {r.demandKw != null && <Text style={s.cardMeta}>Demand: {r.demandKw} kW</Text>}
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Sil', 'Okuma silinsin mi?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: async () => { await deleteReading(r.id); refresh(); } },
            ])} style={s.delBtn}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  formCard: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, gap: 8, marginBottom: spacing.md },
  formTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  input: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, color: colors.text.primary, fontSize: typography.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#eab308', paddingVertical: 10, borderRadius: radius.sm },
  addBtnText: { color: '#fff', fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  linkText: { color: '#eab308', fontWeight: '700', fontSize: typography.xs },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  delBtn: { padding: 8, borderRadius: radius.sm, backgroundColor: '#ef444422' },
});

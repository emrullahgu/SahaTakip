// Faz 43 — HvTransformerQuoteScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { calculateHvTransformer, saveHv, listHv } from '../services/smartQuote';
import type { HvTransformerQuoteInput } from '../types';

const REGIONS: HvTransformerQuoteInput['region'][] = ['Marmara', 'Ege', 'İç Anadolu', 'Akdeniz', 'Karadeniz', 'Doğu Anadolu', 'GD Anadolu'];

export default function HvTransformerQuoteScreen() {
  const [cust, setCust] = useState('');
  const [kva, setKva] = useState('1250');
  const [count, setCount] = useState('1');
  const [region, setRegion] = useState<HvTransformerQuoteInput['region']>('Marmara');
  const [has24h7, setHas24h7] = useState(false);
  const [result, setResult] = useState<HvTransformerQuoteInput | null>(null);
  const [history, setHistory] = useState<HvTransformerQuoteInput[]>([]);
  const load = useCallback(async () => { setHistory(await listHv()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onCalc = () => {
    if (!cust.trim()) { Alert.alert('Eksik', 'Müşteri adı girin.'); return; }
    setResult(calculateHvTransformer(cust, Number(kva) || 0, Number(count) || 1, region, has24h7));
  };
  const onSave = async () => { if (result) { await saveHv(result); Alert.alert('Kaydedildi'); load(); } };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        ListHeaderComponent={
          <View style={{ gap: spacing.sm }}>
            <View style={s.card}>
              <Text style={s.h}>YG Trafo İşletme Sorumluluğu</Text>
              <TextInput style={s.input} value={cust} onChangeText={setCust} placeholder="Müşteri" placeholderTextColor={colors.text.faint} />
              <View style={s.row}>
                <View style={{ flex: 1 }}><Text style={s.lbl}>kVA</Text><TextInput style={s.input} value={kva} onChangeText={setKva} keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Text style={s.lbl}>Adet</Text><TextInput style={s.input} value={count} onChangeText={setCount} keyboardType="numeric" /></View>
              </View>
              <Text style={s.lbl}>Bölge</Text>
              <View style={s.regRow}>
                {REGIONS.map(r => (
                  <TouchableOpacity key={r} style={[s.regBtn, region === r && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]} onPress={() => setRegion(r)}>
                    <Text style={[s.regT, region === r && { color: '#fff' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.switchRow}>
                <Text style={s.lbl}>7/24 Müdahale</Text>
                <Switch value={has24h7} onValueChange={setHas24h7} />
              </View>
              <TouchableOpacity style={s.calcBtn} onPress={onCalc}>
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={s.calcBtnT}>Hesapla</Text>
              </TouchableOpacity>
            </View>
            {result && (
              <View style={s.card}>
                <Text style={s.h}>Sonuç</Text>
                <Text style={s.r1}>Aylık: ₺{result.monthlyFee.toLocaleString('tr-TR')}</Text>
                <Text style={s.r2}>Yıllık: ₺{result.yearlyFee.toLocaleString('tr-TR')}</Text>
                <TouchableOpacity style={s.save} onPress={onSave}><Text style={s.saveT}>Kaydet</Text></TouchableOpacity>
              </View>
            )}
            {history.length > 0 && <Text style={s.histH}>Geçmiş</Text>}
          </View>
        }
        data={history}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={s.histCard}>
            <Text style={s.histN}>{item.customerName}</Text>
            <Text style={s.histD}>{item.transformerKva}kVA × {item.count} · {item.region} {item.has24h7 ? '· 7/24' : ''}</Text>
            <Text style={s.histT}>₺{item.monthlyFee.toLocaleString('tr-TR')}/ay</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  h: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', gap: spacing.sm },
  regRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  regBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  regT: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, backgroundColor: '#ef4444', borderRadius: radius.sm },
  calcBtnT: { color: '#fff', fontWeight: '800' },
  r1: { color: '#22c55e', fontSize: typography.xl, fontWeight: '800' },
  r2: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  save: { padding: spacing.sm, backgroundColor: '#0ea5e9', borderRadius: radius.sm, alignItems: 'center' },
  saveT: { color: '#fff', fontWeight: '700' },
  histH: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.sm },
  histCard: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  histN: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  histD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  histT: { color: '#22c55e', fontSize: typography.sm, fontWeight: '800', marginTop: 2 },
});

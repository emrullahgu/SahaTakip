// Faz 43 — PeriodicCheckQuoteScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { calculatePeriodicCheck, savePc, listPc } from '../services/smartQuote';
import type { PeriodicCheckQuoteInput } from '../types';

export default function PeriodicCheckQuoteScreen() {
  const [cust, setCust] = useState('');
  const [p, setP] = useState('3');
  const [m, setM] = useState('10');
  const [g, setG] = useState('5');
  const [result, setResult] = useState<PeriodicCheckQuoteInput | null>(null);
  const [history, setHistory] = useState<PeriodicCheckQuoteInput[]>([]);
  const load = useCallback(async () => { setHistory(await listPc()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onCalc = () => {
    if (!cust.trim()) { Alert.alert('Eksik', 'Müşteri girin.'); return; }
    setResult(calculatePeriodicCheck(cust, Number(p) || 0, Number(m) || 0, Number(g) || 0));
  };
  const onSave = async () => { if (result) { await savePc(result); Alert.alert('Kaydedildi'); load(); } };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        ListHeaderComponent={
          <View style={{ gap: spacing.sm }}>
            <View style={s.card}>
              <Text style={s.h}>Periyodik Kontrol Teklif</Text>
              <TextInput style={s.input} value={cust} onChangeText={setCust} placeholder="Müşteri" placeholderTextColor={colors.text.faint} />
              <Text style={s.lbl}>Pano Sayısı</Text>
              <TextInput style={s.input} value={p} onChangeText={setP} keyboardType="numeric" />
              <Text style={s.lbl}>Ölçüm Noktası</Text>
              <TextInput style={s.input} value={m} onChangeText={setM} keyboardType="numeric" />
              <Text style={s.lbl}>Topraklama Noktası</Text>
              <TextInput style={s.input} value={g} onChangeText={setG} keyboardType="numeric" />
              <TouchableOpacity style={s.calcBtn} onPress={onCalc}>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={s.calcBtnT}>Hesapla</Text>
              </TouchableOpacity>
            </View>
            {result && (
              <View style={s.card}>
                <Text style={s.h}>Sonuç</Text>
                <Text style={s.r1}>Toplam: ₺{result.totalPrice.toLocaleString('tr-TR')}</Text>
                <Text style={s.r2}>Baz: ₺{result.basePrice.toLocaleString('tr-TR')} · {result.panelCount} pano · {result.measurementCount} ölçüm · {result.groundCount} topraklama</Text>
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
            <Text style={s.histD}>{item.panelCount}P · {item.measurementCount}Ö · {item.groundCount}T</Text>
            <Text style={s.histT}>₺{item.totalPrice.toLocaleString('tr-TR')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  h: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, backgroundColor: '#06b6d4', borderRadius: radius.sm },
  calcBtnT: { color: '#fff', fontWeight: '800' },
  r1: { color: '#22c55e', fontSize: typography.xl, fontWeight: '800' },
  r2: { color: colors.text.muted, fontSize: typography.xs },
  save: { padding: spacing.sm, backgroundColor: '#0ea5e9', borderRadius: radius.sm, alignItems: 'center' },
  saveT: { color: '#fff', fontWeight: '700' },
  histH: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.sm },
  histCard: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  histN: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  histD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  histT: { color: '#22c55e', fontSize: typography.sm, fontWeight: '800', marginTop: 2 },
});

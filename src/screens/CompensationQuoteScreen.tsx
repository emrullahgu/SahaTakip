// Faz 43 — CompensationQuoteScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { calculateCompensation, saveComp, listComp } from '../services/smartQuote';
import type { CompensationQuoteInput } from '../types';

export default function CompensationQuoteScreen() {
  const [cust, setCust] = useState('');
  const [kvar, setKvar] = useState('150');
  const [price, setPrice] = useState('850');
  const [result, setResult] = useState<CompensationQuoteInput | null>(null);
  const [history, setHistory] = useState<CompensationQuoteInput[]>([]);
  const load = useCallback(async () => { setHistory(await listComp()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onCalc = () => {
    if (!cust.trim()) { Alert.alert('Eksik', 'Müşteri girin.'); return; }
    setResult(calculateCompensation(cust, Number(kvar) || 0, Number(price) || 850));
  };
  const onSave = async () => { if (result) { await saveComp(result); Alert.alert('Kaydedildi'); load(); } };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        ListHeaderComponent={
          <View style={{ gap: spacing.sm }}>
            <View style={s.card}>
              <Text style={s.h}>Kompanzasyon Pano Teklif</Text>
              <TextInput style={s.input} value={cust} onChangeText={setCust} placeholder="Müşteri" placeholderTextColor={colors.text.faint} />
              <Text style={s.lbl}>Reaktif Güç (kVAr)</Text>
              <TextInput style={s.input} value={kvar} onChangeText={setKvar} keyboardType="numeric" />
              <Text style={s.lbl}>kVAr başına fiyat (₺)</Text>
              <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
              <TouchableOpacity style={s.calcBtn} onPress={onCalc}>
                <Ionicons name="pulse" size={20} color="#fff" />
                <Text style={s.calcBtnT}>Hesapla</Text>
              </TouchableOpacity>
            </View>
            {result && (
              <View style={s.card}>
                <Text style={s.h}>Sonuç</Text>
                <Text style={s.r1}>₺{result.totalPrice.toLocaleString('tr-TR')}</Text>
                <Text style={s.r2}>{result.reactivePowerKvar} kVAr · {result.panelCount} pano</Text>
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
            <Text style={s.histD}>{item.reactivePowerKvar} kVAr · {item.panelCount} pano</Text>
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
  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, backgroundColor: '#a855f7', borderRadius: radius.sm },
  calcBtnT: { color: '#fff', fontWeight: '800' },
  r1: { color: '#a855f7', fontSize: typography.xxl, fontWeight: '800' },
  r2: { color: colors.text.muted, fontSize: typography.xs },
  save: { padding: spacing.sm, backgroundColor: '#0ea5e9', borderRadius: radius.sm, alignItems: 'center' },
  saveT: { color: '#fff', fontWeight: '700' },
  histH: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.sm },
  histCard: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  histN: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  histD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  histT: { color: '#a855f7', fontSize: typography.sm, fontWeight: '800', marginTop: 2 },
});

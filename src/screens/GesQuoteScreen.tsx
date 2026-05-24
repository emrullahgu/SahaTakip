// Faz 43 — GesQuoteScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { calculateGes, saveGes, listGes } from '../services/smartQuote';
import type { SqGesQuoteInput } from '../types';

export default function GesQuoteScreen() {
  const [cust, setCust] = useState('');
  const [cap, setCap] = useState('100');
  const [price, setPrice] = useState('22000');
  const [result, setResult] = useState<SqGesQuoteInput | null>(null);
  const [history, setHistory] = useState<SqGesQuoteInput[]>([]);
  const load = useCallback(async () => { setHistory(await listGes()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onCalc = () => {
    if (!cust.trim()) { Alert.alert('Eksik', 'Müşteri girin.'); return; }
    setResult(calculateGes(cust, Number(cap) || 0, Number(price) || 22000));
  };
  const onSave = async () => { if (result) { await saveGes(result); Alert.alert('Kaydedildi'); load(); } };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        ListHeaderComponent={
          <View style={{ gap: spacing.sm }}>
            <View style={s.card}>
              <Text style={s.h}>GES Teklif Motoru</Text>
              <TextInput style={s.input} value={cust} onChangeText={setCust} placeholder="Müşteri" placeholderTextColor={colors.text.faint} />
              <Text style={s.lbl}>Kapasite (kWp)</Text>
              <TextInput style={s.input} value={cap} onChangeText={setCap} keyboardType="numeric" />
              <Text style={s.lbl}>kWp başına fiyat (₺)</Text>
              <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
              <TouchableOpacity style={s.calcBtn} onPress={onCalc}>
                <Ionicons name="sunny" size={20} color="#fff" />
                <Text style={s.calcBtnT}>Hesapla</Text>
              </TouchableOpacity>
            </View>
            {result && (
              <View style={s.card}>
                <Text style={s.h}>Sonuç</Text>
                <Text style={s.r1}>₺{result.totalPrice.toLocaleString('tr-TR')}</Text>
                <Text style={s.r2}>{result.capacityKwp} kWp · {result.installationDays} gün kurulum</Text>
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
            <Text style={s.histD}>{item.capacityKwp} kWp · {item.installationDays} gün</Text>
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
  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, backgroundColor: '#eab308', borderRadius: radius.sm },
  calcBtnT: { color: '#fff', fontWeight: '800' },
  r1: { color: '#eab308', fontSize: typography.xxl, fontWeight: '800' },
  r2: { color: colors.text.muted, fontSize: typography.xs },
  save: { padding: spacing.sm, backgroundColor: '#0ea5e9', borderRadius: radius.sm, alignItems: 'center' },
  saveT: { color: '#fff', fontWeight: '700' },
  histH: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginTop: spacing.sm },
  histCard: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  histN: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  histD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  histT: { color: '#eab308', fontSize: typography.sm, fontWeight: '800', marginTop: 2 },
});

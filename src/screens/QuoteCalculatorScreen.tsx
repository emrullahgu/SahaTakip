// Faz 43 — QuoteCalculatorScreen
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme';
import { calculate, saveCalc } from '../services/smartQuote';
import type { QuoteCalculation } from '../types';

function Field({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.lbl}>{label}</Text>
      <View style={s.inputBox}>
        <TextInput style={s.input} value={value} onChangeText={onChange} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.text.faint} />
        {suffix && <Text style={s.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

export default function QuoteCalculatorScreen() {
  const [base, setBase] = useState('100000');
  const [labor, setLabor] = useState('25000');
  const [material, setMaterial] = useState('45000');
  const [overhead, setOverhead] = useState('15');
  const [risk, setRisk] = useState('5');
  const [profit, setProfit] = useState('20');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('20');
  const [result, setResult] = useState<QuoteCalculation | null>(null);

  const onCalc = () => {
    const r = calculate(Number(base) || 0, Number(labor) || 0, Number(material) || 0, Number(overhead) || 0, Number(risk) || 0, Number(profit) || 0, Number(discount) || 0, Number(tax) || 0);
    setResult(r);
  };
  const onSave = async () => {
    if (!result) return;
    await saveCalc(result);
    Alert.alert('Kaydedildi', 'Hesap geçmişe eklendi.');
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 60 }}>
        <View style={s.card}>
          <Field label="Temel Ürün/Hizmet Bedeli" value={base} onChange={setBase} suffix="₺" />
          <Field label="İşçilik" value={labor} onChange={setLabor} suffix="₺" />
          <Field label="Malzeme" value={material} onChange={setMaterial} suffix="₺" />
        </View>
        <View style={s.card}>
          <Field label="Genel Gider" value={overhead} onChange={setOverhead} suffix="%" />
          <Field label="Risk Payı" value={risk} onChange={setRisk} suffix="%" />
          <Field label="Kâr Oranı" value={profit} onChange={setProfit} suffix="%" />
          <Field label="İskonto" value={discount} onChange={setDiscount} suffix="%" />
          <Field label="KDV" value={tax} onChange={setTax} suffix="%" />
        </View>
        <TouchableOpacity style={s.calcBtn} onPress={onCalc}>
          <Ionicons name="calculator" size={22} color="#fff" />
          <Text style={s.calcBtnT}>Hesapla</Text>
        </TouchableOpacity>
        {result && (
          <View style={s.result}>
            <Text style={s.resH}>Sonuç</Text>
            <Row label="Ara Toplam" v={result.subTotal} />
            <Row label="KDV Dahil" v={result.totalWithTax} hi />
            <TouchableOpacity style={s.save} onPress={onSave}>
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={s.saveT}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, v, hi }: { label: string; v: number; hi?: boolean }) {
  return (
    <View style={s.rRow}>
      <Text style={s.rLbl}>{label}</Text>
      <Text style={[s.rVal, hi && { color: '#22c55e', fontSize: typography.xl }]}>₺{v.toLocaleString('tr-TR')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  field: { gap: 4 },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.primary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, paddingHorizontal: spacing.sm },
  input: { flex: 1, color: colors.text.primary, paddingVertical: spacing.sm },
  suffix: { color: colors.text.muted, fontSize: typography.sm },
  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, backgroundColor: '#f59e0b', borderRadius: radius.md },
  calcBtnT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  result: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  resH: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  rRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rLbl: { color: colors.text.muted, fontSize: typography.sm },
  rVal: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, backgroundColor: '#0ea5e9', borderRadius: radius.sm, marginTop: 6 },
  saveT: { color: '#fff', fontWeight: '700' },
});

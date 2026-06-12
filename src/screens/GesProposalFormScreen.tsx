// GesProposalFormScreen — POZ-DEV-227 GES teklif formu
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, GesQuoteInput, GesType } from '../types';
import { useAppContext } from '../context/AppContext';
import CustomerPicker from '../components/CustomerPicker';
import { calcGesQuote, getGesQuote, saveGesQuote, GES_TYPE_LABEL } from '../services/gesProposals';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'GesProposalForm'>;
const TYPES: GesType[] = ['rooftop', 'ground', 'carport'];

export default function GesProposalFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { customers } = useAppContext();
  const editingId = route.params?.quoteId;

  const [customerId, setCustomerId] = useState<string | undefined>(route.params?.customerId);
  const [customerName, setCustomerName] = useState('');
  const [type, setType] = useState<GesType>('rooftop');
  const [capacityKwp, setCap] = useState('100');
  const [panelCount, setPC] = useState('182');
  const [panelWatt, setPW] = useState('550');
  const [inverterKw, setIKw] = useState('100');
  const [inverterCount, setIC] = useState('1');
  const [structurePerKwp, setSPK] = useState('800');
  const [cablingPerKwp, setCPK] = useState('400');
  const [laborPerKwp, setLPK] = useState('1500');
  const [logisticsKm, setKm] = useState('100');
  const [marginPct, setMP] = useState('15');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      const q = await getGesQuote(editingId);
      if (!q) return;
      setCustomerId(q.customerId); setCustomerName(q.customerName);
      setType(q.input.type);
      setCap(String(q.input.capacityKwp)); setPC(String(q.input.panelCount)); setPW(String(q.input.panelWatt));
      setIKw(String(q.input.inverterKw)); setIC(String(q.input.inverterCount));
      setSPK(String(q.input.structurePerKwp)); setCPK(String(q.input.cablingPerKwp)); setLPK(String(q.input.laborPerKwp));
      setKm(String(q.input.logisticsKm)); setMP(String(q.input.marginPct));
      setNotes(q.notes || '');
    })();
  }, [editingId]);

  const input: GesQuoteInput = useMemo(() => ({
    type,
    capacityKwp: Number(capacityKwp) || 0,
    panelCount: Number(panelCount) || 0,
    panelWatt: Number(panelWatt) || 0,
    inverterKw: Number(inverterKw) || 0,
    inverterCount: Number(inverterCount) || 0,
    structurePerKwp: Number(structurePerKwp) || 0,
    cablingPerKwp: Number(cablingPerKwp) || 0,
    laborPerKwp: Number(laborPerKwp) || 0,
    logisticsKm: Number(logisticsKm) || 0,
    marginPct: Number(marginPct) || 0,
  }), [type, capacityKwp, panelCount, panelWatt, inverterKw, inverterCount, structurePerKwp, cablingPerKwp, laborPerKwp, logisticsKm, marginPct]);
  const calc = useMemo(() => calcGesQuote(input), [input]);

  const onSave = async () => {
    if (!customerName.trim()) return Alert.alert('Eksik', 'Müşteri adı girin');
    await saveGesQuote({ id: editingId, customerId, customerName: customerName.trim(), input, ...calc, notes: notes.trim() || undefined });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content}>
        <Section title="Müşteri">
          <TextInput style={s.input} value={customerName} onChangeText={setCustomerName} placeholder="Müşteri adı" placeholderTextColor={colors.text.faint} />
          <CustomerPicker
            customers={customers}
            selectedId={customerId}
            onSelect={c => { setCustomerId(c?.id); if (c) setCustomerName(c.shortName); }}
          />
        </Section>

        <Section title="GES Tipi">
          <View style={s.chips}>
            {TYPES.map(t => (
              <TouchableOpacity key={t} style={[s.chip, type === t && s.chipActive]} onPress={() => setType(t)}>
                <Text style={[s.chipText, type === t && { color: '#fff' }]}>{GES_TYPE_LABEL[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Kapasite">
          <Row>
            <Field label="Kurulu güç (kWp)"><TextInput style={s.input} value={capacityKwp} onChangeText={setCap} keyboardType="numeric" /></Field>
          </Row>
          <Row>
            <Field label="Panel adet"><TextInput style={s.input} value={panelCount} onChangeText={setPC} keyboardType="numeric" /></Field>
            <Field label="Panel (W)"><TextInput style={s.input} value={panelWatt} onChangeText={setPW} keyboardType="numeric" /></Field>
          </Row>
          <Row>
            <Field label="İnverter (kW)"><TextInput style={s.input} value={inverterKw} onChangeText={setIKw} keyboardType="numeric" /></Field>
            <Field label="İnverter adet"><TextInput style={s.input} value={inverterCount} onChangeText={setIC} keyboardType="numeric" /></Field>
          </Row>
        </Section>

        <Section title="Birim Maliyetler (₺/kWp)">
          <Row>
            <Field label="Konstrüksiyon"><TextInput style={s.input} value={structurePerKwp} onChangeText={setSPK} keyboardType="numeric" /></Field>
            <Field label="Kablolama"><TextInput style={s.input} value={cablingPerKwp} onChangeText={setCPK} keyboardType="numeric" /></Field>
          </Row>
          <Row>
            <Field label="İşçilik"><TextInput style={s.input} value={laborPerKwp} onChangeText={setLPK} keyboardType="numeric" /></Field>
            <Field label="Mesafe (km)"><TextInput style={s.input} value={logisticsKm} onChangeText={setKm} keyboardType="numeric" /></Field>
          </Row>
          <Field label="Kâr Marjı (%)"><TextInput style={s.input} value={marginPct} onChangeText={setMP} keyboardType="numeric" /></Field>
        </Section>

        <Section title="Hesaplama">
          <View style={s.calcBox}>
            <Row2 l="Malzeme" v={calc.materialCost} />
            <Row2 l="İşçilik" v={calc.laborCost} />
            <Row2 l="Lojistik" v={calc.logisticsCost} />
            <Row2 l="Ara Toplam" v={calc.subtotal} />
            <Row2 l={`Marj (%${marginPct})`} v={calc.margin} />
            <View style={s.calcRow}><Text style={[s.calcLabel, { fontWeight: '800', color: colors.text.primary }]}>TOPLAM</Text><Text style={[s.calcVal, { color: '#22c55e', fontSize: typography.md }]}>₺{calc.total.toLocaleString('tr-TR')}</Text></View>
          </View>
        </Section>

        <Section title="Not">
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} multiline placeholder="Opsiyonel" placeholderTextColor={colors.text.faint} />
        </Section>

        <TouchableOpacity style={s.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveText}>{editingId ? 'Güncelle' : 'Teklifi Kaydet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>);
}
function Row({ children }: { children: React.ReactNode }) { return <View style={{ flexDirection: 'row', gap: spacing.sm }}>{children}</View>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<View style={{ flex: 1 }}><Text style={s.fieldLabel}>{label}</Text>{children}</View>);
}
function Row2({ l, v }: { l: string; v: number }) {
  return (<View style={s.calcRow}><Text style={s.calcLabel}>{l}</Text><Text style={s.calcVal}>₺{v.toLocaleString('tr-TR')}</Text></View>);
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, color: colors.text.primary, fontSize: typography.sm },
  fieldLabel: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  chipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  calcBox: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, padding: spacing.md, gap: 6 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calcLabel: { color: colors.text.muted, fontSize: typography.sm },
  calcVal: { color: colors.text.primary, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: radius.md },
  saveText: { color: '#fff', fontWeight: '800' },
});

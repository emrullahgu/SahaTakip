// TransformerProposalFormScreen — POZ-DEV-220 YG Trafo teklif formu
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, TransformerCustomerType, TransformerQuoteInput } from '../types';
import { useAppContext } from '../context/AppContext';
import {
  calcTransformerQuote,
  getTransformerQuote,
  saveTransformerQuote,
  TRANSFORMER_CUSTOMER_TYPE_LABEL,
} from '../services/transformerProposals';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'TransformerProposalForm'>;

const TYPES: TransformerCustomerType[] = ['sanayi', 'ticarethane', 'osb', 'sanayi_sitesi', 'kamu'];

export default function TransformerProposalFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { customers } = useAppContext();
  const editingId = route.params?.quoteId;

  const [customerId, setCustomerId] = useState<string | undefined>(route.params?.customerId);
  const [customerName, setCustomerName] = useState('');
  const [kvaPerUnit, setKva] = useState('630');
  const [unitCount, setUnits] = useState('1');
  const [customerType, setCustType] = useState<TransformerCustomerType>('sanayi');
  const [contractMonths, setMonths] = useState('12');
  const [distanceKm, setKm] = useState('0');
  const [nightShift, setNight] = useState(false);
  const [periodicTest, setPer] = useState(true);
  const [emergencyResponse, setEmer] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      const q = await getTransformerQuote(editingId);
      if (!q) return;
      setCustomerId(q.customerId);
      setCustomerName(q.customerName);
      setKva(String(q.input.kvaPerUnit));
      setUnits(String(q.input.unitCount));
      setCustType(q.input.customerType);
      setMonths(String(q.input.contractMonths));
      setKm(String(q.input.distanceKm));
      setNight(q.input.nightShift);
      setPer(q.input.periodicTest);
      setEmer(q.input.emergencyResponse);
      setNotes(q.notes || '');
    })();
  }, [editingId]);

  const input: TransformerQuoteInput = useMemo(() => ({
    kvaPerUnit: Number(kvaPerUnit) || 0,
    unitCount: Number(unitCount) || 0,
    customerType,
    contractMonths: Number(contractMonths) || 0,
    distanceKm: Number(distanceKm) || 0,
    nightShift, periodicTest, emergencyResponse,
  }), [kvaPerUnit, unitCount, customerType, contractMonths, distanceKm, nightShift, periodicTest, emergencyResponse]);

  const calc = useMemo(() => calcTransformerQuote(input), [input]);

  const onSave = async () => {
    if (!customerName.trim()) return Alert.alert('Eksik', 'Müşteri adı girin');
    if (!input.kvaPerUnit || !input.unitCount) return Alert.alert('Eksik', 'kVA ve adet girin');
    await saveTransformerQuote({
      id: editingId,
      customerId,
      customerName: customerName.trim(),
      input,
      monthlyFee: calc.monthlyFee,
      totalFee: calc.totalFee,
      notes: notes.trim() || undefined,
    });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Section title="Müşteri">
          <TextInput style={s.input} value={customerName} onChangeText={setCustomerName} placeholder="Müşteri adı" placeholderTextColor={colors.text.faint} />
          <View style={s.chips}>
            {customers.slice(0, 8).map(c => (
              <TouchableOpacity key={c.id} style={[s.chip, customerId === c.id && s.chipActive]} onPress={() => { setCustomerId(c.id); setCustomerName(c.shortName); }}>
                <Text style={[s.chipText, customerId === c.id && { color: '#fff' }]}>{c.shortName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Trafo Bilgisi">
          <Row>
            <Field label="kVA / adet"><TextInput style={s.input} value={kvaPerUnit} onChangeText={setKva} keyboardType="numeric" /></Field>
            <Field label="Adet"><TextInput style={s.input} value={unitCount} onChangeText={setUnits} keyboardType="numeric" /></Field>
          </Row>
        </Section>

        <Section title="Müşteri Tipi">
          <View style={s.chips}>
            {TYPES.map(t => (
              <TouchableOpacity key={t} style={[s.chip, customerType === t && s.chipActive]} onPress={() => setCustType(t)}>
                <Text style={[s.chipText, customerType === t && { color: '#fff' }]}>{TRANSFORMER_CUSTOMER_TYPE_LABEL[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Sözleşme">
          <Row>
            <Field label="Süre (ay)"><TextInput style={s.input} value={contractMonths} onChangeText={setMonths} keyboardType="numeric" /></Field>
            <Field label="Uzaklık (km)"><TextInput style={s.input} value={distanceKm} onChangeText={setKm} keyboardType="numeric" /></Field>
          </Row>
        </Section>

        <Section title="Ek Hizmetler">
          <Toggle label="Gece nöbeti (+%10)" value={nightShift} onChange={setNight} />
          <Toggle label="Periyodik test (+%5)" value={periodicTest} onChange={setPer} />
          <Toggle label="Acil müdahale (+%7)" value={emergencyResponse} onChange={setEmer} />
        </Section>

        <Section title="Hesaplama">
          <View style={s.calcBox}>
            <View style={s.calcRow}><Text style={s.calcLabel}>Aylık ücret</Text><Text style={s.calcVal}>₺{calc.monthlyFee.toLocaleString('tr-TR')}</Text></View>
            <View style={s.calcRow}><Text style={s.calcLabel}>Toplam ({contractMonths} ay)</Text><Text style={[s.calcVal, { color: '#22c55e', fontSize: typography.md }]}>₺{calc.totalFee.toLocaleString('tr-TR')}</Text></View>
            {Number(contractMonths) >= 12 && <Text style={s.discount}>12+ ay sözleşmede %10 indirim uygulandı</Text>}
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
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>);
}
function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: spacing.sm }}>{children}</View>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<View style={{ flex: 1 }}><Text style={s.fieldLabel}>{label}</Text>{children}</View>);
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
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
  chipActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  chipText: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.secondary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 8, borderWidth: 1, borderColor: colors.border.primary },
  toggleLabel: { color: colors.text.primary, fontSize: typography.sm },
  calcBox: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, padding: spacing.md, gap: 8 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calcLabel: { color: colors.text.muted, fontSize: typography.sm },
  calcVal: { color: colors.text.primary, fontWeight: '800' },
  discount: { color: '#f59e0b', fontSize: typography.xs, fontWeight: '700', marginTop: 4 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: radius.md },
  saveText: { color: '#fff', fontWeight: '800' },
});

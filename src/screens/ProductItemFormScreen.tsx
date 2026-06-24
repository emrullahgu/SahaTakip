// ProductItemFormScreen — POZ-DEV-243 Ürün ekleme/düzenleme
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, ProductItemStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import CustomerPicker from '../components/CustomerPicker';
import { getProductItem, saveProductItem, PRODUCT_ITEM_STATUS_LABEL, PRODUCT_ITEM_STATUS_COLOR } from '../services/productItems';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ProductItemForm'>;
const STATUSES: ProductItemStatus[] = ['in_stock', 'in_use', 'in_transit', 'maintenance', 'retired'];

export default function ProductItemFormScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { customers } = useAppContext();
  const editingId = route.params?.itemId;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [location, setLocation] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [status, setStatus] = useState<ProductItemStatus>('in_stock');
  const [purchasePrice, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      const p = await getProductItem(editingId);
      if (!p) return;
      setCode(p.code); setName(p.name); setCategory(p.category || ''); setSerialNo(p.serialNo || '');
      setManufacturer(p.manufacturer || ''); setModel(p.model || ''); setLocation(p.location || '');
      setCustomerId(p.customerId); setStatus(p.status);
      setPrice(p.purchasePrice ? String(p.purchasePrice) : '');
      setNotes(p.notes || '');
    })();
  }, [editingId]);

  const onSave = async () => {
    if (!name.trim() || !code.trim()) return Alert.alert('Eksik', 'Ad ve kod girin');
    await saveProductItem({
      id: editingId,
      code: code.trim(), name: name.trim(),
      category: category.trim() || undefined,
      serialNo: serialNo.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      location: location.trim() || undefined,
      customerId, status,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      notes: notes.trim() || undefined,
    });
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content}>
        <Section title="Tanımlama">
          <Row>
            <Field label="Kod *"><TextInput style={s.input} value={code} onChangeText={setCode} /></Field>
            <Field label="Kategori"><TextInput style={s.input} value={category} onChangeText={setCategory} /></Field>
          </Row>
          <Field label="Ad *"><TextInput style={s.input} value={name} onChangeText={setName} /></Field>
          <Row>
            <Field label="Üretici"><TextInput style={s.input} value={manufacturer} onChangeText={setManufacturer} /></Field>
            <Field label="Model"><TextInput style={s.input} value={model} onChangeText={setModel} /></Field>
          </Row>
          <Row>
            <Field label="Seri No"><TextInput style={s.input} value={serialNo} onChangeText={setSerialNo} /></Field>
            <Field label="Lokasyon"><TextInput style={s.input} value={location} onChangeText={setLocation} /></Field>
          </Row>
          <Field label="Alış fiyatı (₺)"><TextInput style={s.input} value={purchasePrice} onChangeText={setPrice} keyboardType="numeric" /></Field>
        </Section>

        <Section title="Durum">
          <View style={s.chips}>
            {STATUSES.map(st => (
              <TouchableOpacity key={st} style={[s.chip, status === st && { backgroundColor: PRODUCT_ITEM_STATUS_COLOR[st], borderColor: PRODUCT_ITEM_STATUS_COLOR[st] }]} onPress={() => setStatus(st)}>
                <Text style={[s.chipText, status === st && { color: '#fff' }]}>{PRODUCT_ITEM_STATUS_LABEL[st]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Müşteri (ops.)">
          <CustomerPicker customers={customers} selectedId={customerId} onSelect={c => setCustomerId(c?.id)} />
        </Section>

        <Section title="Not">
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} multiline placeholder="Opsiyonel" placeholderTextColor={colors.text.faint} />
        </Section>

        <TouchableOpacity style={s.saveBtn} onPress={onSave}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={s.saveText}>{editingId ? 'Güncelle' : 'Ürün Kaydet'}</Text>
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
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: radius.md },
  saveText: { color: '#fff', fontWeight: '800' },
});

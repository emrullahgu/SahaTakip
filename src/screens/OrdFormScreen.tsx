// Faz 59 — OrdFormScreen (POZ-DEV-293)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface DraftItem {
  id: string;
  productName: string;
  qty: number;
  unitPrice: number;
}

export default function OrdFormScreen() {
  const nav = useNavigation<Nav>();
  const [customer, setCustomer] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30 gün vadeli');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([
    { id: 'd1', productName: '', qty: 1, unitPrice: 0 },
  ]);

  const addItem = () => setItems(prev => [...prev, { id: 'd' + Date.now(), productName: '', qty: 1, unitPrice: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, patch: Partial<DraftItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

  const subtotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
  const vat = subtotal * 0.20;
  const total = subtotal + vat;

  const save = (asDraft: boolean) => {
    if (!customer) { Alert.alert('Uyarı', 'Müşteri seçiniz'); return; }
    if (items.length === 0 || items.some(i => !i.productName)) { Alert.alert('Uyarı', 'En az bir ürün ekleyiniz'); return; }
    Alert.alert(
      asDraft ? 'Taslak Kaydedildi' : 'Sipariş Gönderildi',
      `${items.length} kalem, toplam ₺${total.toLocaleString('tr-TR')} (demo).`,
      [{ text: 'Tamam', onPress: () => nav.goBack() }]
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionT}>Müşteri Bilgileri</Text>
        <View style={s.field}>
          <Text style={s.lbl}>Müşteri *</Text>
          <TextInput value={customer} onChangeText={setCustomer} placeholder="Müşteri adı girin" placeholderTextColor={colors.text.muted} style={s.input} />
        </View>
        <View style={s.field}>
          <Text style={s.lbl}>Ödeme Vadesi</Text>
          <TextInput value={paymentTerms} onChangeText={setPaymentTerms} style={s.input} placeholderTextColor={colors.text.muted} />
        </View>

        <View style={s.sectionRow}>
          <Text style={s.sectionT}>Sipariş Kalemleri</Text>
          <TouchableOpacity style={s.addBtn} onPress={addItem} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnT}>Ekle</Text>
          </TouchableOpacity>
        </View>

        {items.map((it, idx) => (
          <View key={it.id} style={s.itemCard}>
            <View style={s.itemHead}>
              <Text style={s.itemIdx}>Kalem #{idx + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(it.id)} activeOpacity={0.7}>
                  <Ionicons name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              value={it.productName}
              onChangeText={t => updateItem(it.id, { productName: t })}
              placeholder="Ürün/hizmet adı"
              placeholderTextColor={colors.text.muted}
              style={s.input}
            />
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>Miktar</Text>
                <TextInput
                  value={String(it.qty)}
                  onChangeText={t => updateItem(it.id, { qty: parseFloat(t) || 0 })}
                  keyboardType="numeric"
                  style={s.input}
                  placeholderTextColor={colors.text.muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>Birim Fiyat (₺)</Text>
                <TextInput
                  value={String(it.unitPrice)}
                  onChangeText={t => updateItem(it.id, { unitPrice: parseFloat(t) || 0 })}
                  keyboardType="numeric"
                  style={s.input}
                  placeholderTextColor={colors.text.muted}
                />
              </View>
            </View>
            <View style={s.itemTotal}>
              <Text style={s.itemTotalL}>Tutar</Text>
              <Text style={s.itemTotalV}>₺{(it.qty * it.unitPrice).toLocaleString('tr-TR')}</Text>
            </View>
          </View>
        ))}

        <View style={s.summary}>
          <Row label="Ara Toplam" value={`₺${subtotal.toLocaleString('tr-TR')}`} />
          <Row label="KDV (%20)" value={`₺${vat.toLocaleString('tr-TR')}`} />
          <View style={s.divider} />
          <Row label="GENEL TOPLAM" value={`₺${total.toLocaleString('tr-TR')}`} bold />
        </View>

        <Text style={s.sectionT}>Notlar</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Sipariş notu (opsiyonel)"
          placeholderTextColor={colors.text.muted}
          multiline
          numberOfLines={3}
          style={[s.input, { height: 80, textAlignVertical: 'top' }]}
        />

        <View style={s.actions}>
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary }]} onPress={() => save(true)} activeOpacity={0.85}>
            <Ionicons name="save" size={16} color={colors.text.primary} />
            <Text style={[s.btnT, { color: colors.text.primary }]}>Taslak Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#f97316' }]} onPress={() => save(false)} activeOpacity={0.85}>
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={s.btnT}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.sumRow}>
      <Text style={[s.sumL, bold && { fontWeight: '800', color: colors.text.primary }]}>{label}</Text>
      <Text style={[s.sumV, bold && { fontWeight: '800', fontSize: typography.md, color: '#22c55e' }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  addBtnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  field: { gap: 4 },
  lbl: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, paddingHorizontal: spacing.sm, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  itemCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemIdx: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  itemTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg.primary, padding: spacing.sm, borderRadius: radius.sm },
  itemTotalL: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  itemTotalV: { color: '#22c55e', fontSize: typography.sm, fontWeight: '800' },
  summary: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumL: { color: colors.text.muted, fontSize: typography.sm },
  sumV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: spacing.md, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
});

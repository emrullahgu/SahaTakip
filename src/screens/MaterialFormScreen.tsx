// MaterialFormScreen — POZ-DEV-054, 057, 058
// Malzeme oluşturma/düzenleme + min stok + barkod alanı.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { getMaterial, upsertMaterial, newMaterial } from '../services/materials';
import { Material, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MaterialForm'>;
type Rt = RouteProp<RootStackParamList, 'MaterialForm'>;

const UNITS = ['adet', 'kg', 'gr', 'lt', 'm', 'm²', 'm³', 'paket', 'kutu', 'rulo'];

export default function MaterialFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editingId = route.params?.materialId;
  const isEdit = !!editingId;

  const [form, setForm] = useState<Material>(newMaterial());

  useEffect(() => {
    (async () => {
      if (isEdit && editingId) {
        const m = await getMaterial(editingId);
        if (m) setForm(m);
      }
    })();
  }, [isEdit, editingId]);

  const set = <K extends keyof Material>(k: K, v: Material[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Eksik', 'Malzeme adı girin.');
      return;
    }
    if (!form.code.trim()) {
      Alert.alert('Eksik', 'Malzeme kodu girin.');
      return;
    }
    await upsertMaterial(form);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Kod *</Text>
          <TextInput
            value={form.code}
            onChangeText={t => set('code', t)}
            style={styles.input}
            placeholder="MAL-001"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Ad *</Text>
          <TextInput
            value={form.name}
            onChangeText={t => set('name', t)}
            style={styles.input}
            placeholder="Malzeme adı"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Birim</Text>
          <View style={styles.chipRow}>
            {UNITS.map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.chip, form.unit === u && styles.chipActive]}
                onPress={() => set('unit', u)}
              >
                <Text style={[styles.chipText, form.unit === u && styles.chipTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Kategori</Text>
          <TextInput
            value={form.category ?? ''}
            onChangeText={t => set('category', t)}
            style={styles.input}
            placeholder="Örn: Elektrik, Sıhhi tesisat"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Birim Fiyat</Text>
          <TextInput
            value={form.price === undefined || form.price === null ? '' : String(form.price)}
            onChangeText={t => set('price', t === '' ? undefined : Number(t.replace(',', '.')))}
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.faint}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Minimum Stok (uyarı eşiği)</Text>
          <TextInput
            value={form.minStock === undefined || form.minStock === null ? '' : String(form.minStock)}
            onChangeText={t => set('minStock', t === '' ? undefined : Number(t.replace(',', '.')))}
            style={styles.input}
            placeholder="0 = uyarı yok"
            placeholderTextColor={colors.text.faint}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Barkod</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TextInput
              value={form.barcode ?? ''}
              onChangeText={t => set('barcode', t)}
              style={[styles.input, { flex: 1 }]}
              placeholder="Barkod numarası"
              placeholderTextColor={colors.text.faint}
            />
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() =>
                Alert.alert(
                  'İpucu',
                  'Barkod tarayıcı bu form içinden değil, ana stok ekranlarından açılır. Şimdilik manuel girin.',
                )
              }
            >
              <Ionicons name="scan-outline" size={18} color={brand.green} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Notlar</Text>
          <TextInput
            value={form.notes ?? ''}
            onChangeText={t => set('notes', t)}
            style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="Açıklama"
            placeholderTextColor={colors.text.faint}
            multiline
          />

          <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveText}>
              {isEdit ? 'Güncelle' : 'Malzeme Ekle'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 100, gap: 4 },
  label: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  scanBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: brand.green,
    borderRadius: radius.md,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
});

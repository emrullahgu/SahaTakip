// WarehouseFormScreen — POZ-DEV-054, 056
// Depo/araç/personel zimmet noktası oluşturma & düzenleme.

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
import {
  getWarehouse,
  upsertWarehouse,
  newWarehouse,
} from '../services/warehouses';
import { Warehouse, WarehouseKind, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'WarehouseForm'>;
type Rt = RouteProp<RootStackParamList, 'WarehouseForm'>;

const KIND_LABEL: Record<WarehouseKind, string> = {
  depo: 'Depo',
  arac: 'Araç',
  personel: 'Personel Zimmet',
};

export default function WarehouseFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editingId = route.params?.warehouseId;
  const isEdit = !!editingId;

  const [form, setForm] = useState<Warehouse>(newWarehouse('depo'));

  useEffect(() => {
    (async () => {
      if (isEdit && editingId) {
        const w = await getWarehouse(editingId);
        if (w) setForm(w);
      }
    })();
  }, [isEdit, editingId]);

  const set = <K extends keyof Warehouse>(k: K, v: Warehouse[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Eksik', 'Ad girin.');
      return;
    }
    await upsertWarehouse(form);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Tip *</Text>
          <View style={styles.chipRow}>
            {(['depo', 'arac', 'personel'] as WarehouseKind[]).map(k => (
              <TouchableOpacity
                key={k}
                style={[styles.chip, form.kind === k && styles.chipActive]}
                onPress={() => set('kind', k)}
              >
                <Text style={[styles.chipText, form.kind === k && styles.chipTextActive]}>
                  {KIND_LABEL[k]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Ad *</Text>
          <TextInput
            value={form.name}
            onChangeText={t => set('name', t)}
            style={styles.input}
            placeholder={
              form.kind === 'arac'
                ? 'Araç plakası veya adı'
                : form.kind === 'personel'
                ? 'Personel adı'
                : 'Depo adı'
            }
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Kod</Text>
          <TextInput
            value={form.code ?? ''}
            onChangeText={t => set('code', t)}
            style={styles.input}
            placeholder="DEPO-01"
            placeholderTextColor={colors.text.faint}
          />

          {form.kind !== 'depo' && (
            <>
              <Text style={styles.label}>Sorumlu Kişi</Text>
              <TextInput
                value={form.responsibleName ?? ''}
                onChangeText={t => set('responsibleName', t)}
                style={styles.input}
                placeholder="Ad Soyad"
                placeholderTextColor={colors.text.faint}
              />
            </>
          )}

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
              {isEdit ? 'Güncelle' : 'Kaydet'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 100 },
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

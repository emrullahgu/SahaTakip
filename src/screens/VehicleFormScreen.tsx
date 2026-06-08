// VehicleFormScreen — POZ-DEV-060, 061
// Araç oluştur/düzenle: plaka, marka/model, sürücü, vade tarihleri.

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
  getVehicle,
  upsertVehicle,
  newVehicle,
} from '../services/vehicles';
import { Vehicle, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VehicleForm'>;
type Rt = RouteProp<RootStackParamList, 'VehicleForm'>;

const FUEL_TYPES: NonNullable<Vehicle['fuelType']>[] = [
  'benzin',
  'dizel',
  'lpg',
  'elektrik',
  'hibrit',
];

export default function VehicleFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const editingId = route.params?.vehicleId;
  const isEdit = !!editingId;

  const [form, setForm] = useState<Vehicle>(newVehicle());

  useEffect(() => {
    (async () => {
      if (isEdit && editingId) {
        const v = await getVehicle(editingId);
        if (v) setForm(v);
      }
    })();
  }, [isEdit, editingId]);

  const set = <K extends keyof Vehicle>(k: K, v: Vehicle[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.plate.trim()) {
      Alert.alert('Eksik', 'Plaka girin.');
      return;
    }
    await upsertVehicle({ ...form, plate: form.plate.toUpperCase().replace(/\s+/g, ' ').trim() });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Plaka *</Text>
          <TextInput
            value={form.plate}
            onChangeText={t => set('plate', t.toUpperCase())}
            style={styles.input}
            placeholder="34 ABC 123"
            placeholderTextColor={colors.text.faint}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Marka</Text>
          <TextInput
            value={form.brand ?? ''}
            onChangeText={t => set('brand', t)}
            style={styles.input}
            placeholder="Ford"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Model</Text>
          <TextInput
            value={form.model ?? ''}
            onChangeText={t => set('model', t)}
            style={styles.input}
            placeholder="Transit"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Yıl</Text>
          <TextInput
            value={form.year ? String(form.year) : ''}
            onChangeText={t => set('year', t === '' ? undefined : Number(t))}
            style={styles.input}
            placeholder="2022"
            placeholderTextColor={colors.text.faint}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Renk</Text>
          <TextInput
            value={form.color ?? ''}
            onChangeText={t => set('color', t)}
            style={styles.input}
            placeholder="Beyaz"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Yakıt</Text>
          <View style={styles.chipRow}>
            {FUEL_TYPES.map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, form.fuelType === f && styles.chipActive]}
                onPress={() => set('fuelType', f)}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.fuelType === f && styles.chipTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Sürücü Adı</Text>
          <TextInput
            value={form.driverName ?? ''}
            onChangeText={t => set('driverName', t)}
            style={styles.input}
            placeholder="Ad Soyad"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Toplam Km</Text>
          <TextInput
            value={form.kmTotal !== undefined ? String(form.kmTotal) : ''}
            onChangeText={t => set('kmTotal', t === '' ? undefined : Number(t))}
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.faint}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Muayene Bitiş Tarihi (YYYY-AA-GG)</Text>
          <TextInput
            value={form.inspectionDueAt ?? ''}
            onChangeText={t => set('inspectionDueAt', t || undefined)}
            style={styles.input}
            placeholder="2026-12-31"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Sigorta Bitiş Tarihi (YYYY-AA-GG)</Text>
          <TextInput
            value={form.insuranceDueAt ?? ''}
            onChangeText={t => set('insuranceDueAt', t || undefined)}
            style={styles.input}
            placeholder="2026-12-31"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Kasko Bitiş Tarihi (YYYY-AA-GG)</Text>
          <TextInput
            value={form.kaskoDueAt ?? ''}
            onChangeText={t => set('kaskoDueAt', t || undefined)}
            style={styles.input}
            placeholder="2026-12-31"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.sectionTitle}>Son Bakım Bilgisi</Text>

          <Text style={styles.label}>Son Bakım Tarihi (YYYY-AA-GG)</Text>
          <TextInput
            value={form.lastServiceAt ?? ''}
            onChangeText={t => set('lastServiceAt', t || undefined)}
            style={styles.input}
            placeholder="2026-06-01"
            placeholderTextColor={colors.text.faint}
          />

          <Text style={styles.label}>Son Bakım Km</Text>
          <TextInput
            value={form.lastServiceKm !== undefined ? String(form.lastServiceKm) : ''}
            onChangeText={t => set('lastServiceKm', t === '' ? undefined : Number(t.replace(/[^0-9]/g, '')) || undefined)}
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.faint}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Yapılan İşlemler</Text>
          <TextInput
            value={form.lastServiceNote ?? ''}
            onChangeText={t => set('lastServiceNote', t || undefined)}
            style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="Yağ değişimi, fren balatası, filtre…"
            placeholderTextColor={colors.text.faint}
            multiline
          />

          <Text style={styles.label}>Bakım Ücreti (₺)</Text>
          <TextInput
            value={form.lastServiceCost !== undefined ? String(form.lastServiceCost) : ''}
            onChangeText={t => set('lastServiceCost', t === '' ? undefined : Number(t.replace(',', '.')) || undefined)}
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.faint}
            keyboardType="decimal-pad"
          />

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
            <Text style={styles.saveText}>{isEdit ? 'Güncelle' : 'Kaydet'}</Text>
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
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '800',
    marginTop: spacing.lg,
    marginBottom: 2,
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

// VehicleDamageFormScreen — POZ-DEV-062
// Hasar kaydı oluştur/düzenle (foto galerisi).

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  getDamage,
  upsertDamage,
  newDamage,
} from '../services/vehicleDamages';
import {
  VehicleDamage,
  VehicleDamageSeverity,
  VehicleDamageStatus,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VehicleDamageForm'>;
type Rt = RouteProp<RootStackParamList, 'VehicleDamageForm'>;

const SEV: VehicleDamageSeverity[] = ['low', 'medium', 'high'];
const SEV_LABEL: Record<VehicleDamageSeverity, string> = {
  low: 'Hafif',
  medium: 'Orta',
  high: 'Ağır',
};
const SEV_COLOR: Record<VehicleDamageSeverity, string> = {
  low: '#f59e0b',
  medium: '#f97316',
  high: '#dc2626',
};

const STATUSES: VehicleDamageStatus[] = ['open', 'in-progress', 'repaired'];
const STATUS_LABEL: Record<VehicleDamageStatus, string> = {
  open: 'Açık',
  'in-progress': 'Onarımda',
  repaired: 'Onarıldı',
};

export default function VehicleDamageFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { vehicleId, damageId } = route.params;
  const [form, setForm] = useState<VehicleDamage>(newDamage(vehicleId));

  useEffect(() => {
    (async () => {
      if (damageId) {
        const d = await getDamage(damageId);
        if (d) setForm(d);
      }
    })();
  }, [damageId]);

  const set = <K extends keyof VehicleDamage>(k: K, v: VehicleDamage[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const addPhoto = async (fromCamera: boolean) => {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin', 'Kamera izni reddedildi.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      if (!res.canceled && res.assets[0]) {
        set('photos', [...form.photos, res.assets[0].uri]);
      }
    } else {
      const res = await ImagePicker.launchImageLibraryAsync({
        quality: 0.6,
        allowsMultipleSelection: false,
      });
      if (!res.canceled && res.assets[0]) {
        set('photos', [...form.photos, res.assets[0].uri]);
      }
    }
  };

  const removePhoto = (uri: string) => {
    set('photos', form.photos.filter(p => p !== uri));
  };

  const save = async () => {
    if (!form.description.trim()) {
      Alert.alert('Eksik', 'Açıklama girin.');
      return;
    }
    const next: VehicleDamage = { ...form };
    if (form.status === 'repaired' && !next.repairedAt) {
      next.repairedAt = new Date().toISOString();
    }
    await upsertDamage(next);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Açıklama *</Text>
          <TextInput
            value={form.description}
            onChangeText={t => set('description', t)}
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            placeholder="Hasar detayı..."
            placeholderTextColor={colors.text.faint}
            multiline
          />

          <Text style={styles.label}>Şiddet</Text>
          <View style={styles.chipRow}>
            {SEV.map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.chip,
                  form.severity === s && { backgroundColor: SEV_COLOR[s], borderColor: SEV_COLOR[s] },
                ]}
                onPress={() => set('severity', s)}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.severity === s && styles.chipTextActive,
                  ]}
                >
                  {SEV_LABEL[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Durum</Text>
          <View style={styles.chipRow}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, form.status === s && styles.chipActive]}
                onPress={() => set('status', s)}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.status === s && styles.chipTextActive,
                  ]}
                >
                  {STATUS_LABEL[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Km</Text>
          <TextInput
            value={form.kmAt !== undefined ? String(form.kmAt) : ''}
            onChangeText={t => set('kmAt', t === '' ? undefined : Number(t))}
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.text.faint}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Bildiren Kişi</Text>
          <TextInput
            value={form.reportedBy ?? ''}
            onChangeText={t => set('reportedBy', t)}
            style={styles.input}
            placeholder="Ad Soyad"
            placeholderTextColor={colors.text.faint}
          />

          {form.status === 'repaired' && (
            <>
              <Text style={styles.label}>Onarım Maliyeti</Text>
              <TextInput
                value={form.repairCost !== undefined ? String(form.repairCost) : ''}
                onChangeText={t =>
                  set('repairCost', t === '' ? undefined : Number(t.replace(',', '.')))
                }
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.faint}
                keyboardType="decimal-pad"
              />
            </>
          )}

          <Text style={styles.label}>Notlar</Text>
          <TextInput
            value={form.notes ?? ''}
            onChangeText={t => set('notes', t)}
            style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="Notlar"
            placeholderTextColor={colors.text.faint}
            multiline
          />

          <Text style={styles.label}>Fotoğraflar ({form.photos.length})</Text>
          <View style={styles.photoBtnRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => addPhoto(true)}>
              <Ionicons name="camera-outline" size={18} color={brand.green} />
              <Text style={styles.photoBtnText}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => addPhoto(false)}>
              <Ionicons name="images-outline" size={18} color={brand.green} />
              <Text style={styles.photoBtnText}>Galeri</Text>
            </TouchableOpacity>
          </View>

          {form.photos.length > 0 && (
            <ScrollView horizontal style={{ marginTop: spacing.sm }}>
              {form.photos.map(uri => (
                <View key={uri} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => removePhoto(uri)}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveText}>Kaydet</Text>
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
  photoBtnRow: { flexDirection: 'row', gap: 8 },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: brand.green,
    backgroundColor: colors.bg.secondary,
  },
  photoBtnText: { color: brand.green, fontWeight: '700', fontSize: typography.xs },
  photoWrap: { marginRight: 8, position: 'relative' },
  photo: { width: 92, height: 92, borderRadius: radius.sm, backgroundColor: '#000' },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
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

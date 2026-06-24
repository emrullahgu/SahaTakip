// VehicleLogFormScreen — POZ-DEV-061
// Km / yakıt / bakım / muayene / sigorta kaydı.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
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
import * as ImagePicker from 'expo-image-picker';

import { colors, spacing, radius, typography, brand } from '../theme';
import { addLog, getLog, updateLog } from '../services/vehicleLogs';
import { uploadPhoto } from '../services/photoUpload';
import { parseNonNeg } from '../utils/numInput';
import { VehicleLog, VehicleLogKind, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VehicleLogForm'>;
type Rt = RouteProp<RootStackParamList, 'VehicleLogForm'>;

const KIND_LABEL: Record<VehicleLogKind, string> = {
  km: 'Km Okuması',
  fuel: 'Yakıt',
  maintenance: 'Bakım/Servis',
  inspection: 'Muayene',
  insurance: 'Sigorta',
};

const KINDS: VehicleLogKind[] = ['km', 'fuel', 'maintenance', 'inspection', 'insurance'];

export default function VehicleLogFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { vehicleId, logId } = route.params;
  const [kind, setKind] = useState<VehicleLogKind>(route.params.kind ?? 'km');

  const [km, setKm] = useState('');
  const [liters, setLiters] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (logId) {
        const l = await getLog(logId);
        if (l) {
          setKind(l.kind);
          setKm(l.km !== undefined ? String(l.km) : '');
          setLiters(l.liters !== undefined ? String(l.liters) : '');
          setUnitPrice(l.unitPrice !== undefined ? String(l.unitPrice) : '');
          setTotalCost(l.totalCost !== undefined ? String(l.totalCost) : '');
          setServiceType(l.serviceType ?? '');
          setDueAt(l.dueAt ?? '');
          setNote(l.note ?? '');
          setReceiptUri(l.receiptUri);
        }
      }
    })();
  }, [logId]);

  const pickReceipt = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('İzin', 'Kamera izni reddedildi.'); return; }
        const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
        if (!res.canceled && res.assets[0]) setReceiptUri(res.assets[0].uri);
      } else {
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsMultipleSelection: false });
        if (!res.canceled && res.assets[0]) setReceiptUri(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Fotoğraf seçilemedi.');
    }
  };

  // Otomatik toplam hesabı (yakıt)
  useEffect(() => {
    if (kind === 'fuel' && liters && unitPrice && !totalCost) {
      const t = Number(liters.replace(',', '.')) * Number(unitPrice.replace(',', '.'));
      if (!isNaN(t)) setTotalCost(t.toFixed(2));
    }
  }, [kind, liters, unitPrice, totalCost]);

  const save = async () => {
    if (saving) return;
    if (kind === 'km' && !km) { Alert.alert('Eksik', 'Km değeri girin.'); return; }
    if (kind === 'fuel' && !liters) { Alert.alert('Eksik', 'Litre girin.'); return; }
    if ((kind === 'inspection' || kind === 'insurance') && !dueAt.trim()) {
      Alert.alert('Eksik', 'Vade tarihi girin (YYYY-AA-GG).');
      return;
    }

    // DOĞRULAMA: girilmiş ama geçersiz (NaN/negatif) sayı KAYDA SIZMASIN — yakıt istatistiği/
    // km grafiği bozulmasın. parseNonNeg geçersizi undefined yapar; girilmiş+geçersizse blokla.
    const kmN = parseNonNeg(km), litersN = parseNonNeg(liters), unitPriceN = parseNonNeg(unitPrice), totalCostN = parseNonNeg(totalCost);
    if ((km && kmN === undefined) || (liters && litersN === undefined) || (unitPrice && unitPriceN === undefined) || (totalCost && totalCostN === undefined)) {
      Alert.alert('Geçersiz değer', 'Km / litre / fiyat geçerli ve negatif olmayan bir sayı olmalı.');
      return;
    }

    setSaving(true);
    try {
      // Yeni seçilen yerel fişi Storage'a yükle (online ise URL, değilse local kalır).
      let finalReceipt = receiptUri;
      if (receiptUri && !receiptUri.startsWith('http')) {
        try {
          finalReceipt = await uploadPhoto(receiptUri, `vehicle-receipts/${vehicleId}`);
        } catch {
          finalReceipt = receiptUri; // yükleme başarısız → local uri ile devam
        }
      }

      const log: Omit<VehicleLog, 'id' | 'createdAt'> = {
        vehicleId,
        kind,
        km: kmN,
        liters: litersN,
        unitPrice: unitPriceN,
        totalCost: totalCostN,
        serviceType: serviceType.trim() || undefined,
        dueAt: dueAt.trim() || undefined,
        note: note.trim() || undefined,
        receiptUri: finalReceipt || undefined,
      };

      if (logId) {
        const existing = await getLog(logId);
        if (existing) await updateLog({ ...existing, ...log });
      } else {
        await addLog(log);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Kayıt Türü</Text>
          <View style={styles.chipRow}>
            {KINDS.map(k => (
              <TouchableOpacity
                key={k}
                style={[styles.chip, kind === k && styles.chipActive]}
                onPress={() => setKind(k)}
              >
                <Text style={[styles.chipText, kind === k && styles.chipTextActive]}>
                  {KIND_LABEL[k]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(kind === 'km' || kind === 'fuel' || kind === 'maintenance') && (
            <>
              <Text style={styles.label}>Km</Text>
              <TextInput
                value={km}
                onChangeText={setKm}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.faint}
                keyboardType="number-pad"
              />
            </>
          )}

          {kind === 'fuel' && (
            <>
              <Text style={styles.label}>Litre *</Text>
              <TextInput
                value={liters}
                onChangeText={setLiters}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.faint}
                keyboardType="decimal-pad"
              />
              <Text style={styles.label}>Birim Fiyat</Text>
              <TextInput
                value={unitPrice}
                onChangeText={setUnitPrice}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.faint}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {(kind === 'fuel' || kind === 'maintenance') && (
            <>
              <Text style={styles.label}>Toplam Tutar</Text>
              <TextInput
                value={totalCost}
                onChangeText={setTotalCost}
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.faint}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {kind === 'maintenance' && (
            <>
              <Text style={styles.label}>Servis Türü</Text>
              <TextInput
                value={serviceType}
                onChangeText={setServiceType}
                style={styles.input}
                placeholder="Yağ değişimi, lastik..."
                placeholderTextColor={colors.text.faint}
              />
            </>
          )}

          {(kind === 'inspection' || kind === 'insurance') && (
            <>
              <Text style={styles.label}>Vade Tarihi (YYYY-AA-GG) *</Text>
              <TextInput
                value={dueAt}
                onChangeText={setDueAt}
                style={styles.input}
                placeholder="2026-12-31"
                placeholderTextColor={colors.text.faint}
              />
            </>
          )}

          {(kind === 'fuel' || kind === 'maintenance') && (
            <>
              <Text style={styles.label}>Fiş Fotoğrafı</Text>
              {receiptUri ? (
                <View style={styles.receiptBox}>
                  <Image source={{ uri: receiptUri }} style={styles.receiptImg} resizeMode="cover" />
                  <TouchableOpacity style={styles.receiptRemove} onPress={() => setReceiptUri(undefined)}>
                    <Ionicons name="close-circle" size={26} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.receiptActions}>
                  <TouchableOpacity style={styles.receiptBtn} onPress={() => pickReceipt(true)} activeOpacity={0.85}>
                    <Ionicons name="camera-outline" size={18} color={brand.green} />
                    <Text style={styles.receiptBtnText}>Fotoğraf Çek</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.receiptBtn} onPress={() => pickReceipt(false)} activeOpacity={0.85}>
                    <Ionicons name="image-outline" size={18} color={brand.green} />
                    <Text style={styles.receiptBtnText}>Galeriden</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Not</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="Açıklama"
            placeholderTextColor={colors.text.faint}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            activeOpacity={0.85}
            disabled={saving}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveText}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Text>
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
  receiptActions: { flexDirection: 'row', gap: spacing.sm },
  receiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  receiptBtnText: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  receiptBox: { position: 'relative', alignSelf: 'flex-start' },
  receiptImg: {
    width: 160,
    height: 160,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  receiptRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.bg.primary,
    borderRadius: 13,
  },
});

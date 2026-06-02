// src/screens/VisionScannerScreen.tsx
// AI Vision Scanner — fotoğraftan fatura, kartvizit, ürün etiketi, sayaç, plaka okuma.
// GPT-4o Vision kullanır.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { aiVision, VisionMode, VisionResult } from '../services/aiRouter';
import { aiErrorAlert } from '../services/aiErrorHandler';
import { useAppContext } from '../context/AppContext';

const MODES: { id: VisionMode; label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap; hint: string }[] = [
  { id: 'invoice',        label: 'Fatura',          icon: 'receipt-outline',     hint: 'Fatura/fiş çek; satırlar dahil okur.' },
  { id: 'business_card',  label: 'Kartvizit',       icon: 'id-card-outline',     hint: 'Ad, telefon, e-posta, firma çıkarır.' },
  { id: 'product_label',  label: 'Ürün Etiketi',    icon: 'pricetag-outline',    hint: 'Marka, model, kod, barkod.' },
  { id: 'meter',          label: 'Sayaç',           icon: 'speedometer-outline', hint: 'Elektrik/su/gaz sayacı değeri.' },
  { id: 'plate',          label: 'Plaka',           icon: 'car-outline',         hint: 'Araç plakası okur.' },
  { id: 'free',           label: 'Serbest',         icon: 'sparkles-outline',    hint: 'Resmi serbest analiz et.' },
];

export default function VisionScannerScreen() {
  const navigation = useNavigation<any>();
  const { addCustomer } = useAppContext() as any;

  const [mode, setMode] = useState<VisionMode>('invoice');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      let perm;
      if (source === 'camera') {
        perm = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!perm.granted) {
        Alert.alert('İzin gerekli', 'Lütfen kamera/galeri iznini verin.');
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: false,
      };
      const r = source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.[0]) return;
      setImageUri(r.assets[0].uri);
      setResult(null);
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? String(e));
    }
  };

  const analyze = async () => {
    if (!imageUri) {
      Alert.alert('Önce bir resim seçin');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      // Fotoğrafı base64 data URL'e çevir
      let dataUrl: string;
      if (Platform.OS === 'web') {
        // imageUri zaten data URL veya blob URL
        if (imageUri.startsWith('data:')) {
          dataUrl = imageUri;
        } else {
          const blob = await fetch(imageUri).then(r => r.blob());
          dataUrl = await new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.onerror = rej;
            fr.readAsDataURL(blob);
          });
        }
      } else {
        const b64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
        // mime tahmini (jpg varsay)
        const mime = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        dataUrl = `data:${mime};base64,${b64}`;
      }

      const res = await aiVision({ image: dataUrl, mode });
      // Boyut kontrolü — base64 5MB üzeri uyar
      if (dataUrl.length > 7_000_000) {
        console.warn('Vision: fotoğraf 5MB üzeri, kalite düşürmeyi düşünün.');
      }
      setResult(res);
    } catch (e: any) {
      const a = aiErrorAlert(e);
      Alert.alert(`Analiz - ${a.title}`, a.message);
    } finally {
      setBusy(false);
    }
  };

  const copyJson = async () => {
    if (!result) return;
    const text = JSON.stringify(result.data, null, 2);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(text);
      } else {
        // React Native built-in (deprecated ama cıalışır)
        const RN = require('react-native');
        if (RN.Clipboard) RN.Clipboard.setString(text);
      }
      Alert.alert('Kopyalandı', 'JSON panoya alındı.');
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? String(e));
    }
  };

  const saveAsCustomer = () => {
    if (!result?.data) return;
    const d = result.data;
    if (d.type !== 'business_card' && d.type !== 'invoice') {
      Alert.alert('Uygun değil', 'Bu sadece kartvizit veya fatura sonuçları için kullanılabilir.');
      return;
    }
    const cust = d.type === 'business_card'
      ? {
          shortName: d.full_name ?? d.company ?? 'AI - Kartvizit',
          title: d.company ?? d.full_name ?? '',
          phone: d.mobile ?? d.phone ?? '',
          email: d.email ?? '',
          address: d.address ?? '',
          contactPerson: d.full_name ?? '',
        }
      : {
          shortName: d.vendor_name ?? 'AI - Fatura',
          title: d.vendor_name ?? '',
          taxNumber: d.vendor_tax_no ?? '',
        };
    Alert.alert(
      'Müşteri olarak ekle?',
      `${cust.shortName}\n${cust.phone ?? ''}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: async () => {
            try {
              await addCustomer({
                id: 'c' + Date.now(),
                ...cust,
                createdAt: new Date().toISOString(),
              });
              Alert.alert('Eklendi', `${cust.shortName} müşteri olarak kaydedildi.`);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Hata', e?.message ?? String(e));
            }
          },
        },
      ],
    );
  };

  const renderData = () => {
    if (!result?.data) return null;
    const entries = Object.entries(result.data).filter(([k]) => k !== 'type');
    return (
      <View style={styles.dataCard}>
        <View style={styles.dataHeader}>
          <Ionicons name="checkmark-circle" size={20} color={brand.green} />
          <Text style={styles.dataHeaderText}>{result.mode} · {result.latency_ms}ms</Text>
        </View>
        {entries.map(([k, v]) => (
          <View key={k} style={styles.kvRow}>
            <Text style={styles.kvKey}>{k}</Text>
            <Text style={styles.kvVal}>
              {v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <Text style={styles.title}>AI Vision Tarayıcı</Text>
        <Text style={styles.subtitle}>Fotoğraftan fatura, kartvizit, etiket, sayaç ve plaka okur.</Text>

        {/* Mod seçici */}
        <View style={styles.modeGrid}>
          {MODES.map(m => {
            const active = mode === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.modeCard, active && styles.modeCardActive]}
                onPress={() => setMode(m.id)}
              >
                <Ionicons name={m.icon} size={22} color={active ? '#fff' : brand.green} />
                <Text style={[styles.modeLabel, active && { color: '#fff' }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>{MODES.find(x => x.id === mode)?.hint}</Text>

        {/* Resim seç */}
        {imageUri ? (
          <View style={styles.imageBox}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            <TouchableOpacity style={styles.imageRemove} onPress={() => { setImageUri(null); setResult(null); }}>
              <Ionicons name="close-circle" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickRow}>
            <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage('camera')}>
              <Ionicons name="camera-outline" size={22} color={brand.green} />
              <Text style={styles.pickText}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage('library')}>
              <Ionicons name="images-outline" size={22} color={brand.green} />
              <Text style={styles.pickText}>Galeri</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analiz butonu */}
        {imageUri && (
          <TouchableOpacity
            style={[styles.analyzeBtn, busy && { opacity: 0.6 }]}
            onPress={analyze}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.analyzeText}>Analiz Et</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Sonuç */}
        {renderData()}

        {result && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={copyJson}>
              <Ionicons name="copy-outline" size={16} color={colors.text.primary} />
              <Text style={styles.actionText}>JSON Kopyala</Text>
            </TouchableOpacity>
            {(result.data?.type === 'business_card' || result.data?.type === 'invoice') && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={saveAsCustomer}>
                <Ionicons name="person-add-outline" size={16} color="#fff" />
                <Text style={[styles.actionText, { color: '#fff' }]}>Müşteri Ekle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  title: { fontSize: typography.xl, fontWeight: '700', color: colors.text.primary },
  subtitle: { fontSize: 13, color: colors.text.muted, marginTop: 4, marginBottom: 16 },
  hint: { fontSize: 12, color: colors.text.muted, marginTop: 8, marginBottom: 16, fontStyle: 'italic' },

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeCard: {
    flexBasis: '31%',
    minHeight: 78,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary,
    paddingVertical: 10,
    gap: 6,
  },
  modeCardActive: { backgroundColor: brand.green, borderColor: brand.green },
  modeLabel: { color: colors.text.primary, fontSize: 12, fontWeight: '600' },

  pickRow: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  pickBtn: {
    flex: 1, padding: 16, alignItems: 'center', gap: 6,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  pickText: { color: colors.text.primary, fontSize: 13, fontWeight: '600' },

  imageBox: { position: 'relative', marginVertical: 16 },
  image: { width: '100%', height: 240, borderRadius: radius.md, backgroundColor: '#000' },
  imageRemove: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16, padding: 2,
  },

  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: brand.green,
    paddingVertical: 14, borderRadius: radius.md,
    marginBottom: 16,
  },
  analyzeText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  dataCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary,
    padding: 12, marginTop: 8,
  },
  dataHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dataHeaderText: { fontSize: 12, color: colors.text.muted, textTransform: 'uppercase' },
  kvRow: {
    flexDirection: 'row', gap: 8, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: colors.border.primary,
  },
  kvKey: { width: 110, color: colors.text.muted, fontSize: 12, fontWeight: '600' },
  kvVal: { flex: 1, color: colors.text.primary, fontSize: 13 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  actionBtnPrimary: { backgroundColor: brand.blue, borderColor: brand.blue },
  actionText: { color: colors.text.primary, fontSize: 13, fontWeight: '600' },
});

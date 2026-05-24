// ====================================================================
// CustomerDocumentsScreen — POZ-DEV-045
// expo-image-picker ile foto/PDF ekleme + URL ile manuel ekleme + paylaşma.
// ====================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import { colors, brand, spacing, radius, typography } from '../theme';
import { RootStackParamList, CustomerDocument } from '../types';
import {
  listDocumentsByCustomer,
  addDocument,
  deleteDocument,
} from '../services/customerDocuments';
import { useAppContext } from '../context/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDocuments'>;

const CATEGORIES: NonNullable<CustomerDocument['category']>[] = [
  'Sözleşme',
  'Teklif',
  'Fatura',
  'Diğer',
];

export default function CustomerDocumentsScreen({ route }: Props) {
  const { customerId } = route.params;
  const { customers, showToast } = useAppContext();
  const customer = customers.find(c => c.id === customerId);
  const [docs, setDocs] = useState<CustomerDocument[]>([]);
  const [cat, setCat] = useState<NonNullable<CustomerDocument['category']>>('Sözleşme');
  const [busy, setBusy] = useState(false);

  const reload = async () => setDocs(await listDocumentsByCustomer(customerId));
  useEffect(() => {
    reload();
  }, [customerId]);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin gerekli', 'Galeri izni gereklidir.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images','videos'],
        quality: 0.8,
      });
      if (res.canceled || res.assets.length === 0) return;
      const asset = res.assets[0];
      setBusy(true);
      await addDocument({
        customerId,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        category: cat,
        uri: asset.uri,
        sizeBytes: asset.fileSize,
        mimeType: asset.mimeType || 'image/jpeg',
      });
      showToast('Belge eklendi.');
      reload();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Eklenemedi.');
    } finally {
      setBusy(false);
    }
  };

  const addByUrl = () => {
    if (!(Alert as any).prompt) {
      Alert.alert('iOS gerekli', 'URL ile eklemek iOS Alert.prompt gerektirir.');
      return;
    }
    (Alert as any).prompt(
      'Belge URL',
      'Belge adı + URL girin (örn. Sozlesme.pdf | https://...)',
      async (input?: string) => {
        if (!input) return;
        const [name, url] = input.split('|').map(s => s.trim());
        if (!name || !url) return;
        setBusy(true);
        await addDocument({
          customerId,
          name,
          category: cat,
          uri: url,
        });
        showToast('Belge eklendi.');
        reload();
        setBusy(false);
      },
    );
  };

  const open = async (d: CustomerDocument) => {
    try {
      if (d.uri.startsWith('http')) {
        await Linking.openURL(d.uri);
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(d.uri);
      } else {
        Alert.alert('Açılamadı', d.uri);
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Belge açılamadı.');
    }
  };

  const remove = (id: string) =>
    Alert.alert('Sil?', 'Bu belge silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteDocument(id);
          reload();
        },
      },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>{customer?.shortName ?? 'Müşteri'}</Text>
      <Text style={styles.sub}>Belgeler ({docs.length})</Text>

      <Text style={styles.section}>Kategori</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, cat === c && styles.chipActive]}
              onPress={() => setCat(c)}
            >
              <Text style={[styles.chipText, cat === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={styles.addBtn} onPress={pickImage} disabled={busy}>
          <Ionicons name="image-outline" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Galeriden Ekle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.indigo.default }]} onPress={addByUrl} disabled={busy}>
          <Ionicons name="link-outline" size={16} color="#fff" />
          <Text style={styles.addBtnText}>URL ile</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 14 }} />

      {docs.length === 0 && <Text style={styles.empty}>Henüz belge yok.</Text>}

      {docs.map(d => (
        <TouchableOpacity key={d.id} style={styles.card} onPress={() => open(d)}>
          <Ionicons
            name={iconFor(d)}
            size={26}
            color={brand.green}
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.docName} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={styles.docMeta}>
              {d.category ?? 'Belge'} · {d.uploadedAt.slice(0, 10)}
              {d.sizeBytes ? ` · ${(d.sizeBytes / 1024).toFixed(0)} KB` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => remove(d.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function iconFor(d: CustomerDocument): keyof typeof Ionicons.glyphMap {
  const m = (d.mimeType || '').toLowerCase();
  const name = d.name.toLowerCase();
  if (m.startsWith('image') || /\.(jpe?g|png|webp|gif)$/.test(name)) return 'image-outline';
  if (m.includes('pdf') || name.endsWith('.pdf')) return 'document-text-outline';
  return 'document-outline';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  title: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: 12, marginBottom: 12 },
  section: { color: brand.green, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { color: colors.text.secondary, fontSize: 11, fontWeight: '700' },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: brand.green,
    paddingVertical: 10,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 30 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  docName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  docMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});

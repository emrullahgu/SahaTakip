// Faz 45 — NcPhotoEvidenceScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { NonConformityRecord } from '../types';
import { listNonConformities, addNcPhoto, NC_KIND_COLOR, NC_KIND_LABEL, NC_KIND_ICON, NC_SEV_COLOR, NC_SEV_LABEL } from '../services/quality';

// Mock photo URIs (placeholder images)
const MOCK_PHOTOS = [
  'https://picsum.photos/seed/nc1/300/200',
  'https://picsum.photos/seed/nc2/300/200',
  'https://picsum.photos/seed/nc3/300/200',
  'https://picsum.photos/seed/nc4/300/200',
];

export default function NcPhotoEvidenceScreen() {
  const [items, setItems] = useState<NonConformityRecord[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => { setItems(await listNonConformities()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onAdd = async (ncId: string) => {
    const next = MOCK_PHOTOS[Math.floor(Math.random() * MOCK_PHOTOS.length)] + '?r=' + Math.random().toString(36).slice(2, 6);
    await addNcPhoto(ncId, next);
    Alert.alert('Eklendi', 'Fotoğraf kanıt olarak eklendi.');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}>
        {items.map(nc => (
          <View key={nc.id} style={[s.card, { borderLeftColor: NC_SEV_COLOR[nc.severity] }]}>
            <View style={s.head}>
              <View style={[s.iconBox, { backgroundColor: NC_KIND_COLOR[nc.kind] }]}>
                <Ionicons name={NC_KIND_ICON[nc.kind] as any} size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.code}>{nc.code}</Text>
                <Text style={s.title} numberOfLines={1}>{nc.title}</Text>
              </View>
              <View style={[s.sev, { backgroundColor: NC_SEV_COLOR[nc.severity] }]}>
                <Text style={s.sevT}>{NC_SEV_LABEL[nc.severity]}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.gal}>
              {nc.photoUris.map((u, i) => (
                <TouchableOpacity key={i} onPress={() => setPreview(u)}>
                  <Image source={{ uri: u }} style={s.thumb} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.addBox} onPress={() => onAdd(nc.id)}>
                <Ionicons name="camera" size={28} color="#06b6d4" />
                <Text style={s.addT}>Ekle</Text>
              </TouchableOpacity>
            </ScrollView>
            <Text style={s.meta}>{nc.photoUris.length} fotoğraf · {NC_KIND_LABEL[nc.kind]}</Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <TouchableOpacity style={s.previewBack} activeOpacity={1} onPress={() => setPreview(null)}>
          {preview && <Image source={{ uri: preview }} style={s.previewImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  code: { color: colors.text.faint, fontSize: 10, fontWeight: '800' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sev: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  sevT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  gal: { marginTop: spacing.sm },
  thumb: { width: 100, height: 75, borderRadius: radius.sm, marginRight: 6, backgroundColor: colors.bg.primary },
  addBox: { width: 100, height: 75, borderRadius: radius.sm, backgroundColor: colors.bg.primary, borderWidth: 2, borderColor: '#06b6d4', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  addT: { color: '#06b6d4', fontSize: 10, fontWeight: '700' },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  previewBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '90%', height: '70%' },
});

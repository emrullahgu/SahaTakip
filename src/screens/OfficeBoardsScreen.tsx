// OfficeBoardsScreen — Ofis panoları listesi (Notion-database benzeri kanban panolar).
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList, OfficeBoard } from '../types';
import { useAuth } from '../context/AuthContext';
import { listBoards, saveBoard, countCards, subscribeOffice } from '../services/officeWorkspace';
import EmptyState from '../components/EmptyState';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function OfficeBoardsScreen() {
  const nav = useNavigation<Nav>();
  const { user, profile } = useAuth();
  const [boards, setBoards] = useState<OfficeBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { setBoards((await listBoards()).filter(b => !b.archived)); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => subscribeOffice('office_boards', refresh), [refresh]);

  const create = async () => {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const b = await saveBoard({ title: name, createdBy: user?.id, createdByName: profile?.full_name ?? undefined });
      setTitle(''); setCreating(false);
      await refresh();
      nav.navigate('OfficeBoard', { boardId: b.id });
    } catch (e: any) {
      Alert.alert('Pano oluşturulamadı', e?.message || 'Hata');
    } finally { setBusy(false); }
  };

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><View style={s.center}><ActivityIndicator color={brand.green} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {boards.length === 0 ? (
          <EmptyState icon="grid-outline" title="Henüz pano yok" description="Projeler ve girişimler için ilk kanban panonuzu oluşturun." />
        ) : boards.map(b => (
          <TouchableOpacity key={b.id} style={s.card} onPress={() => nav.navigate('OfficeBoard', { boardId: b.id })} activeOpacity={0.85}>
            <Text style={s.cardIcon}>{b.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle} numberOfLines={1}>{b.title}</Text>
              <Text style={s.cardMeta}>{b.columns.length} kolon · {countCards(b)} kart</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.faint} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.newBtn} onPress={() => setCreating(true)} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={s.newBtnText}>Yeni Pano</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <Pressable style={s.modalBg} onPress={() => setCreating(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Yeni pano</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Pano adı (ör. Q3 Girişimleri)"
              placeholderTextColor={colors.text.faint}
              autoFocus
              onSubmitEditing={create}
            />
            <TouchableOpacity style={[s.newBtn, { marginTop: spacing.md }]} onPress={create} disabled={busy} activeOpacity={0.85}>
              <Text style={s.newBtnText}>Oluştur</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 90, gap: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  cardIcon: { fontSize: 26 },
  cardTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: brand.green, paddingVertical: 14, borderRadius: radius.md, marginTop: spacing.md },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.bg.card, borderRadius: radius.lg, padding: spacing.lg },
  sheetTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginBottom: spacing.md },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.text.primary, fontSize: typography.base },
});

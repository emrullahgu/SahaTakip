// FeedbackDetailScreen — POZ-DEV-335 Geri bildirim detay + durum güncelle
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, FeedbackEntry, FeedbackStatus } from '../types';
import { getFeedback, deleteFeedback, updateFeedbackStatus, FEEDBACK_CATEGORY_COLOR, FEEDBACK_CATEGORY_LABEL, FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL } from '../services/feedback';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FeedbackDetail'>;
type R = RouteProp<RootStackParamList, 'FeedbackDetail'>;

const STATUSES: FeedbackStatus[] = ['open', 'in_review', 'planned', 'closed'];

export default function FeedbackDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { entryId } = route.params;
  const [f, setF] = useState<FeedbackEntry | null>(null);

  const refresh = useCallback(async () => {
    setF((await getFeedback(entryId)) || null);
  }, [entryId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!f) {
    return <SafeAreaView style={s.safe} edges={['bottom']}><Text style={s.empty}>Kayıt yok</Text></SafeAreaView>;
  }

  const onDelete = () => {
    Alert.alert('Sil', 'Geri bildirim silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteFeedback(entryId); nav.goBack(); } },
    ]);
  };

  const setStatus = async (st: FeedbackStatus) => {
    await updateFeedbackStatus(entryId, st);
    refresh();
  };

  const catColor = FEEDBACK_CATEGORY_COLOR[f.category];

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: catColor }]}>
          <Text style={s.heroT}>{f.title}</Text>
          <Text style={s.heroS}>{FEEDBACK_CATEGORY_LABEL[f.category]} · {new Date(f.createdAt).toLocaleString('tr-TR')}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.msg}>{f.message}</Text>
        </View>

        {f.rating != null && (
          <View style={s.card}>
            <Text style={s.label}>Memnuniyet</Text>
            <View style={s.starRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <Ionicons key={i} name={i <= (f.rating || 0) ? 'star' : 'star-outline'} size={22} color="#f59e0b" />
              ))}
            </View>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.label}>Durum</Text>
          <View style={s.chipRow}>
            {STATUSES.map(st => (
              <TouchableOpacity key={st} style={[s.chip, f.status === st && { backgroundColor: FEEDBACK_STATUS_COLOR[st], borderColor: FEEDBACK_STATUS_COLOR[st] }]} onPress={() => setStatus(st)}>
                <Text style={[s.chipT, f.status === st && { color: '#fff' }]}>{FEEDBACK_STATUS_LABEL[st]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Row label="Yazar" value={f.authorName || '-'} />
          <Row label="Ekran" value={f.screen || '-'} />
          <Row label="Versiyon" value={f.appVersion || '-'} />
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0ea5e9' }]} onPress={() => nav.navigate('FeedbackForm', { entryId })}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={s.btnT}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={s.btnT}>Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  hero: { padding: spacing.md, borderRadius: radius.md },
  heroT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  heroS: { color: '#fff', opacity: 0.9, fontSize: typography.xs, marginTop: 4 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  msg: { color: colors.text.primary, fontSize: typography.sm, lineHeight: 20 },
  label: { color: colors.text.muted, fontSize: typography.xs },
  starRow: { flexDirection: 'row', gap: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.primary },
  chipT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: colors.text.muted, fontSize: typography.sm },
  rowValue: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, borderRadius: radius.md },
  btnT: { color: '#fff', fontWeight: '700' },
  empty: { color: colors.text.muted, fontStyle: 'italic', padding: spacing.md, textAlign: 'center' },
});

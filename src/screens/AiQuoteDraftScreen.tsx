// AiQuoteDraftScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { AiQuoteDraft, RootStackParamList } from '../types';
import { listQuoteDrafts, generateQuoteDraft } from '../services/aiAssistant';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const STATUS_COLOR: Record<AiQuoteDraft['status'], string> = { draft: '#64748b', approved: '#22c55e', rejected: '#ef4444' };
const STATUS_LABEL: Record<AiQuoteDraft['status'], string> = { draft: 'Taslak', approved: 'Onaylı', rejected: 'Red' };

export default function AiQuoteDraftScreen() {
  const [items, setItems] = useState<AiQuoteDraft[]>([]);
  const [name, setName] = useState('');
  const [survey, setSurvey] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigation<Nav>();
  const load = useCallback(async () => { setItems(await listQuoteDrafts()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onGen = async () => {
    if (!name.trim() || !survey.trim()) return;
    setBusy(true);
    try { await generateQuoteDraft(name, survey); setName(''); setSurvey(''); load(); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.head}>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Müşteri adı" placeholderTextColor={colors.text.faint} />
        <TextInput style={[s.input, { minHeight: 60 }]} value={survey} onChangeText={setSurvey} placeholder="Keşif notu" placeholderTextColor={colors.text.faint} multiline />
        <TouchableOpacity style={[s.btn, busy && { opacity: 0.5 }]} onPress={onGen} disabled={busy}>
          <Ionicons name={busy ? 'hourglass-outline' : 'sparkles'} size={18} color="#fff" />
          <Text style={s.btnT}>AI Teklif Oluştur</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('AiQuoteDraftDetail', { draftId: item.id })}>
            <View style={s.row}>
              <Ionicons name="document-text" size={20} color="#0ea5e9" />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.customerName}</Text>
                <Text style={s.sub}>{item.items.length} kalem · ₺{item.totalAmount.toLocaleString('tr-TR')}</Text>
                <Text style={s.tm}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
              </View>
              <View style={[s.b, { backgroundColor: STATUS_COLOR[item.status] }]}>
                <Text style={s.bT}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  head: { padding: spacing.sm, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0ea5e9', padding: spacing.sm, borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '700' },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  b: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

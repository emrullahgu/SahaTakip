// SatisfactionSurveysScreen — POZ-DEV-408
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, SatisfactionSurvey, SurveyStatus } from '../types';
import { listSurveys, saveSurvey, SURVEY_STATUS_LABEL, SURVEY_STATUS_COLOR } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'SatisfactionSurveys'>;

const FILTERS: Array<{ key: SurveyStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Tümü' }, { key: 'sent', label: 'Gönderildi' }, { key: 'completed', label: 'Tamamlandı' }, { key: 'declined', label: 'Reddedildi' }, { key: 'draft', label: 'Taslak' },
];

export default function SatisfactionSurveysScreen() {
  const navigation = useNavigation<Nav>();
  const initial = useRoute<R>().params?.status;
  const [filter, setFilter] = useState<SurveyStatus | 'all'>(initial || 'all');
  const [list, setList] = useState<SatisfactionSurvey[]>([]);
  const [cid, setCid] = useState('');
  const [woId, setWoId] = useState('');

  const load = useCallback(async () => { setList(await listSurveys()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => filter === 'all' ? list : list.filter(s => s.status === filter), [filter, list]);

  const send = async () => {
    if (!cid.trim()) { Alert.alert('Eksik', 'Müşteri ID gerekli.'); return; }
    await saveSurvey({ customerId: cid.trim(), workOrderId: woId.trim() || undefined, status: 'sent' });
    setCid(''); setWoId('');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.form}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TextInput style={[s.input, { flex: 1 }]} value={cid} onChangeText={setCid} placeholder="Müşteri ID" placeholderTextColor={colors.text.faint} />
          <TextInput style={[s.input, { flex: 1 }]} value={woId} onChangeText={setWoId} placeholder="İş emri (ops.)" placeholderTextColor={colors.text.faint} />
        </View>
        <TouchableOpacity style={s.send} onPress={send}>
          <Ionicons name="send-outline" size={16} color="#fff" /><Text style={s.sendT}>Anket Gönder</Text>
        </TouchableOpacity>
      </View>
      <View style={s.chips}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, filter === f.key && s.chipOn]}>
            <Text style={[s.chipT, filter === f.key && s.chipTOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Anket yok.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { borderLeftColor: SURVEY_STATUS_COLOR[item.status] }]} onPress={() => navigation.navigate('SurveyDetail', { surveyId: item.id })}>
            <Ionicons name="happy-outline" size={20} color={SURVEY_STATUS_COLOR[item.status]} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>Müşteri {item.customerId}{item.workOrderId ? ` · WO ${item.workOrderId}` : ''}</Text>
              <Text style={s.sub}>Gönderim: {new Date(item.sentAt).toLocaleDateString('tr-TR')}{item.ratingOverall ? ` · ${'★'.repeat(item.ratingOverall)}` : ''}</Text>
              <Text style={[s.tag, { backgroundColor: SURVEY_STATUS_COLOR[item.status] + '33', color: SURVEY_STATUS_COLOR[item.status] }]}>{SURVEY_STATUS_LABEL[item.status]}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  form: { padding: spacing.md, backgroundColor: colors.bg.secondary, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#ec4899', padding: 10, borderRadius: radius.sm },
  sendT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: spacing.md, paddingBottom: 0 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tag: { alignSelf: 'flex-start', fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});

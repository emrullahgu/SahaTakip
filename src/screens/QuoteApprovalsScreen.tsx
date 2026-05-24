// QuoteApprovalsScreen — POZ-DEV-406
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, QuoteApprovalRecord, QuoteApprovalDecision } from '../types';
import { listQuoteApprovals, recordQuoteApproval, APPROVAL_DECISION_LABEL, APPROVAL_DECISION_COLOR } from '../services/customerExperience';

type R = RouteProp<RootStackParamList, 'QuoteApprovals'>;

export default function QuoteApprovalsScreen() {
  const route = useRoute<R>();
  const quoteFilter = route.params?.quoteId;
  const [items, setItems] = useState<QuoteApprovalRecord[]>([]);
  const [qId, setQId] = useState(quoteFilter || '');
  const [note, setNote] = useState('');

  const load = useCallback(async () => { setItems(await listQuoteApprovals(quoteFilter)); }, [quoteFilter]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async (decision: QuoteApprovalDecision) => {
    if (!qId.trim()) { Alert.alert('Eksik', 'Teklif ID gerekli.'); return; }
    await recordQuoteApproval({ quoteId: qId.trim(), decision, note: note.trim() || undefined });
    setNote('');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.form}>
        <Text style={s.label}>Teklif ID</Text>
        <TextInput style={s.input} value={qId} onChangeText={setQId} editable={!quoteFilter} placeholder="quote_xxx" placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>Not</Text>
        <TextInput style={[s.input, { minHeight: 70 }]} value={note} onChangeText={setNote} multiline placeholder="opsiyonel" placeholderTextColor={colors.text.faint} />
        <View style={s.row}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={() => submit('approved')}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={s.btnT}>Onayla</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#f59e0b' }]} onPress={() => submit('revision_requested')}>
            <Ionicons name="refresh-outline" size={16} color="#fff" /><Text style={s.btnT}>Revizyon</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={() => submit('rejected')}>
            <Ionicons name="close-circle-outline" size={16} color="#fff" /><Text style={s.btnT}>Reddet</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz onay kaydı yok.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: APPROVAL_DECISION_COLOR[item.decision] }]}>
            <Ionicons name="document-text-outline" size={18} color={APPROVAL_DECISION_COLOR[item.decision]} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>{APPROVAL_DECISION_LABEL[item.decision]} · {item.quoteId}</Text>
              <Text style={s.sub}>{new Date(item.decidedAt).toLocaleString('tr-TR')}{item.note ? `\n${item.note}` : ''}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  form: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  label: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 4, marginTop: 4 },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  row: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});

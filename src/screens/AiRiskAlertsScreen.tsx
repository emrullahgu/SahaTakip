// AiRiskAlertsScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiRiskAlert } from '../types';
import { listRiskAlerts, dismissRisk, RISK_COLOR, RISK_LABEL, RISK_TYPE_LABEL } from '../services/aiAssistant';

export default function AiRiskAlertsScreen() {
  const [items, setItems] = useState<AiRiskAlert[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const load = useCallback(async () => { setItems(await listRiskAlerts()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = showDismissed ? items : items.filter(i => !i.dismissed);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <TouchableOpacity style={s.toggle} onPress={() => setShowDismissed(!showDismissed)}>
        <Ionicons name={showDismissed ? 'eye' : 'eye-off'} size={16} color={colors.text.muted} />
        <Text style={s.toggleT}>{showDismissed ? 'Gizlenenleri Gizle' : 'Gizlenenleri Göster'}</Text>
      </TouchableOpacity>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        ListEmptyComponent={<Text style={s.empty}>Risk uyarısı yok.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: RISK_COLOR[item.level], opacity: item.dismissed ? 0.5 : 1 }]}>
            <View style={s.row}>
              <Ionicons name="warning" size={22} color={RISK_COLOR[item.level]} />
              <View style={{ flex: 1 }}>
                <View style={s.head}>
                  <Text style={s.n}>{item.title}</Text>
                  <View style={[s.b, { backgroundColor: RISK_COLOR[item.level] }]}>
                    <Text style={s.bT}>{RISK_LABEL[item.level]}</Text>
                  </View>
                </View>
                <Text style={s.type}>{RISK_TYPE_LABEL[item.type]}</Text>
                <Text style={s.msg}>{item.message}</Text>
              </View>
            </View>
            {!item.dismissed && (
              <TouchableOpacity style={s.dismiss} onPress={async () => { await dismissRisk(item.id); load(); }}>
                <Text style={s.dismissT}>Gizle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, alignSelf: 'flex-end' },
  toggleT: { color: colors.text.muted, fontSize: typography.xs },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', flex: 1 },
  type: { color: colors.text.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  msg: { color: colors.text.primary, fontSize: typography.xs, marginTop: 4 },
  b: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  bT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  dismiss: { alignSelf: 'flex-end', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.border.primary },
  dismissT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
});

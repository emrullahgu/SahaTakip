// AiUsageLogsScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiUsageLog } from '../types';
import { listUsageLogs, FEATURE_LABEL, PROVIDER_LABEL } from '../services/aiAssistant';

export default function AiUsageLogsScreen() {
  const [items, setItems] = useState<AiUsageLog[]>([]);
  const load = useCallback(async () => { setItems(await listUsageLogs()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalCost = items.reduce((s, i) => s + i.costUsd, 0);
  const totalTokens = items.reduce((s, i) => s + i.promptTokens + i.completionTokens, 0);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.summary}>
        <View style={s.sBox}>
          <Text style={s.sV}>${totalCost.toFixed(3)}</Text>
          <Text style={s.sL}>Toplam Maliyet</Text>
        </View>
        <View style={s.sBox}>
          <Text style={s.sV}>{totalTokens.toLocaleString('tr-TR')}</Text>
          <Text style={s.sL}>Toplam Token</Text>
        </View>
        <View style={s.sBox}>
          <Text style={s.sV}>{items.length}</Text>
          <Text style={s.sL}>Çağrı</Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: item.success ? '#22c55e' : '#ef4444' }]}>
            <View style={s.row}>
              <Ionicons name={item.success ? 'checkmark-circle' : 'close-circle'} size={18} color={item.success ? '#22c55e' : '#ef4444'} />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{FEATURE_LABEL[item.feature]} · {PROVIDER_LABEL[item.provider]}</Text>
                <Text style={s.sub}>{item.promptTokens}+{item.completionTokens} token · {item.durationMs}ms · ${item.costUsd.toFixed(4)}</Text>
                <Text style={s.tm}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
                {item.errorMessage && <Text style={s.err}>{item.errorMessage}</Text>}
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  summary: { flexDirection: 'row', padding: spacing.sm, gap: 6 },
  sBox: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, alignItems: 'center' },
  sV: { color: '#ef4444', fontSize: typography.md, fontWeight: '800' },
  sL: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  err: { color: '#ef4444', fontSize: typography.xs, marginTop: 2 },
});

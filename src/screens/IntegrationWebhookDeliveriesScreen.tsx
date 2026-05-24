// IntegrationWebhookDeliveriesScreen — POZ-DEV-464
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, WebhookDelivery } from '../types';
import { listWebhookDeliveriesV2 } from '../services/enterpriseIntegrations';

type R = RouteProp<RootStackParamList, 'IntegrationWebhookDeliveries'>;

export default function IntegrationWebhookDeliveriesScreen() {
  const route = useRoute<R>();
  const webhookId = route.params?.webhookId;
  const [items, setItems] = useState<WebhookDelivery[]>([]);
  const load = useCallback(async () => {
    const all = await listWebhookDeliveriesV2();
    setItems(webhookId ? all.filter(d => d.webhookId === webhookId) : all);
  }, [webhookId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 60 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz teslimat yok.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, { borderLeftColor: item.success ? '#22c55e' : '#ef4444' }]}>
            <View style={s.row}>
              <Text style={[s.code, { color: item.success ? '#22c55e' : '#ef4444' }]}>{item.httpStatus}</Text>
              <Text style={s.n}>{item.event}</Text>
              <Text style={s.t}>{item.durationMs}ms</Text>
            </View>
            <Text style={s.sub}>{new Date(item.deliveredAt).toLocaleString('tr-TR')}</Text>
            {item.responseBody ? <Text style={s.body} numberOfLines={2}>{item.responseBody}</Text> : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  code: { fontSize: typography.md, fontWeight: '800', minWidth: 40 },
  n: { flex: 1, color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  t: { color: colors.text.muted, fontSize: typography.xs },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  body: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' },
});

// QuoteToOrderScreen — POZ-DEV-460
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { QuoteOrderConversion } from '../types';
import { listQuoteOrders, convertQuoteToOrder, ERP_VENDOR_LABEL, ERP_VENDOR_COLOR } from '../services/enterpriseIntegrations';

const STATUS_COLOR: Record<QuoteOrderConversion['status'], string> = { created: '#22c55e', pending: '#f59e0b', failed: '#ef4444' };
const STATUS_LABEL: Record<QuoteOrderConversion['status'], string> = { created: 'Oluşturuldu', pending: 'Beklemede', failed: 'Hata' };

export default function QuoteToOrderScreen() {
  const [items, setItems] = useState<QuoteOrderConversion[]>([]);
  const load = useCallback(async () => { setItems(await listQuoteOrders()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz dönüşüm yok. + ile teklifi siparişe çevir.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.b, { backgroundColor: ERP_VENDOR_COLOR[item.vendor] }]}>
                <Text style={s.bt}>{ERP_VENDOR_LABEL[item.vendor]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.orderNumber}</Text>
                <Text style={s.sub}>{item.customerName} · {new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
              </View>
              <View style={[s.st, { borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[s.stT, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            <Text style={s.amt}>₺{item.totalAmount.toLocaleString('tr-TR')}</Text>
          </View>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={async () => { await convertQuoteToOrder('mock-quote-' + Date.now(), 'Demo Müşteri', Math.round(Math.random() * 50000) + 5000, 'logo'); load(); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  b: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  bt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  st: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  stT: { fontSize: 9, fontWeight: '800' },
  amt: { color: '#22c55e', fontSize: typography.md, fontWeight: '800', marginTop: 6, textAlign: 'right' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
});

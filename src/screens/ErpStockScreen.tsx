// ErpStockScreen — POZ-DEV-458
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { ErpStockMapping } from '../types';
import { listErpStock, resetErpStock, ERP_VENDOR_LABEL, ERP_VENDOR_COLOR } from '../services/enterpriseIntegrations';

export default function ErpStockScreen() {
  const [items, setItems] = useState<ErpStockMapping[]>([]);
  const load = useCallback(async () => { setItems(await listErpStock()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Stok Eşleme ({items.length})</Text>
        <TouchableOpacity onPress={async () => { await resetErpStock(); load(); }} style={s.reset}>
          <Ionicons name="refresh-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const low = item.stockQty < 20;
          return (
            <View style={[s.card, { borderLeftColor: low ? '#ef4444' : '#22c55e' }]}>
              <View style={s.row}>
                <View style={[s.b, { backgroundColor: ERP_VENDOR_COLOR[item.vendor] }]}>
                  <Text style={s.bt}>{ERP_VENDOR_LABEL[item.vendor]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.n}>{item.name}</Text>
                  <Text style={s.sub}>{item.sku} · {item.externalCode}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.qty, { color: low ? '#ef4444' : colors.text.primary }]}>{item.stockQty} {item.unit}</Text>
                  <Text style={s.sub}>₺{item.unitPrice.toLocaleString('tr-TR')}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  reset: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  b: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  bt: { color: '#fff', fontSize: 9, fontWeight: '800' },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  qty: { fontSize: typography.sm, fontWeight: '800' },
});

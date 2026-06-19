// ErpInvoiceDraftsScreen — POZ-DEV-459
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { ErpInvoiceDraft } from '../types';
import { listInvoiceDrafts, createInvoiceDraft, sendInvoiceDraft, ERP_VENDOR_LABEL, ERP_VENDOR_COLOR } from '../services/enterpriseIntegrations';

const STATUS_COLOR: Record<ErpInvoiceDraft['status'], string> = { draft: '#64748b', sent: '#0ea5e9', accepted: '#22c55e', rejected: '#ef4444' };
const STATUS_LABEL: Record<ErpInvoiceDraft['status'], string> = { draft: 'Taslak', sent: 'Gönderildi', accepted: 'Kabul', rejected: 'Reddedildi' };

export default function ErpInvoiceDraftsScreen() {
  const [items, setItems] = useState<ErpInvoiceDraft[]>([]);
  const load = useCallback(async () => { setItems(await listInvoiceDrafts()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    await createInvoiceDraft({});
    load();
  };
  const send = async (id: string) => {
    await sendInvoiceDraft(id);
    Alert.alert('Gönderildi', 'Fatura ERP\'ye iletildi.');
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz fatura taslağı yok. + ile oluştur.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.b, { backgroundColor: ERP_VENDOR_COLOR[item.vendor] }]}>
                <Text style={s.bt}>{ERP_VENDOR_LABEL[item.vendor]}</Text>
              </View>
              <Text style={s.n}>{item.customerName}</Text>
              <View style={[s.st, { borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[s.stT, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            <Text style={s.sub}>{item.customerCode} · {item.lineCount} satır</Text>
            <View style={s.foot}>
              <Text style={s.amt}>₺{item.totalAmount.toLocaleString('tr-TR')} {item.currency}</Text>
              {item.status === 'draft' && (
                <TouchableOpacity onPress={() => send(item.id)} style={s.send}>
                  <Ionicons name="send-outline" size={14} color="#fff" />
                  <Text style={s.sendT}>Gönder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={create}>
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
  bt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  n: { flex: 1, color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  st: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  stT: { fontSize: 10, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  amt: { color: '#22c55e', fontSize: typography.md, fontWeight: '800' },
  send: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0ea5e9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  sendT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
});

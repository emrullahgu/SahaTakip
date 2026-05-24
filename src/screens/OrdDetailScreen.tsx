// Faz 59 — OrdDetailScreen (POZ-DEV-294)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getOrder, ORD_STATUS_LABEL, ORD_STATUS_COLOR, ORD_STATUS_ICON, ORD_CHANNEL_LABEL, nextStatus } from '../services/orders';
import type { RootStackParamList, Order } from '../types';

type Rt = RouteProp<RootStackParamList, 'OrdDetail'>;

export default function OrdDetailScreen() {
  const { params } = useRoute<Rt>();
  const [order, setOrder] = useState<Order | undefined>();
  useFocusEffect(useCallback(() => { (async () => setOrder(await getOrder(params.id)))(); }, [params.id]));

  if (!order) return (
    <SafeAreaView style={s.safe}>
      <View style={s.empty}><Text style={{ color: colors.text.muted }}>Yükleniyor…</Text></View>
    </SafeAreaView>
  );

  const next = nextStatus(order.status);
  const canAdvance = order.status !== 'cancelled' && order.status !== 'delivered' && next != null;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Text style={s.code}>{order.code}</Text>
            <Text style={s.cust}>{order.customerName}</Text>
          </View>
          <View style={[s.statusPill, { borderColor: ORD_STATUS_COLOR[order.status] }]}>
            <Ionicons name={ORD_STATUS_ICON[order.status] as any} size={14} color={ORD_STATUS_COLOR[order.status]} />
            <Text style={[s.statusT, { color: ORD_STATUS_COLOR[order.status] }]}>{ORD_STATUS_LABEL[order.status]}</Text>
          </View>
        </View>

        <View style={s.metaBox}>
          <Meta label="Sipariş Tarihi" value={order.orderDate} />
          {order.deliveryDate && <Meta label="Teslimat" value={order.deliveryDate} />}
          <Meta label="Kanal" value={ORD_CHANNEL_LABEL[order.channel]} />
          <Meta label="Temsilci" value={order.salesRepName} />
          <Meta label="Ödeme" value={order.paymentTerms} />
        </View>

        <Text style={s.sectionT}>Kalemler ({order.items.length})</Text>
        {order.items.map(it => (
          <View key={it.id} style={s.itemCard}>
            <View style={s.itemHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemN}>{it.productName}</Text>
                <Text style={s.itemSku}>{it.sku} · {it.qty} {it.unit} × ₺{it.unitPrice.toLocaleString('tr-TR')}</Text>
              </View>
              <Text style={s.itemT}>₺{it.total.toLocaleString('tr-TR')}</Text>
            </View>
            {it.discount > 0 && (
              <View style={s.disc}>
                <Ionicons name="pricetag" size={12} color="#f59e0b" />
                <Text style={s.discT}>İskonto: ₺{it.discount.toLocaleString('tr-TR')}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={s.summary}>
          <Row label="Ara Toplam" value={`₺${order.subtotal.toLocaleString('tr-TR')}`} />
          {order.discountTotal > 0 && <Row label="İskonto" value={`-₺${order.discountTotal.toLocaleString('tr-TR')}`} color="#f59e0b" />}
          <Row label="KDV" value={`₺${order.vatTotal.toLocaleString('tr-TR')}`} />
          <View style={s.divider} />
          <Row label="GENEL TOPLAM" value={`₺${order.total.toLocaleString('tr-TR')}`} bold />
        </View>

        {order.notes && (
          <View style={s.notes}>
            <Ionicons name="document-text" size={16} color="#3b82f6" />
            <Text style={s.notesT}>{order.notes}</Text>
          </View>
        )}

        <View style={s.actions}>
          {canAdvance && next && (
            <TouchableOpacity
              style={[s.btn, { backgroundColor: ORD_STATUS_COLOR[next] }]}
              activeOpacity={0.85}
              onPress={() => Alert.alert('Durum Güncellendi', `Sipariş "${ORD_STATUS_LABEL[next]}" durumuna geçirildi (demo).`)}
            >
              <Ionicons name="arrow-forward" size={16} color="#fff" />
              <Text style={s.btnT}>{ORD_STATUS_LABEL[next]}'e Geçir</Text>
            </TouchableOpacity>
          )}
          {(order.status === 'confirmed' || order.status === 'preparing' || order.status === 'shipped' || order.status === 'delivered') && (
            <TouchableOpacity
              style={[s.btn, { backgroundColor: '#06b6d4' }]}
              activeOpacity={0.85}
              onPress={() => Alert.alert('İrsaliye/Fatura', 'İrsaliye taslağı oluşturuldu (demo).')}
            >
              <Ionicons name="receipt" size={16} color="#fff" />
              <Text style={s.btnT}>İrsaliye/Fatura</Text>
            </TouchableOpacity>
          )}
        </View>

        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <TouchableOpacity
            style={[s.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444', marginTop: spacing.sm }]}
            activeOpacity={0.7}
            onPress={() => Alert.alert('İptal', 'Sipariş iptal edilsin mi?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'İptal Et', style: 'destructive', onPress: () => Alert.alert('İptal Edildi', 'Sipariş iptal edildi (demo).') },
            ])}
          >
            <Ionicons name="close-circle" size={16} color="#ef4444" />
            <Text style={[s.btnT, { color: '#ef4444' }]}>Siparişi İptal Et</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaL}>{label}</Text>
      <Text style={s.metaV}>{value}</Text>
    </View>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={s.sumRow}>
      <Text style={[s.sumL, bold && { fontWeight: '800', color: colors.text.primary }]}>{label}</Text>
      <Text style={[s.sumV, { color: color ?? colors.text.primary }, bold && { fontWeight: '800', fontSize: typography.md, color: '#22c55e' }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  code: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  cust: { color: colors.text.muted, fontSize: typography.sm, marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  statusT: { fontSize: typography.xs, fontWeight: '700' },
  metaBox: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaL: { color: colors.text.muted, fontSize: typography.xs },
  metaV: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  itemCard: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemN: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  itemSku: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  itemT: { color: '#22c55e', fontSize: typography.sm, fontWeight: '800' },
  disc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  discT: { color: '#f59e0b', fontSize: typography.xs },
  summary: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumL: { color: colors.text.muted, fontSize: typography.sm },
  sumV: { fontSize: typography.sm, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border.primary },
  notes: { flexDirection: 'row', gap: 8, backgroundColor: '#3b82f622', padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#3b82f644' },
  notesT: { color: colors.text.primary, fontSize: typography.xs, flex: 1, fontStyle: 'italic' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  btn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: spacing.md, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
});

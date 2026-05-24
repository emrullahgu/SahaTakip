// Faz 59 — OrdRecurringScreen (POZ-DEV-295)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listRecurringOrders, ORD_RECURRING_FREQ_LABEL } from '../services/orders';
import type { OrdRecurringTemplate } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { FlatList } from 'react-native';

const FREQ_COLOR: Record<OrdRecurringTemplate['frequency'], string> = {
  weekly: '#3b82f6', biweekly: '#06b6d4', monthly: '#8b5cf6', quarterly: '#f59e0b',
};

export default function OrdRecurringScreen() {
  const [items, setItems] = useState<OrdRecurringTemplate[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listRecurringOrders()))(); }, []));

  const active = items.filter(i => i.active).length;
  const totalEst = items.filter(i => i.active).reduce((a, i) => a + i.estimatedTotal, 0);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={t => t.id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={
          <>
            <View style={s.intro}>
              <Ionicons name="repeat" size={48} color="#8b5cf6" />
              <Text style={s.introT}>Tekrarlayan Siparişler</Text>
              <Text style={s.introD}>Sözleşmeli müşteriler için otomatik sipariş şablonları</Text>
            </View>

            <View style={s.kpiRow}>
              <Kpi label="Toplam Şablon" value={items.length.toString()} color="#8b5cf6" />
              <Kpi label="Aktif" value={active.toString()} color="#22c55e" />
              <Kpi label="Aylık Beklenen" value={`₺${(totalEst / 1000).toFixed(0)}K`} color="#f97316" />
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity style={s.btnSec} activeOpacity={0.85} onPress={() => Alert.alert('Yeni Şablon', 'Tekrarlayan sipariş şablonu oluştur (demo).')}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.btnT}>Yeni Şablon</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnSec, { backgroundColor: '#06b6d4' }]} activeOpacity={0.85} onPress={() => Alert.alert('Tetikle', 'Bekleyen tüm şablonlar şimdi çalıştırıldı (demo).')}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={s.btnT}>Şimdi Tetikle</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionT}>Şablonlar</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="repeat-outline"
            title="Şablon yok"
            subtitle="Henüz periyodik bir sipariş şablonu tanımlanmadı."
            actionLabel="+ Yeni Şablon"
            onAction={() => Alert.alert('Yeni Şablon', 'Tıklanabilir (demo)')}
          />
        }
        renderItem={({ item: t }) => (
          <View key={t.id} style={[s.card, { borderLeftColor: FREQ_COLOR[t.frequency], opacity: t.active ? 1 : 0.55, marginBottom: spacing.sm }]}>
            <View style={s.cardHead}>
              <View style={[s.iconBox, { backgroundColor: FREQ_COLOR[t.frequency] + '22' }]}>
                <Ionicons name="repeat" size={20} color={FREQ_COLOR[t.frequency]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardT}>{t.name}</Text>
                <Text style={s.cardD}>{t.customerName}</Text>
              </View>
              <View style={[s.pill, { backgroundColor: t.active ? '#22c55e22' : '#94a3b822', borderColor: t.active ? '#22c55e' : '#94a3b8' }]}>
                <Text style={[s.pillT, { color: t.active ? '#22c55e' : '#94a3b8' }]}>{t.active ? 'Aktif' : 'Pasif'}</Text>
              </View>
            </View>
            <View style={s.metaRow}>
              <View style={s.metaCol}>
                <Text style={s.metaL}>Sıklık</Text>
                <Text style={s.metaV}>{ORD_RECURRING_FREQ_LABEL[t.frequency]}</Text>
              </View>
              <View style={s.metaCol}>
                <Text style={s.metaL}>Sonraki Çalışma</Text>
                <Text style={s.metaV}>{t.nextRun}</Text>
              </View>
              <View style={s.metaCol}>
                <Text style={s.metaL}>Kalem</Text>
                <Text style={s.metaV}>{t.itemCount}</Text>
              </View>
              <View style={s.metaCol}>
                <Text style={s.metaL}>Tutar</Text>
                <Text style={[s.metaV, { color: '#22c55e' }]}>₺{t.estimatedTotal.toLocaleString('tr-TR')}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.kpi, { borderColor: color }]}>
      <Text style={[s.kpiV, { color }]}>{value}</Text>
      <Text style={s.kpiL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  intro: { alignItems: 'center', padding: spacing.md, gap: 4 },
  introT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  introD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  kpiV: { fontSize: typography.lg, fontWeight: '800' },
  kpiL: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  btnSec: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: '#8b5cf6' },
  btnT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  sectionT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: spacing.sm },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  cardD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  pillT: { fontSize: typography.xs, fontWeight: '700' },
  metaRow: { flexDirection: 'row', backgroundColor: colors.bg.primary, padding: spacing.sm, borderRadius: radius.sm, gap: spacing.sm },
  metaCol: { flex: 1 },
  metaL: { color: colors.text.muted, fontSize: typography.xs },
  metaV: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', marginTop: 2 },
});

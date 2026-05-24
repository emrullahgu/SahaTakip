// WeeklyReportsScreen — POZ-DEV-249 Haftalık raporlar
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, WeeklyReport } from '../types';
import { listWeeklyReports, generateWeeklyReport, currentWeekStart } from '../services/osos';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WeeklyReportsScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<WeeklyReport[]>([]);
  const refresh = useCallback(async () => { setItems(await listWeeklyReports()); }, []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onGenerate = async () => {
    const r = await generateWeeklyReport(currentWeekStart());
    if (!r) return Alert.alert('Veri yok', 'Bu hafta için okuma bulunamadı');
    Alert.alert('Tamam', 'Haftalık rapor oluşturuldu');
    refresh();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={r => r.id}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View style={s.headerRow}>
            <Text style={s.title}>Haftalık Raporlar</Text>
            <TouchableOpacity style={s.genBtn} onPress={onGenerate}>
              <Ionicons name="sync-outline" size={16} color="#fff" />
              <Text style={s.genBtnText}>Bu hafta için oluştur</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="bar-chart-outline"
            title="Henüz rapor yok"
            subtitle="Bu haftanın okumalarından rapor üretmek için üstteki butona basın."
          />
        }
        renderItem={({ item: r }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('WeeklyReportDetail', { reportId: r.id })}>
            <View style={s.icon}><Ionicons name="bar-chart-outline" size={20} color="#eab308" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{r.weekStart.slice(0, 10)} — {r.weekEnd.slice(0, 10)}</Text>
              <Text style={s.cardMeta}>Çekiş: {r.totalImportKwh.toLocaleString('tr-TR')} kWh · Veriş: {r.totalExportKwh.toLocaleString('tr-TR')} kWh</Text>
              <Text style={s.cardMeta}>Demand: {r.peakDemandKw.toFixed(1)} kW</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eab308', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  genBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.xs },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: '#eab30822', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});

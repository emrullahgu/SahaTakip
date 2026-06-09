import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import RowMenu from '../components/RowMenu';
import PressableScale from '../components/PressableScale';
import { TabParamList, RootStackParamList } from '../types';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { a11yButton, a11yInput } from '../utils/a11y';
import { statusColor, priorityColor, isSlaBreached } from '../services/workOrderFlow';

type WorkOrdersNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'WorkOrders'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const FILTERS = ['Tümü', 'Bekliyor', 'Tamamlandı', 'Gecikti'];

// Mock work orders assigned to field worker
export default function WorkOrdersScreen() {
  const navigation = useNavigation<WorkOrdersNavProp>();
  const { workOrders, deleteWorkOrder, refresh } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } };
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [searchText, setSearchText] = useState('');

  // Yalnızca gerçek iş emirleri gösterilir (canlı veri). Veri yoksa boş durum.
  const realOrders = workOrders.map(w => ({
    id: w.id,
    title: w.serviceName,
    location: w.client,
    device: w.engineer || '-',
    date: w.date || (w.plannedStart ? w.plannedStart.slice(0, 10) : ''),
    status: w.status,
    priority: w.priority,
    breached: isSlaBreached(w),
  }));
  const source = realOrders;

  const filtered = source.filter(o => {
    const matchFilter =
      activeFilter === 'Tümü' ||
      o.status === activeFilter ||
      (activeFilter === 'Gecikti' && o.breached);
    const matchSearch =
      o.title.toLowerCase().includes(searchText.toLowerCase()) ||
      o.location.toLowerCase().includes(searchText.toLowerCase());
    return matchFilter && matchSearch;
  });

  const total = source.length;
  const done = source.filter(o => o.status?.trim().toLowerCase() === 'tamamlandı').length;
  const waiting = source.filter(o => {
    const s = o.status?.trim().toLowerCase();
    return s === 'bekliyor' || s === 'atandı';
  }).length;
  const late = source.filter(o => o.breached || o.status?.trim().toLowerCase() === 'gecikti').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Screen Header */}
        <View style={styles.header}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8} {...a11yButton('Geri')}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>İş Emirlerim</Text>
            <Text style={styles.subtitle}>Tarafınıza atanan iş emirleri</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('NewWorkOrder')}
            activeOpacity={0.85}
            {...a11yButton('İş emri ekle')}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>İş Emri Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.text.faint} />
          <TextInput
            style={styles.searchInput}
            placeholder="İş emri ara..."
            placeholderTextColor={colors.text.faint}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
            {...a11yInput('İş emri ara', searchText)}
          />
        </View>

        {/* Filter Badges */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filter, activeFilter === f && styles.filterActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilter === f }}
              accessibilityLabel={`Filtre: ${f}`}
            >
              <Text
                style={[styles.filterText, activeFilter === f && styles.filterTextActive]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="clipboard-outline" size={16} color={colors.text.muted} />
            <Text style={styles.statVal}>{total}</Text>
            <Text style={styles.statLbl}>Toplam</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.emerald.default} />
            <Text style={[styles.statVal, { color: colors.emerald.default }]}>{done}</Text>
            <Text style={styles.statLbl}>Tamamlandı</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={16} color={colors.amber.default} />
            <Text style={[styles.statVal, { color: colors.amber.default }]}>{waiting}</Text>
            <Text style={styles.statLbl}>Bekliyor</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.rose.default} />
            <Text style={[styles.statVal, { color: colors.rose.default }]}>{late}</Text>
            <Text style={styles.statLbl}>Gecikti</Text>
          </View>
        </View>

        {/* List */}
        <FlatList
          {...FLATLIST_DEFAULTS}
          data={filtered}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.muted} />}
          renderItem={({ item }) => (
            <PressableScale
              onPress={() =>
                realOrders.find(r => r.id === item.id) &&
                navigation.navigate('WorkOrderDetail', { workOrderId: item.id })
              }
              style={[
                styles.card,
                (item.breached || item.status === 'Gecikti') && {
                  borderColor: colors.rose.default,
                  borderWidth: 1.5,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSub}>{item.location}</Text>
                  <Text style={styles.cardDevice}>{item.device}</Text>
                  {item.priority && (
                    <View style={[styles.priorityChip, { backgroundColor: priorityColor(item.priority) }]}>
                      <Text style={styles.priorityText}>{item.priority}</Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[styles.statusPill, { backgroundColor: statusColor(item.status as any) }]}>
                    <Text style={styles.statusPillText}>{item.status}</Text>
                  </View>
                  <RowMenu
                    items={[
                      {
                        label: 'Detay',
                        icon: 'open-outline',
                        onPress: () =>
                          realOrders.find(r => r.id === item.id)
                            ? navigation.navigate('WorkOrderDetail', { workOrderId: item.id })
                            : Alert.alert('Demo Verisi', 'Bu bir örnek iş emridir, detayı bulunmamaktadır.'),
                      },
                      {
                        label: 'Sil',
                        icon: 'trash-outline',
                        destructive: true,
                        confirm: `${item.title} iş emri silinecek. Emin misiniz?`,
                        confirmTitle: 'Silinsin mi?',
                        onPress: () => { void deleteWorkOrder(item.id); },
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={12} color={colors.text.faint} />
                  <Text style={styles.dateText}>{item.date || '-'}</Text>
                </View>
                {item.status !== 'Tamamlandı' && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      realOrders.find(r => r.id === item.id)
                        ? navigation.navigate('WorkOrderDetail', { workOrderId: item.id })
                        : navigation.navigate('NewService')
                    }
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Aç</Text>
                  </TouchableOpacity>
                )}
              </View>
            </PressableScale>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-outline"
              title="İş emri bulunamadı"
              subtitle="Filtreleri veya aramayı değiştirerek tekrar deneyebilirsiniz."
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  backBtn: { padding: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.indigo.default,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  addBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '900' },
  subtitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filter: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.card,
  },
  filterActive: { backgroundColor: colors.indigo.default },
  filterText: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing.sm,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: {
    fontSize: typography.md,
    color: colors.text.primary,
    fontWeight: '800',
  },
  statLbl: { fontSize: 9, color: colors.text.faint },
  list: { paddingBottom: 24 },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardInfo: { flex: 1, marginRight: spacing.sm },
  cardTitle: {
    fontSize: typography.md,
    color: colors.text.primary,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: typography.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  cardDevice: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    marginTop: 3,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: typography.xs, color: colors.text.faint },
  actionBtn: {
    backgroundColor: colors.rose.default,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  actionBtnText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  priorityChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 6,
  },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyText: { fontSize: typography.sm, color: colors.text.faint },
});

// VehiclesScreen — POZ-DEV-060, 061
// Araç listesi + plaka arama + vade uyarı bandı.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
 FlatList,
  RefreshControl,} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { a11yButton, a11yInput } from '../utils/a11y';
import {
  listVehicles,
  deleteVehicle,
  listVehicleAlerts,
  VehicleAlert,
} from '../services/vehicles';
import { Vehicle, RootStackParamList } from '../types';
import EmptyState from '../components/EmptyState';
import RowMenu from '../components/RowMenu';
import PressableScale from '../components/PressableScale';
import { FLATLIST_DEFAULTS } from '../utils/perf';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Vehicles'>;

export default function VehiclesScreen() {
  const navigation = useNavigation<Nav>();
  const { showToast } = useAppContext();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<VehicleAlert[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setItems(await listVehicles());
    setAlerts(await listVehicleAlerts(30));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = items.filter(v => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.plate.toLowerCase().includes(q) ||
      (v.brand ?? '').toLowerCase().includes(q) ||
      (v.model ?? '').toLowerCase().includes(q) ||
      (v.driverName ?? '').toLowerCase().includes(q)
    );
  });

  const onDelete = (v: Vehicle) => {
    Alert.alert('Sil', `"${v.plate}" aracı silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteVehicle(v.id);
          showToast(`${v.plate} silindi.`);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Araçlar ({items.length})</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('VehicleForm')}
          {...a11yButton('Yeni araç ekle')}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          placeholder="Plaka, marka, sürücü"
          placeholderTextColor={colors.text.faint}
          returnKeyType="search"
          autoCorrect={false}
          {...a11yInput('Araç ara', search)}
        />
      </View>

      {alerts.length > 0 && (
        <View style={styles.alertBar}>
          <Ionicons name="warning-outline" size={16} color={colors.rose.default} />
          <Text style={styles.alertText}>
            {alerts.length} araçta yaklaşan muayene/sigorta vadesi
          </Text>
        </View>
      )}

      <FlatList
        {...FLATLIST_DEFAULTS}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.muted} />}
        renderItem={({ item }) => {
          const vAlerts = alerts.filter(a => a.vehicle.id === item.id);
          return (
            <PressableScale
              style={styles.card}
              onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
              onLongPress={() => onDelete(item)}
            >
              <View style={styles.iconBox}>
                <Ionicons name="car-outline" size={18} color={brand.blueLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plate}>{item.plate || '—'}</Text>
                <Text style={styles.cardMeta}>
                  {[item.brand, item.model].filter(Boolean).join(' ')}
                  {item.year ? ` · ${item.year}` : ''}
                  {item.driverName ? ` · ${item.driverName}` : ''}
                </Text>
                {vAlerts.length > 0 && (
                  <Text style={styles.warnText}>
                    {vAlerts
                      .map(a =>
                        `${a.kind === 'inspection' ? 'Muayene' : 'Sigorta'}: ${a.daysLeft} gün`,
                      )
                      .join(' · ')}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 4 }}>
                {typeof item.kmTotal === 'number' && (
                  <Text style={styles.km}>{item.kmTotal.toLocaleString('tr-TR')} km</Text>
                )}
                <RowMenu
                  items={[
                    { label: 'Detay', icon: 'eye-outline', onPress: () => navigation.navigate('VehicleDetail', { vehicleId: item.id }) },
                    { label: 'Düzenle', icon: 'create-outline', onPress: () => navigation.navigate('VehicleForm', { vehicleId: item.id }) },
                    { label: 'Sil', icon: 'trash-outline', destructive: true, confirm: `"${item.plate}" silinsin mi?`, confirmTitle: 'Aracı Sil', onPress: async () => { await deleteVehicle(item.id); showToast(`${item.plate} silindi.`); load(); } },
                  ]}
                />
              </View>
            </PressableScale>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="car-outline"
            title="Henüz araç yok"
            subtitle="Filo takibine başlamak için araç ekleyin."
            actionLabel="+ Yeni Araç"
            onAction={() => navigation.navigate('VehicleForm')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  newBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    paddingHorizontal: 12,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
  },
  search: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.sm,
    paddingVertical: 10,
  },
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.rose.bg,
    borderWidth: 1,
    borderColor: colors.rose.border,
    borderRadius: radius.md,
  },
  alertText: { color: colors.rose.default, fontSize: typography.xs, fontWeight: '700' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.indigo.bg,
    borderColor: colors.indigo.border,
  },
  plate: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  cardMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  warnText: { color: colors.rose.default, fontSize: typography.xs, marginTop: 2, fontWeight: '700' },
  km: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
});

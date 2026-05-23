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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listVehicles,
  deleteVehicle,
  listVehicleAlerts,
  VehicleAlert,
} from '../services/vehicles';
import { Vehicle, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Vehicles'>;

export default function VehiclesScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [alerts, setAlerts] = useState<VehicleAlert[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setItems(await listVehicles());
    setAlerts(await listVehicleAlerts(30));
  }, []);

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

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="car-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Henüz araç yok.</Text>
          </View>
        ) : (
          filtered.map(v => {
            const vAlerts = alerts.filter(a => a.vehicle.id === v.id);
            return (
              <TouchableOpacity
                key={v.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('VehicleDetail', { vehicleId: v.id })}
                onLongPress={() => onDelete(v)}
              >
                <View style={styles.iconBox}>
                  <Ionicons name="car-outline" size={18} color={brand.blueLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plate}>{v.plate || '—'}</Text>
                  <Text style={styles.cardMeta}>
                    {[v.brand, v.model].filter(Boolean).join(' ')}
                    {v.year ? ` · ${v.year}` : ''}
                    {v.driverName ? ` · ${v.driverName}` : ''}
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
                <View style={{ alignItems: 'flex-end' }}>
                  {typeof v.kmTotal === 'number' && (
                    <Text style={styles.km}>{v.kmTotal.toLocaleString('tr-TR')} km</Text>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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

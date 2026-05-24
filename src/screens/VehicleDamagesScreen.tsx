// VehicleDamagesScreen — POZ-DEV-062
// Araç hasarları listesi (filtreli).

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listDamages,
  listDamagesByVehicle,
  deleteDamage,
} from '../services/vehicleDamages';
import { listVehicles } from '../services/vehicles';
import RowMenu from '../components/RowMenu';
import {
  VehicleDamage,
  VehicleDamageSeverity,
  VehicleDamageStatus,
  Vehicle,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VehicleDamages'>;
type Rt = RouteProp<RootStackParamList, 'VehicleDamages'>;

const SEVERITY_COLOR: Record<VehicleDamageSeverity, string> = {
  low: '#f59e0b',
  medium: '#f97316',
  high: '#dc2626',
};

const STATUS_LABEL: Record<VehicleDamageStatus, string> = {
  open: 'Açık',
  'in-progress': 'Onarımda',
  repaired: 'Onarıldı',
};

const STATUS_COLOR: Record<VehicleDamageStatus, string> = {
  open: '#dc2626',
  'in-progress': '#f59e0b',
  repaired: '#16a34a',
};

export default function VehicleDamagesScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const vehicleId = route.params?.vehicleId;

  const [items, setItems] = useState<VehicleDamage[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});

  const load = useCallback(async () => {
    const all = vehicleId ? await listDamagesByVehicle(vehicleId) : await listDamages();
    setItems(all);
    const vs = await listVehicles();
    const map: Record<string, Vehicle> = {};
    vs.forEach(v => (map[v.id] = v));
    setVehicles(map);
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onDelete = (d: VehicleDamage) => {
    Alert.alert('Sil', 'Hasar kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteDamage(d.id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Hasarlar ({items.length})</Text>
        {vehicleId && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('VehicleDamageForm', { vehicleId })}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newBtnText}>Yeni</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="happy-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Hasar kaydı yok.</Text>
          </View>
        ) : (
          items.map(d => {
            const v = vehicles[d.vehicleId];
            return (
              <TouchableOpacity
                key={d.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('VehicleDamageForm', {
                    vehicleId: d.vehicleId,
                    damageId: d.id,
                  })
                }
                onLongPress={() => onDelete(d)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.sevBar,
                    { backgroundColor: SEVERITY_COLOR[d.severity] },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.plate}>{v?.plate ?? '—'}</Text>
                  <Text style={styles.desc} numberOfLines={2}>
                    {d.description || 'Açıklama yok'}
                  </Text>
                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.statusChip,
                        { borderColor: STATUS_COLOR[d.status] },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: STATUS_COLOR[d.status] }]}>
                        {STATUS_LABEL[d.status]}
                      </Text>
                    </View>
                    {d.photos.length > 0 && (
                      <View style={styles.photoChip}>
                        <Ionicons name="camera-outline" size={12} color={colors.text.muted} />
                        <Text style={styles.photoText}>{d.photos.length}</Text>
                      </View>
                    )}
                    <Text style={styles.date}>
                      {new Date(d.reportedAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                <RowMenu
                  items={[
                    { label: 'Düzenle', icon: 'create-outline', onPress: () => navigation.navigate('VehicleDamageForm', { vehicleId: d.vehicleId, damageId: d.id }) },
                    { label: 'Sil', icon: 'trash-outline', destructive: true, confirm: 'Hasar kaydı silinsin mi?', confirmTitle: 'Hasarı Sil', onPress: async () => { await deleteDamage(d.id); load(); } },
                  ]}
                />
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
    overflow: 'hidden',
  },
  sevBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  plate: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  desc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  photoChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  photoText: { color: colors.text.muted, fontSize: typography.xs },
  date: { color: colors.text.muted, fontSize: typography.xs, marginLeft: 'auto' },
});

// VehicleLogsScreen — POZ-DEV-061
// Tüm araç kayıtları (filtreli).

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { listLogs, listLogsByVehicle, deleteLog } from '../services/vehicleLogs';
import { listVehicles } from '../services/vehicles';
import RowMenu from '../components/RowMenu';
import {
  VehicleLog,
  VehicleLogKind,
  Vehicle,
  RootStackParamList,
} from '../types';

type Rt = RouteProp<RootStackParamList, 'VehicleLogs'>;

const LOG_META: Record<VehicleLogKind, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  km: { label: 'Km', icon: 'speedometer-outline', color: '#3b82f6' },
  fuel: { label: 'Yakıt', icon: 'water-outline', color: '#f59e0b' },
  maintenance: { label: 'Bakım', icon: 'construct-outline', color: '#a855f7' },
  inspection: { label: 'Muayene', icon: 'shield-checkmark-outline', color: '#22c55e' },
  insurance: { label: 'Sigorta', icon: 'document-text-outline', color: '#06b6d4' },
};

const FILTERS: ('Tümü' | VehicleLogKind)[] = [
  'Tümü',
  'km',
  'fuel',
  'maintenance',
  'inspection',
  'insurance',
];

export default function VehicleLogsScreen() {
  const route = useRoute<Rt>();
  const vehicleId = route.params?.vehicleId;
  const initialKind = route.params?.kind;

  const [items, setItems] = useState<VehicleLog[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(initialKind ?? 'Tümü');
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = vehicleId ? await listLogsByVehicle(vehicleId) : await listLogs();
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

  const filtered = filter === 'Tümü' ? items : items.filter(i => i.kind === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'Tümü' ? 'Tümü' : LOG_META[f].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Kayıt yok.</Text>
          </View>
        ) : (
          filtered.map(l => {
            const m = LOG_META[l.kind];
            const v = vehicles[l.vehicleId];
            return (
              <View key={l.id} style={styles.card}>
                <View
                  style={[
                    styles.icon,
                    { borderColor: m.color, backgroundColor: m.color + '22' },
                  ]}
                >
                  <Ionicons name={m.icon} size={16} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {v?.plate ?? '—'} · {m.label}
                  </Text>
                  <Text style={styles.meta}>
                    {new Date(l.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {typeof l.km === 'number' ? ` · ${l.km.toLocaleString('tr-TR')} km` : ''}
                    {typeof l.liters === 'number' ? ` · ${l.liters} L` : ''}
                  </Text>
                  {l.note ? <Text style={styles.note}>{l.note}</Text> : null}
                </View>
                {l.receiptUri ? (
                  <TouchableOpacity onPress={() => setPreviewUri(l.receiptUri!)} activeOpacity={0.8}>
                    <Image source={{ uri: l.receiptUri }} style={styles.thumb} resizeMode="cover" />
                  </TouchableOpacity>
                ) : null}
                {typeof l.totalCost === 'number' && (
                  <Text style={styles.cost}>{l.totalCost.toLocaleString('tr-TR')} ₺</Text>
                )}
                <RowMenu
                  items={[
                    { label: 'Sil', icon: 'trash-outline', destructive: true, confirm: `${m.label} kaydı silinsin mi?`, confirmTitle: 'Kaydı Sil', onPress: async () => { await deleteLog(l.id); load(); } },
                  ]}
                />
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <TouchableOpacity style={styles.previewBackdrop} activeOpacity={1} onPress={() => setPreviewUri(null)}>
          {previewUri && <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="contain" />}
          <View style={styles.previewClose}><Ionicons name="close" size={28} color="#fff" /></View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  thumb: { width: 38, height: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '92%', height: '80%' },
  previewClose: { position: 'absolute', top: 48, right: 24 },
  filterRow: { padding: spacing.lg, paddingBottom: spacing.sm, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: { backgroundColor: brand.green, borderColor: brand.green },
  chipText: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.muted, fontSize: typography.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  note: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' },
  cost: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
});

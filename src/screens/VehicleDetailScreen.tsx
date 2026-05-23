// VehicleDetailScreen — POZ-DEV-060, 061, 062, 063
// Araç özeti + km/yakıt/bakım/muayene logları + hasar + rota erişimi.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { getVehicle } from '../services/vehicles';
import {
  listLogsByVehicle,
  fuelSummary,
  FuelSummary,
} from '../services/vehicleLogs';
import { listDamagesByVehicle } from '../services/vehicleDamages';
import { totalDistanceKm } from '../services/vehicleRoutes';
import {
  Vehicle,
  VehicleLog,
  VehicleLogKind,
  VehicleDamage,
  RootStackParamList,
} from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VehicleDetail'>;
type Rt = RouteProp<RootStackParamList, 'VehicleDetail'>;

const LOG_META: Record<VehicleLogKind, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  km: { label: 'Km', icon: 'speedometer-outline', color: '#3b82f6' },
  fuel: { label: 'Yakıt', icon: 'water-outline', color: '#f59e0b' },
  maintenance: { label: 'Bakım', icon: 'construct-outline', color: '#a855f7' },
  inspection: { label: 'Muayene', icon: 'shield-checkmark-outline', color: '#22c55e' },
  insurance: { label: 'Sigorta', icon: 'document-text-outline', color: '#06b6d4' },
};

export default function VehicleDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [damages, setDamages] = useState<VehicleDamage[]>([]);
  const [fuel, setFuel] = useState<FuelSummary | null>(null);
  const [routeKm, setRouteKm] = useState(0);

  const load = useCallback(async () => {
    const [v, l, d, f, r] = await Promise.all([
      getVehicle(vehicleId),
      listLogsByVehicle(vehicleId),
      listDamagesByVehicle(vehicleId),
      fuelSummary(vehicleId),
      totalDistanceKm(vehicleId),
    ]);
    setVehicle(v);
    setLogs(l);
    setDamages(d);
    setFuel(f);
    setRouteKm(r);
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: colors.text.muted, padding: spacing.lg }}>Yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  const openDamages = damages.filter(d => d.status !== 'repaired').length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.plateBox}>
            <Text style={styles.plate}>{vehicle.plate}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>
              {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Marka/Model girilmedi'}
            </Text>
            <Text style={styles.meta}>
              {vehicle.year ? `${vehicle.year} · ` : ''}
              {vehicle.color ?? '—'}
              {vehicle.fuelType ? ` · ${vehicle.fuelType}` : ''}
            </Text>
            {vehicle.driverName && (
              <Text style={styles.meta}>Sürücü: {vehicle.driverName}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('VehicleForm', { vehicleId: vehicle.id })}
            style={styles.editBtn}
          >
            <Ionicons name="create-outline" size={18} color={brand.green} />
          </TouchableOpacity>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Toplam Km</Text>
            <Text style={styles.kpiValue}>
              {vehicle.kmTotal?.toLocaleString('tr-TR') ?? '—'}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Yakıt</Text>
            <Text style={styles.kpiValue}>
              {fuel ? fuel.totalLiters.toFixed(0) : '0'} L
            </Text>
            <Text style={styles.kpiSub}>
              {fuel && fuel.avgConsumption > 0
                ? `${fuel.avgConsumption.toFixed(1)} L/100km`
                : '—'}
            </Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Rota</Text>
            <Text style={styles.kpiValue}>{routeKm.toFixed(0)} km</Text>
          </View>
        </View>

        {(vehicle.inspectionDueAt || vehicle.insuranceDueAt) && (
          <View style={styles.dueRow}>
            {vehicle.inspectionDueAt && (
              <View style={styles.dueCard}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#22c55e" />
                <Text style={styles.dueLabel}>Muayene</Text>
                <Text style={styles.dueDate}>{vehicle.inspectionDueAt}</Text>
              </View>
            )}
            {vehicle.insuranceDueAt && (
              <View style={styles.dueCard}>
                <Ionicons name="document-text-outline" size={14} color="#06b6d4" />
                <Text style={styles.dueLabel}>Sigorta</Text>
                <Text style={styles.dueDate}>{vehicle.insuranceDueAt}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.section}>Hızlı Kayıt</Text>
        <View style={styles.quickRow}>
          {(['km', 'fuel', 'maintenance', 'inspection', 'insurance'] as VehicleLogKind[]).map(k => {
            const m = LOG_META[k];
            return (
              <TouchableOpacity
                key={k}
                style={[styles.quickBtn, { borderColor: m.color }]}
                onPress={() =>
                  navigation.navigate('VehicleLogForm', { vehicleId: vehicle.id, kind: k })
                }
              >
                <Ionicons name={m.icon} size={16} color={m.color} />
                <Text style={[styles.quickText, { color: m.color }]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.linksRow}>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('VehicleDamages', { vehicleId: vehicle.id })}
          >
            <Ionicons name="warning-outline" size={16} color={colors.rose.default} />
            <Text style={styles.linkText}>
              Hasarlar {openDamages > 0 ? `(${openDamages} açık)` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('VehicleRoute', { vehicleId: vehicle.id })}
          >
            <Ionicons name="map-outline" size={16} color={brand.blueLight} />
            <Text style={styles.linkText}>Rota Geçmişi</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Son Kayıtlar ({logs.length})</Text>
        {logs.length === 0 ? (
          <Text style={styles.empty}>Henüz kayıt yok.</Text>
        ) : (
          logs.slice(0, 30).map(l => {
            const m = LOG_META[l.kind];
            return (
              <View key={l.id} style={styles.logRow}>
                <View
                  style={[
                    styles.logIcon,
                    { borderColor: m.color, backgroundColor: m.color + '22' },
                  ]}
                >
                  <Ionicons name={m.icon} size={14} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logTitle}>
                    {m.label}
                    {typeof l.km === 'number' ? ` · ${l.km.toLocaleString('tr-TR')} km` : ''}
                    {typeof l.liters === 'number' ? ` · ${l.liters} L` : ''}
                  </Text>
                  <Text style={styles.logMeta}>
                    {new Date(l.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {l.dueAt ? ` · vade ${l.dueAt}` : ''}
                  </Text>
                  {l.note ? <Text style={styles.logNote}>{l.note}</Text> : null}
                </View>
                {typeof l.totalCost === 'number' && (
                  <Text style={styles.logCost}>
                    {l.totalCost.toLocaleString('tr-TR')} ₺
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plateBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1e3a8a',
    borderRadius: radius.sm,
  },
  plate: { color: '#fff', fontWeight: '900', fontSize: typography.md, letterSpacing: 1 },
  brand: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  editBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: brand.green,
    borderRadius: radius.full,
  },
  kpiRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  kpi: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  kpiLabel: { color: colors.text.muted, fontSize: typography.xs },
  kpiValue: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', marginTop: 4 },
  kpiSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  dueRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  dueCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dueLabel: { color: colors.text.muted, fontSize: typography.xs },
  dueDate: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  section: {
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: typography.sm,
    marginTop: spacing.lg,
    marginBottom: 6,
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.bg.secondary,
  },
  quickText: { fontSize: typography.xs, fontWeight: '800' },
  linksRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  linkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.bg.secondary,
  },
  linkText: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs },
  empty: { color: colors.text.muted, fontSize: typography.xs, paddingVertical: 8 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 6,
  },
  logIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  logMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  logNote: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' },
  logCost: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
});

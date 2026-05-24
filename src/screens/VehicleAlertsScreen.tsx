// VehicleAlertsScreen — POZ-DEV-164 Muayene / sigorta vade uyarıları
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { listVehicleAlerts, VehicleAlert } from '../services/vehicles';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const trDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return iso; }
};

export default function VehicleAlertsScreen() {
  const nav = useNavigation<Nav>();
  const [rows, setRows] = useState<VehicleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listVehicleAlerts(60);
      setRows(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#ef4444" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(r, i) => r.vehicle.id + '-' + r.kind + '-' + i}
        renderItem={({ item }) => {
          const sev = item.daysLeft < 0 ? '#ef4444' : item.daysLeft <= 7 ? '#f59e0b' : item.daysLeft <= 30 ? '#fb923c' : '#64748b';
          const kindLabel = item.kind === 'inspection' ? 'Muayene' : 'Sigorta';
          const kindIcon: keyof typeof Ionicons.glyphMap = item.kind === 'inspection' ? 'shield-checkmark-outline' : 'document-text-outline';
          const statusText = item.daysLeft < 0
            ? `${Math.abs(item.daysLeft)} gün geçti`
            : item.daysLeft === 0 ? 'Bugün' : `${item.daysLeft} gün kaldı`;
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => nav.navigate('VehicleDetail', { vehicleId: item.vehicle.id })}
            >
              <View style={[styles.iconBox, { backgroundColor: sev + '22', borderColor: sev }]}>
                <Ionicons name={kindIcon} size={20} color={sev} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plate}>{item.vehicle.plate}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {[item.vehicle.brand, item.vehicle.model].filter(Boolean).join(' ') || 'Araç'}
                  {item.vehicle.driverName ? ` · ${item.vehicle.driverName}` : ''}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.kindBadge}>{kindLabel}</Text>
                  <Text style={styles.due}>{trDate(item.dueAt)}</Text>
                </View>
              </View>
              <View style={[styles.daysBox, { backgroundColor: sev }]}>
                <Text style={styles.daysText}>{statusText}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="notifications-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Vade Uyarıları</Text>
              <Text style={styles.heroSub}>Yaklaşan / geçmiş muayene & sigorta</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#22c55e" />
            <Text style={styles.emptyText}>Yaklaşan vade yok</Text>
            <Text style={styles.emptySub}>60 gün içinde uyarı bulunmuyor.</Text>
          </View>
        }
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#ef4444', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  plate: { color: '#0ea5e9', fontWeight: '800', fontSize: typography.sm },
  name: { color: colors.text.primary, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  kindBadge: { color: colors.text.muted, fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.bg.primary },
  due: { color: colors.text.muted, fontSize: 10 },
  daysBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, minWidth: 70, alignItems: 'center' },
  daysText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  emptySub: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
});

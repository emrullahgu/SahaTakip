// LiveTrackingScreen — POZ-DEV-100 saha personeli canlı takip + yan panel
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { LiveWorker } from '../types';

const DEFAULT_REGION: Region = { latitude: 41.0082, longitude: 28.9784, latitudeDelta: 0.4, longitudeDelta: 0.4 };

const STATUS_COLOR: Record<LiveWorker['status'], string> = {
  active: '#22c55e',
  idle: '#f59e0b',
  offline: '#64748b',
};

const STATUS_LABEL: Record<LiveWorker['status'], string> = {
  active: 'Aktif',
  idle: 'Beklemede',
  offline: 'Çevrimdışı',
};

function hashCoord(seed: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  const dLat = ((h % 1000) / 1000) * 0.3 - 0.15;
  const dLng = (((h >> 10) % 1000) / 1000) * 0.4 - 0.2;
  return { lat: 41.0082 + dLat, lng: 28.9784 + dLng };
}

export default function LiveTrackingScreen() {
  const { width } = useWindowDimensions();
  const sideBySide = width >= 760;
  const mapRef = useRef<MapView | null>(null);
  const { employees, workOrders } = useAppContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // refresh trigger

  const workers = useMemo<LiveWorker[]>(() => {
    return employees.slice(0, 20).map((e, i) => {
      const c = hashCoord(e.id + ':' + tick);
      // status from i mod
      const status: LiveWorker['status'] = i % 5 === 0 ? 'offline' : i % 3 === 0 ? 'idle' : 'active';
      const wo = workOrders.find(w => (w.assignedToId === e.id || w.engineer === e.name) && w.status !== 'Tamamlandı');
      return {
        employeeId: e.id,
        name: e.name,
        role: e.role,
        lat: c.lat,
        lng: c.lng,
        status,
        lastSeen: new Date(Date.now() - (i * 60_000)).toISOString(),
        workOrderId: wo?.id,
        workOrderLabel: wo ? `${wo.client} · ${wo.serviceName}` : undefined,
      };
    });
  }, [employees, workOrders, tick]);

  useFocusEffect(useCallback(() => { setSelectedId(null); }, []));

  const counts = useMemo(() => {
    return {
      active: workers.filter(w => w.status === 'active').length,
      idle: workers.filter(w => w.status === 'idle').length,
      offline: workers.filter(w => w.status === 'offline').length,
    };
  }, [workers]);

  const focusOn = (w: LiveWorker) => {
    setSelectedId(w.employeeId);
    mapRef.current?.animateToRegion({ latitude: w.lat, longitude: w.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 600);
  };

  const refresh = () => setTick(t => t + 1);

  const Panel = (
    <View style={[styles.panel, sideBySide && styles.panelSide]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Saha ({workers.length})</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={14} color={colors.text.muted} />
        </TouchableOpacity>
      </View>
      <View style={styles.statRow}>
        <StatPill label="Aktif" value={counts.active} color={STATUS_COLOR.active} />
        <StatPill label="Bekliyor" value={counts.idle} color={STATUS_COLOR.idle} />
        <StatPill label="Off" value={counts.offline} color={STATUS_COLOR.offline} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        {workers.map(w => {
          const active = selectedId === w.employeeId;
          return (
            <TouchableOpacity key={w.employeeId} style={[styles.workerRow, active && styles.workerRowActive]} onPress={() => focusOn(w)}>
              <View style={[styles.dot, { backgroundColor: STATUS_COLOR[w.status] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.workerName} numberOfLines={1}>{w.name}</Text>
                <Text style={styles.workerMeta} numberOfLines={1}>
                  {w.role || '—'} · {STATUS_LABEL[w.status]}
                </Text>
                {w.workOrderLabel && (
                  <Text style={styles.woHint} numberOfLines={1}>↪ {w.workOrderLabel}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {workers.length === 0 && (
          <Text style={styles.emptyText}>Personel kaydı yok.</Text>
        )}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={[styles.layout, sideBySide && { flexDirection: 'row' }]}>
        <View style={[styles.mapWrap, sideBySide && { flex: 1 }]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            initialRegion={DEFAULT_REGION}
          >
            {workers.map(w => (
              <Marker
                key={w.employeeId}
                coordinate={{ latitude: w.lat, longitude: w.lng }}
                title={w.name}
                description={`${STATUS_LABEL[w.status]}${w.workOrderLabel ? ' · ' + w.workOrderLabel : ''}`}
                pinColor={STATUS_COLOR[w.status]}
                onPress={() => setSelectedId(w.employeeId)}
              />
            ))}
          </MapView>
          <View style={styles.demoBadge}>
            <Ionicons name="information-circle-outline" size={11} color="#fff" />
            <Text style={styles.demoBadgeText}>Demo: konumlar simüle edilmiştir</Text>
          </View>
        </View>
        {Panel}
      </View>
    </SafeAreaView>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '55', backgroundColor: color + '12' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  layout: { flex: 1, flexDirection: 'column' },
  mapWrap: { flex: 1, minHeight: 280, backgroundColor: '#0b1220' },
  demoBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  demoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  panel: { backgroundColor: colors.bg.secondary, borderTopWidth: 1, borderColor: colors.border.primary, maxHeight: 360 },
  panelSide: { width: 320, maxHeight: undefined, borderTopWidth: 0, borderLeftWidth: 1 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  panelTitle: { flex: 1, color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  refreshBtn: { padding: 4 },
  statRow: { flexDirection: 'row', gap: 6, padding: spacing.sm, paddingBottom: 0 },
  statPill: { flex: 1, alignItems: 'center', padding: 6, borderRadius: radius.sm, borderWidth: 1 },
  statValue: { fontWeight: '800', fontSize: typography.md },
  statLabel: { color: colors.text.muted, fontSize: 10 },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  workerRowActive: { backgroundColor: 'rgba(99,102,241,0.1)' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  workerName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  workerMeta: { color: colors.text.muted, fontSize: 11, marginTop: 2 },
  woHint: { color: brand.green, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  emptyText: { color: colors.text.muted, textAlign: 'center', padding: spacing.lg },
});

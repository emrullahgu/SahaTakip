// RouteOptimizerScreen — POZ-DEV-093 TSP saha turu
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { haversineKm, optimizeRoute } from '../services/routeOptimizer';
import { OptimizedRoute, RouteStop } from '../types';

// Deterministic pseudo-coords around a base (Istanbul) from string hash
const BASE_LAT = 41.0082;
const BASE_LNG = 28.9784;

function hashCoord(seed: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  const dLat = ((h % 1000) / 1000) * 0.4 - 0.2; // ±0.2°
  const dLng = (((h >> 10) % 1000) / 1000) * 0.5 - 0.25;
  return { lat: BASE_LAT + dLat, lng: BASE_LNG + dLng };
}

export default function RouteOptimizerScreen() {
  const { workOrders } = useAppContext();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [route, setRoute] = useState<OptimizedRoute | null>(null);

  const candidates = useMemo(() => {
    return workOrders
      .filter(w => w.status !== 'Tamamlandı' && w.status !== 'İptal' && w.status !== 'Faturalandırıldı')
      .slice(0, 30);
  }, [workOrders]);

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
    setRoute(null);
  };

  const onOptimize = () => {
    if (selected.size < 2) { Alert.alert('Eksik', 'En az 2 durak seçin.'); return; }
    const stops: RouteStop[] = Array.from(selected).map(id => {
      const w = workOrders.find(x => x.id === id)!;
      const { lat, lng } = hashCoord(w.client + '_' + w.id);
      return { id: w.id, label: `${w.client} · ${w.serviceName}`, lat, lng, workOrderId: w.id };
    });
    setRoute(optimizeRoute(stops));
  };

  const reset = () => { setSelected(new Set()); setRoute(null); };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saha Durakları</Text>
          <Text style={styles.headerSub}>Aktif iş emirlerinden seçin (max 30)</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: brand.green, flex: 1 }, selected.size < 2 && { opacity: 0.5 }]} onPress={onOptimize} disabled={selected.size < 2}>
            <Ionicons name="rocket-outline" size={16} color="#fff" />
            <Text style={styles.btnText}>Optimize Et ({selected.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary }]} onPress={reset}>
            <Ionicons name="refresh-outline" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        {route && (
          <View style={styles.resultCard}>
            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{route.totalKm.toFixed(1)}</Text>
                <Text style={styles.metricLabel}>km (optimize)</Text>
              </View>
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: colors.text.muted }]}>{(route.originalKm || 0).toFixed(1)}</Text>
                <Text style={styles.metricLabel}>km (orijinal)</Text>
              </View>
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: brand.green }]}>{(route.savingsKm || 0).toFixed(1)}</Text>
                <Text style={styles.metricLabel}>km tasarruf</Text>
              </View>
            </View>

            <Text style={styles.routeTitle}>Optimal Sıra</Text>
            {route.stops.map((s, i) => (
              <View key={s.id} style={styles.stopRow}>
                <View style={styles.stopNum}>
                  <Text style={styles.stopNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopLabel} numberOfLines={1}>{s.label}</Text>
                  <Text style={styles.stopCoord}>{s.lat.toFixed(3)}, {s.lng.toFixed(3)}</Text>
                </View>
                {i > 0 && (
                  <Text style={styles.legKm}>+{s.legKm?.toFixed(1) || 0} km</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Adaylar ({candidates.length})</Text>
        {candidates.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={36} color={colors.text.faint} />
            <Text style={styles.emptyText}>Aktif iş emri yok.</Text>
          </View>
        ) : candidates.map(w => {
          const active = selected.has(w.id);
          const coord = hashCoord(w.client + '_' + w.id);
          const distFromBase = haversineKm({ lat: BASE_LAT, lng: BASE_LNG }, coord);
          return (
            <TouchableOpacity key={w.id} style={[styles.candCard, active && styles.candCardActive]} onPress={() => toggle(w.id)}>
              <View style={[styles.checkbox, active && styles.checkboxActive]}>
                {active && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.candTitle} numberOfLines={1}>{w.client}</Text>
                <Text style={styles.candSub} numberOfLines={1}>{w.serviceName}</Text>
              </View>
              <Text style={styles.candDist}>~{distFromBase.toFixed(0)}km</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={12} color={colors.text.faint} />
          <Text style={styles.disclaimerText}>
            Demo modda koordinatlar müşteri adından türetilir. Gerçek konum için sahada Müşteri/Site lat-lng alanı eklenecek.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  header: { marginBottom: spacing.md },
  headerTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  headerSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 6 },
  btn: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  resultCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: brand.green, backgroundColor: 'rgba(34,197,94,0.06)' },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  metric: { flex: 1, alignItems: 'center', padding: 8, borderRadius: radius.sm, backgroundColor: colors.bg.secondary },
  metricValue: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  metricLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  routeTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginBottom: 6 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  stopNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: brand.green, alignItems: 'center', justifyContent: 'center' },
  stopNumText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  stopLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  stopCoord: { color: colors.text.faint, fontSize: 10 },
  legKm: { color: brand.green, fontSize: 11, fontWeight: '700' },
  sectionTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  candCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, marginBottom: 6 },
  candCardActive: { borderColor: brand.green, backgroundColor: 'rgba(34,197,94,0.06)' },
  checkbox: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border.secondary, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: brand.green, borderColor: brand.green },
  candTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  candSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  candDist: { color: colors.text.faint, fontSize: 11, fontWeight: '600' },
  disclaimer: { flexDirection: 'row', gap: 4, alignItems: 'flex-start', marginTop: spacing.lg, padding: spacing.sm },
  disclaimerText: { flex: 1, color: colors.text.faint, fontSize: 10, lineHeight: 14 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: colors.text.muted },
});

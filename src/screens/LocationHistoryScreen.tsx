// ====================================================================
// LocationHistoryScreen — POZ-DEV-016
// Gün seçici + Polyline ile personel konum geçmişi
// ====================================================================
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import { locationsRepo, LocationRow } from '../services/data/locationsRepo';
import { useAppContext } from '../context/AppContext';

type Params = { userId: string; employeeName?: string };

function isoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function LocationHistoryScreen() {
  const route = useRoute<RouteProp<Record<string, Params>, string>>();
  const nav = useNavigation();
  const { employees } = useAppContext();
  const { userId, employeeName } = route.params;
  const name = employeeName ?? employees.find(e => e.id === userId)?.name ?? 'Personel';

  // Son 7 günü seçilebilir yap
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    });
  }, []);

  const [selectedDay, setSelectedDay] = useState<Date>(days[0]);
  const [points, setPoints] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = new Date(selectedDay);
      from.setHours(0, 0, 0, 0);
      const to = new Date(selectedDay);
      to.setHours(23, 59, 59, 999);
      const list = await locationsRepo.history(userId, from.toISOString(), to.toISOString());
      setPoints(list);
      setLoading(false);
    })();
  }, [userId, selectedDay]);

  const totalKm = useMemo(() => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const dLat = (points[i].lat - points[i - 1].lat) * (Math.PI / 180);
      const dLon = (points[i].lng - points[i - 1].lng) * (Math.PI / 180);
      const lat1 = points[i - 1].lat * (Math.PI / 180);
      const lat2 = points[i].lat * (Math.PI / 180);
      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
      total += 2 * 6371 * Math.asin(Math.sqrt(x));
    }
    return total;
  }, [points]);

  const region: Region | undefined = points.length
    ? {
        latitude: points[Math.floor(points.length / 2)].lat,
        longitude: points[Math.floor(points.length / 2)].lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.subtitle}>
          {selectedDay.toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </Text>
      </View>

      {/* Gün seçici */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBar}>
        {days.map(d => {
          const active = isoDay(d) === isoDay(selectedDay);
          return (
            <TouchableOpacity
              key={d.toISOString()}
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() => setSelectedDay(d)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayChipDay, active && styles.dayChipActiveTxt]}>
                {d.toLocaleDateString('tr-TR', { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayChipNum, active && styles.dayChipActiveTxt]}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Map */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color={brand.green} size="large" style={{ marginTop: 80 }} />
        ) : points.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="map-outline" size={56} color={colors.text.faint} />
            <Text style={styles.emptyText}>Bu gün için konum kaydı bulunamadı.</Text>
          </View>
        ) : (
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={{ flex: 1 }}
            initialRegion={region}
          >
            <Polyline
              coordinates={points.map(p => ({ latitude: p.lat, longitude: p.lng }))}
              strokeColor={brand.green}
              strokeWidth={4}
            />
            <Marker
              coordinate={{ latitude: points[0].lat, longitude: points[0].lng }}
              title="Başlangıç"
              description={new Date(points[0].recordedAt).toLocaleTimeString('tr-TR')}
              pinColor="#10b981"
            />
            <Marker
              coordinate={{ latitude: points[points.length - 1].lat, longitude: points[points.length - 1].lng }}
              title="Son"
              description={new Date(points[points.length - 1].recordedAt).toLocaleTimeString('tr-TR')}
              pinColor="#ef4444"
            />
          </MapView>
        )}
      </View>

      {/* Footer stats */}
      <View style={styles.footer}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Nokta</Text>
          <Text style={styles.statValue}>{points.length}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Toplam KM</Text>
          <Text style={styles.statValue}>{totalKm.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={16} color="#fff" />
          <Text style={styles.backTxt}>Geri</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { padding: spacing.md, backgroundColor: colors.bg.secondary },
  name: { color: colors.text.primary, fontWeight: '900', fontSize: typography.lg },
  subtitle: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  dayBar: { padding: spacing.sm, gap: spacing.xs },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg.card,
    alignItems: 'center',
    marginRight: spacing.xs,
    minWidth: 56,
  },
  dayChipActive: { backgroundColor: brand.green },
  dayChipActiveTxt: { color: '#fff' },
  dayChipDay: { color: colors.text.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dayChipNum: { color: colors.text.primary, fontSize: typography.md, fontWeight: '900' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.bg.secondary,
    borderTopWidth: 1, borderTopColor: colors.border.primary,
  },
  stat: { flex: 1 },
  statLabel: { color: colors.text.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { color: colors.text.primary, fontSize: typography.md, fontWeight: '900', marginTop: 2 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: brand.green, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  backTxt: { color: '#fff', fontWeight: '700' },
});

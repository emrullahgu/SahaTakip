// VehicleRouteScreen — POZ-DEV-063
// Rota geçmişi: nokta ekleme, günlük filtre, toplam mesafe, temizleme.

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
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, typography, brand } from '../theme';
import {
  listPointsByVehicle,
  listPointsByVehicleAndDay,
  addPoint,
  deletePoint,
  deletePointsByVehicle,
  totalDistanceKm,
} from '../services/vehicleRoutes';
import { requestAndGetPosition } from '../services/location';
import { VehicleRoutePoint, RootStackParamList } from '../types';

type Rt = RouteProp<RootStackParamList, 'VehicleRoute'>;

export default function VehicleRouteScreen() {
  const route = useRoute<Rt>();
  const { vehicleId } = route.params;

  const [points, setPoints] = useState<VehicleRoutePoint[]>([]);
  const [totalKm, setTotalKm] = useState(0);
  const [day, setDay] = useState(''); // YYYY-MM-DD
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const pts = day
      ? await listPointsByVehicleAndDay(vehicleId, day)
      : await listPointsByVehicle(vehicleId);
    setPoints(pts);
    setTotalKm(await totalDistanceKm(vehicleId));
  }, [vehicleId, day]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const addCurrent = async () => {
    setAdding(true);
    try {
      const pos = await requestAndGetPosition();
      if (!pos) {
        Alert.alert('Konum', 'Konum alınamadı.');
        return;
      }
      await addPoint({
        vehicleId,
        lat: pos.latitude,
        lng: pos.longitude,
      });
      load();
    } finally {
      setAdding(false);
    }
  };

  const onClearAll = () => {
    Alert.alert('Temizle', 'Tüm rota noktaları silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deletePointsByVehicle(vehicleId);
          load();
        },
      },
    ]);
  };

  const onDeletePoint = (id: string) => {
    Alert.alert('Sil', 'Bu nokta silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deletePoint(id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Toplam Mesafe</Text>
          <Text style={styles.kpiValue}>{totalKm.toFixed(2)} km</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Nokta</Text>
          <Text style={styles.kpiValue}>{points.length}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, adding && { opacity: 0.6 }]}
          onPress={addCurrent}
          disabled={adding}
        >
          <Ionicons name="locate-outline" size={16} color="#fff" />
          <Text style={styles.actionText}>
            {adding ? 'Alınıyor...' : 'Şu Anki Konumu Ekle'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={onClearAll}>
          <Ionicons name="trash-outline" size={16} color={colors.rose.default} />
        </TouchableOpacity>
      </View>

      <View style={styles.dayRow}>
        <Text style={styles.dayLabel}>Gün filtresi:</Text>
        <TextInput
          value={day}
          onChangeText={setDay}
          style={styles.dayInput}
          placeholder="YYYY-AA-GG"
          placeholderTextColor={colors.text.faint}
        />
        {day !== '' && (
          <TouchableOpacity onPress={() => setDay('')}>
            <Ionicons name="close-circle" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {points.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={42} color={colors.text.faint} />
            <Text style={styles.emptyText}>Nokta yok.</Text>
          </View>
        ) : (
          points.map((p, idx) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onLongPress={() => onDeletePoint(p.id)}
              activeOpacity={0.85}
            >
              <View style={styles.idxBox}>
                <Text style={styles.idxText}>{points.length - idx}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coord}>
                  {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                </Text>
                <Text style={styles.meta}>
                  {new Date(p.recordedAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {typeof p.speed === 'number' ? ` · ${p.speed.toFixed(0)} km/sa` : ''}
                </Text>
                {p.userName ? <Text style={styles.meta}>Sürücü: {p.userName}</Text> : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { flexDirection: 'row', gap: 8, padding: spacing.lg, paddingBottom: spacing.sm },
  kpi: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  kpiLabel: { color: colors.text.muted, fontSize: typography.xs },
  kpiValue: {
    color: colors.text.primary,
    fontSize: typography.md,
    fontWeight: '800',
    marginTop: 4,
  },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: brand.green,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  clearBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rose.border,
    backgroundColor: colors.rose.bg,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dayLabel: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  dayInput: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typography.xs,
  },
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
  idxBox: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.indigo.bg,
    borderWidth: 1,
    borderColor: colors.indigo.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idxText: { color: brand.blueLight, fontWeight: '800', fontSize: typography.xs },
  coord: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});

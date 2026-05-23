import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { requestAndGetPosition, GeoPosition } from '../services/location';

// İzmir merkez varsayılan
const DEFAULT_REGION: Region = {
  latitude: 38.4192,
  longitude: 27.1287,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// Demo: customer adı → koordinat mapleme (gerçekte DB'den gelir)
const MOCK_CUSTOMER_COORDS: Record<string, { lat: number; lon: number }> = {
  EGEBORU: { lat: 38.435, lon: 27.155 },
  'Ata Makine': { lat: 38.418, lon: 27.105 },
  'Mert Çelik': { lat: 38.398, lon: 27.21 },
  'Dinçer Lojistik': { lat: 38.473, lon: 27.078 },
  'Cinerji Enerji': { lat: 38.385, lon: 27.16 },
  'Aksa Enerji': { lat: 38.452, lon: 27.196 },
};

function getMockCoord(client: string, idx: number): { lat: number; lon: number } {
  const known = MOCK_CUSTOMER_COORDS[client];
  if (known) return known;
  // Bilinmeyenler için İzmir civarına dağıt
  return {
    lat: 38.4 + ((idx * 0.0173) % 0.1),
    lon: 27.12 + ((idx * 0.0271) % 0.15),
  };
}

export default function MapScreen() {
  const { workOrders } = useAppContext();
  const mapRef = useRef<MapView | null>(null);
  const [me, setMe] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureLocation = async () => {
    setLoading(true);
    const pos = await requestAndGetPosition();
    if (pos) {
      setMe(pos);
      mapRef.current?.animateToRegion(
        {
          latitude: pos.latitude,
          longitude: pos.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        700
      );
    } else {
      Alert.alert(
        'Konum izni gerekli',
        'Haritada konumunuzu görmek için cihaz ayarlarından SahaTakip\'e konum izni veriniz.'
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    ensureLocation();
  }, []);

  // Active orders (not completed)
  const activeOrders = workOrders.filter(w => w.status !== 'Faturalandırıldı');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={
            me
              ? {
                  latitude: me.latitude,
                  longitude: me.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
              : DEFAULT_REGION
          }
          showsUserLocation
          showsMyLocationButton={false}
        >
          {activeOrders.map((order, idx) => {
            const coord = getMockCoord(order.client, idx);
            const color =
              order.status === 'Onay Bekliyor'
                ? colors.amber.default
                : order.status === 'Teklif Gönderildi'
                ? brand.blueLight
                : brand.green;
            return (
              <Marker
                key={order.id}
                coordinate={{ latitude: coord.lat, longitude: coord.lon }}
                title={order.client}
                description={`${order.serviceName} · ${order.status}`}
                pinColor={color}
              />
            );
          })}
        </MapView>

        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator color={brand.green} size="large" />
            <Text style={styles.overlayText}>Konum alınıyor...</Text>
          </View>
        )}

        {/* My location FAB */}
        <TouchableOpacity style={styles.fab} onPress={ensureLocation} activeOpacity={0.85}>
          <Ionicons name="locate" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: colors.amber.default }]} />
            <Text style={styles.legendText}>Bekleyen</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: brand.blueLight }]} />
            <Text style={styles.legendText}>Teklif Gönderildi</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: brand.green }]} />
            <Text style={styles.legendText}>Aktif</Text>
          </View>
        </View>
      </View>

      {/* Bottom bar — özet */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bbLabel}>Aktif İş Emri</Text>
          <Text style={styles.bbValue}>{activeOrders.length} adet</Text>
        </View>
        {me && (
          <View style={styles.coordBox}>
            <Ionicons name="navigate-outline" size={14} color={brand.green} />
            <Text style={styles.coordText}>
              {me.latitude.toFixed(4)}, {me.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  mapWrap: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2,6,23,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  overlayText: { color: '#fff', fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: brand.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: brand.green,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  legend: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  bbLabel: { color: colors.text.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  bbValue: { color: colors.text.primary, fontSize: typography.md, fontWeight: '900', marginTop: 2 },
  coordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  coordText: { color: colors.text.muted, fontSize: 10, fontWeight: '600' },
});

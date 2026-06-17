import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { requestAndGetPosition, GeoPosition } from '../services/location';
import { locationsRepo, LocationRow } from '../services/data/locationsRepo';

// İzmir merkez varsayılan
const DEFAULT_REGION: Region = {
  latitude: 38.4192,
  longitude: 27.1287,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

// Müşteri koordinatları henüz DB'de değilse İzmir civarına deterministik dağıt.
function getMockCoord(client: string, idx: number): { lat: number; lon: number } {
  return {
    lat: 38.4 + ((idx * 0.0173) % 0.1),
    lon: 27.12 + ((idx * 0.0271) % 0.15),
  };
}

export default function MapScreen() {
  const { workOrders, employees } = useAppContext();
  const { hasPermission } = useAuth();
  // Saha ekip konumları YALNIZ yönetici/müdüre (employees:R) gösterilir; field
  // kullanıcı yalnız kendi konumunu görür. (RLS de DB'de aynı sınırı uygular.)
  const canSeeStaff = hasPermission('employees', 'R');
  const mapRef = useRef<MapView | null>(null);
  const [me, setMe] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffLocs, setStaffLocs] = useState<LocationRow[]>([]);
  const [showStaff, setShowStaff] = useState(canSeeStaff);
  // Canlılık tick'i: "N dk önce" etiketlerinin ekranda otomatik tazelenmesi için
  // 30 sn'de bir re-render (ağ çağrısı yapmaz). Aksi halde etiket donar.
  const [, setNowTick] = useState(0);

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
      // İzin uygulama içinden istenir; reddedildiyse tekrar dene veya ayarları aç.
      Alert.alert(
        'Konum izni gerekli',
        'Haritada konumunuzu göstermek için konum izni gerekiyor.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'İzin Ver', onPress: () => { void ensureLocation(); } },
          { text: 'Ayarları Aç', onPress: () => { Linking.openSettings().catch(() => {}); } },
        ],
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    ensureLocation();
  }, []);

  // POZ-DEV-015 — Canlı personel konumları. Her odaklanmada latestAll ile TAZELE
  // (realtime kopması/arka plandan dönüş sonrası kayıp güncellemeleri toparlar).
  useFocusEffect(
    useCallback(() => {
      if (!canSeeStaff) return;
      let alive = true;
      (async () => {
        const list = await locationsRepo.latestAll();
        if (alive) setStaffLocs(list);
      })();
      return () => { alive = false; };
    }, [canSeeStaff]),
  );

  // Realtime INSERT aboneliği (yalnız yönetici) — yeni konum gelince marker güncellenir.
  useEffect(() => {
    if (!canSeeStaff) return;
    const unsub = locationsRepo.subscribeRealtime(loc => {
      setStaffLocs(prev => {
        const filtered = prev.filter(p => p.userId !== loc.userId);
        return [loc, ...filtered];
      });
    });
    return () => { unsub(); };
  }, [canSeeStaff]);

  // 30 sn'lik canlılık tick'i — tazelik etiketlerini güncel tutar.
  useEffect(() => {
    if (!canSeeStaff) return;
    const t = setInterval(() => setNowTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, [canSeeStaff]);

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

          {/* POZ-DEV-015 — Canlı personel pinleri (yalnız yönetici) */}
          {showStaff && canSeeStaff &&
            staffLocs.map(loc => {
              const emp = employees.find(e => e.id === loc.employeeId || e.id === loc.userId);
              const label = emp?.name ?? 'Personel';
              const now = Date.now();
              const age = (now - new Date(loc.recordedAt).getTime()) / 60000; // dakika
              const isFresh = age < 5;
              const clock = new Date(loc.recordedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
              return (
                <Marker
                  key={'staff-' + loc.userId}
                  coordinate={{ latitude: loc.lat, longitude: loc.lng }}
                  title={`👤 ${label}`}
                  description={
                    isFresh
                      ? `🟢 Canlı · ${age.toFixed(0)} dk önce (${clock})`
                      : `Son görülme: ${age.toFixed(0)} dk önce (${clock})`
                  }
                  pinColor={isFresh ? '#10b981' : '#64748b'}
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

        {/* Personel toggle FAB — yalnız yönetici */}
        {canSeeStaff && (
          <TouchableOpacity
            style={[styles.fab, styles.fabStaff, !showStaff && styles.fabStaffOff]}
            onPress={() => setShowStaff(s => !s)}
            activeOpacity={0.85}
          >
            <Ionicons name={showStaff ? 'people' : 'people-outline'} size={20} color="#fff" />
          </TouchableOpacity>
        )}

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
  fabStaff: {
    bottom: spacing.lg + 60,
    backgroundColor: brand.blueLight,
    shadowColor: brand.blueLight,
  },
  fabStaffOff: { backgroundColor: colors.text.muted, shadowOpacity: 0 },
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

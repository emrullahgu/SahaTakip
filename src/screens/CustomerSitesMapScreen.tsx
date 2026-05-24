// CustomerSitesMapScreen — POZ-DEV-143 Tüm müşteri sahaları harita üzerinde
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, CustomerSite, Customer } from '../types';
import { useAppContext } from '../context/AppContext';
import { listSites } from '../services/customerSites';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Türkiye merkez
const DEFAULT_REGION: Region = {
  latitude: 39.0,
  longitude: 35.0,
  latitudeDelta: 8.0,
  longitudeDelta: 8.0,
};

export default function CustomerSitesMapScreen() {
  const nav = useNavigation<Nav>();
  const { customers } = useAppContext();
  const mapRef = useRef<MapView | null>(null);
  const [sites, setSites] = useState<CustomerSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listSites();
      setSites(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const geo = useMemo(() => sites.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number'), [sites]);

  const initialRegion = useMemo<Region>(() => {
    if (geo.length === 0) return DEFAULT_REGION;
    const lats = geo.map(s => s.lat as number);
    const lngs = geo.map(s => s.lng as number);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latDelta = Math.max(0.05, (maxLat - minLat) * 1.4);
    const lngDelta = Math.max(0.05, (maxLng - minLng) * 1.4);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [geo]);

  const fitMarkers = () => {
    if (!mapRef.current || geo.length === 0) return;
    mapRef.current.fitToCoordinates(
      geo.map(s => ({ latitude: s.lat as number, longitude: s.lng as number })),
      { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
    );
  };

  const customerName = (id: string) => {
    const c = customers.find((x: Customer) => x.id === id);
    return c?.shortName || c?.title || 'Bilinmeyen';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#22c55e" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={initialRegion}
          onMapReady={fitMarkers}
        >
          {geo.map(s => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat as number, longitude: s.lng as number }}
              title={s.name}
              description={`${customerName(s.customerId)} · ${s.city || s.address || ''}`}
              pinColor="#22c55e"
              onCalloutPress={() => nav.navigate('CustomerSites', { customerId: s.customerId })}
            />
          ))}
        </MapView>

        <View style={styles.topBar}>
          <View style={styles.statPill}>
            <Ionicons name="business-outline" size={14} color="#fff" />
            <Text style={styles.statText}>{sites.length} saha • {geo.length} konumlu</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.fitFab} onPress={fitMarkers} activeOpacity={0.85}>
          <Ionicons name="scan-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listFab} onPress={() => setShowList(v => !v)} activeOpacity={0.85}>
          <Ionicons name={showList ? 'close' : 'list'} size={20} color="#fff" />
        </TouchableOpacity>

        {showList && (
          <View style={styles.listPanel}>
            <FlatList
              data={sites}
              keyExtractor={s => s.id}
              renderItem={({ item }) => {
                const hasGeo = typeof item.lat === 'number' && typeof item.lng === 'number';
                return (
                  <TouchableOpacity
                    style={styles.listRow}
                    onPress={() => {
                      if (hasGeo && mapRef.current) {
                        mapRef.current.animateToRegion({
                          latitude: item.lat as number,
                          longitude: item.lng as number,
                          latitudeDelta: 0.02,
                          longitudeDelta: 0.02,
                        }, 400);
                        setShowList(false);
                      } else {
                        nav.navigate('CustomerSites', { customerId: item.customerId });
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={hasGeo ? 'location' : 'location-outline'}
                      size={16}
                      color={hasGeo ? '#22c55e' : colors.text.faint}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>{customerName(item.customerId)} · {item.city || '—'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>Henüz saha yok</Text>}
              contentContainerStyle={{ padding: spacing.sm, gap: spacing.xs }}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapWrap: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFill },
  topBar: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, flexDirection: 'row' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary },
  statText: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  fitFab: { position: 'absolute', right: spacing.md, bottom: 80, width: 44, height: 44, borderRadius: 22, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  listFab: { position: 'absolute', right: spacing.md, bottom: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  listPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '55%', backgroundColor: colors.bg.secondary, borderTopWidth: 1, borderTopColor: colors.border.primary, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm },
  rowTitle: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  rowSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', padding: spacing.lg },
});

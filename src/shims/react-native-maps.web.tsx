// react-native-maps web stub — web bundle'da native modülü import etmeyi engeller.
// MapScreen / CustomerSitesMapScreen / GeofencesScreen / LiveTrackingScreen / LocationHistoryScreen
// içindeki <MapView>, <Marker>, <Polyline>, <Circle> kullanımları için minimum yüzey alanı.
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const MapView = React.forwardRef<any, any>(function MapView(props, _ref) {
  return (
    <View style={[s.container, props?.style]}>
      <View style={s.inner}>
        <Text style={s.title}>Harita web'de devre dışı</Text>
        <Text style={s.subtitle}>
          Bu ekranın harita görünümü mobil uygulamada (Android / iOS) görüntülenir.
        </Text>
      </View>
      {props?.children}
    </View>
  );
});

export const Marker: React.FC<any> = () => null;
export const Polyline: React.FC<any> = () => null;
export const Circle: React.FC<any> = () => null;
export const Polygon: React.FC<any> = () => null;
export const Callout: React.FC<any> = ({ children }) => <>{children}</>;

export default MapView;

const s = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  inner: { alignItems: 'center', maxWidth: 420 },
  title: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 6, textAlign: 'center' },
});

// Tip uyumluluğu için boş cast — Platform kullanımı tree-shake riski azaltır.
void Platform;

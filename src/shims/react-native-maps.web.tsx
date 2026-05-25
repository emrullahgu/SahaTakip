// react-native-maps web shim — gerçek Google Maps JS API entegrasyonu.
// EXPO_PUBLIC_GOOGLE_MAPS_KEY (veya EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) tanımlıysa
// gerçek harita render edilir; aksi halde nazik fallback gösterilir.
//
// Desteklenen yüzey: MapView (ref: animateToRegion / fitToCoordinates / animateCamera),
// Marker, Polyline, Circle, Polygon, Callout, PROVIDER_GOOGLE / PROVIDER_DEFAULT, Region.

import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useContext,
  createContext,
  useMemo,
} from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = undefined;

export type LatLng = { latitude: number; longitude: number };
export type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };

// ----------------------------------------------------------------------------
// Google Maps JS loader (singleton)
// ----------------------------------------------------------------------------
const API_KEY: string | undefined =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

declare global {
  interface Window {
    google?: any;
    __sahatakip_gmaps_loader?: Promise<any>;
  }
}

function loadGoogleMaps(): Promise<any> | null {
  if (typeof window === 'undefined' || !API_KEY) return null;
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__sahatakip_gmaps_loader) return window.__sahatakip_gmaps_loader;

  window.__sahatakip_gmaps_loader = new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      API_KEY!,
    )}&libraries=geometry&loading=async&v=weekly`;
    sc.async = true;
    sc.defer = true;
    sc.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps API yüklendi ama window.google.maps yok'));
    };
    sc.onerror = () => reject(new Error('Google Maps JS yüklenemedi'));
    document.head.appendChild(sc);
  });
  return window.__sahatakip_gmaps_loader;
}

// delta → yaklaşık zoom (Web Mercator).
function deltaToZoom(latDelta: number): number {
  if (!latDelta || latDelta <= 0) return 12;
  const z = Math.log2(360 / latDelta);
  return Math.max(2, Math.min(20, Math.round(z)));
}

// ----------------------------------------------------------------------------
// Context — child overlay'lerinin parent map'e erişmesi için.
// ----------------------------------------------------------------------------
const MapCtx = createContext<{ map: any | null; maps: any | null }>({
  map: null,
  maps: null,
});

// ----------------------------------------------------------------------------
// MapView
// ----------------------------------------------------------------------------
type MapViewProps = {
  style?: any;
  initialRegion?: Region;
  region?: Region;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider?: any;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  onPress?: (e: { nativeEvent: { coordinate: LatLng } }) => void;
  onRegionChangeComplete?: (r: Region) => void;
  children?: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

const MapView = React.forwardRef<any, MapViewProps>(function MapView(props, ref) {
  const {
    style,
    initialRegion,
    region,
    onPress,
    onRegionChangeComplete,
    showsUserLocation,
    children,
  } = props;

  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapsRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // İlk yükleme
  useEffect(() => {
    let cancelled = false;
    const loader = loadGoogleMaps();
    if (!loader) {
      setError(
        API_KEY
          ? 'Harita yüklenemedi (window yok).'
          : 'API anahtarı tanımlı değil (EXPO_PUBLIC_GOOGLE_MAPS_KEY).',
      );
      return;
    }
    loader
      .then((maps) => {
        if (cancelled || !divRef.current) return;
        const r = region || initialRegion;
        const center = r
          ? { lat: r.latitude, lng: r.longitude }
          : { lat: 38.4192, lng: 27.1287 };
        const zoom = r ? deltaToZoom(r.latitudeDelta) : 12;
        const map = new maps.Map(divRef.current, {
          center,
          zoom,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          ],
        });
        mapRef.current = map;
        mapsRef.current = maps;
        if (onPress) {
          map.addListener('click', (ev: any) => {
            onPress({
              nativeEvent: {
                coordinate: { latitude: ev.latLng.lat(), longitude: ev.latLng.lng() },
              },
            });
          });
        }
        if (onRegionChangeComplete) {
          map.addListener('idle', () => {
            const c = map.getCenter();
            const b = map.getBounds();
            if (!c || !b) return;
            const ne = b.getNorthEast();
            const sw = b.getSouthWest();
            onRegionChangeComplete({
              latitude: c.lat(),
              longitude: c.lng(),
              latitudeDelta: Math.abs(ne.lat() - sw.lat()),
              longitudeDelta: Math.abs(ne.lng() - sw.lng()),
            });
          });
        }
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kontrollü region prop güncellemesi
  useEffect(() => {
    if (!ready || !region || !mapRef.current) return;
    mapRef.current.panTo({ lat: region.latitude, lng: region.longitude });
    mapRef.current.setZoom(deltaToZoom(region.latitudeDelta));
  }, [ready, region?.latitude, region?.longitude, region?.latitudeDelta]);

  // Kullanıcı konumu (mavi nokta)
  useEffect(() => {
    if (!ready || !showsUserLocation) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!userMarkerRef.current && mapsRef.current && mapRef.current) {
          userMarkerRef.current = new mapsRef.current.Marker({
            position: pt,
            map: mapRef.current,
            icon: {
              path: mapsRef.current.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            zIndex: 9999,
          });
        } else if (userMarkerRef.current) {
          userMarkerRef.current.setPosition(pt);
        }
      },
      () => {
        /* sessizce */
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    };
  }, [ready, showsUserLocation]);

  // Imperative ref API
  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (r: Region, _duration?: number) => {
        const m = mapRef.current;
        if (!m) return;
        m.panTo({ lat: r.latitude, lng: r.longitude });
        m.setZoom(deltaToZoom(r.latitudeDelta));
      },
      animateCamera: (cam: { center: LatLng; zoom?: number }) => {
        const m = mapRef.current;
        if (!m) return;
        m.panTo({ lat: cam.center.latitude, lng: cam.center.longitude });
        if (cam.zoom) m.setZoom(cam.zoom);
      },
      fitToCoordinates: (coords: LatLng[]) => {
        const m = mapRef.current;
        const maps = mapsRef.current;
        if (!m || !maps || !coords?.length) return;
        const bounds = new maps.LatLngBounds();
        coords.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }));
        m.fitBounds(bounds, 48);
      },
      fitToElements: () => {
        /* no-op */
      },
    }),
    [],
  );

  const ctxValue = useMemo(
    () => ({ map: ready ? mapRef.current : null, maps: ready ? mapsRef.current : null }),
    [ready],
  );

  return (
    <View style={[styles.container, style]}>
      <div
        ref={divRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {error ? (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.title}>Harita yüklenemedi</Text>
          <Text style={styles.subtitle}>{error}</Text>
        </View>
      ) : null}
      <MapCtx.Provider value={ctxValue}>{children}</MapCtx.Provider>
    </View>
  );
});

export default MapView;

// ----------------------------------------------------------------------------
// Marker / Polyline / Circle / Polygon / Callout
// ----------------------------------------------------------------------------
type MarkerProps = {
  coordinate: LatLng;
  title?: string;
  description?: string;
  pinColor?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

export const Marker: React.FC<MarkerProps> = ({
  coordinate,
  title,
  description,
  pinColor,
  onPress,
}) => {
  const { map, maps } = useContext(MapCtx);
  const markerRef = useRef<any>(null);
  const infoRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !maps) return;
    const marker = new maps.Marker({
      position: { lat: coordinate.latitude, lng: coordinate.longitude },
      map,
      title,
      icon: pinColor
        ? {
            path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: pinColor,
            fillOpacity: 1,
            strokeColor: '#0f172a',
            strokeWeight: 1.5,
          }
        : undefined,
    });
    markerRef.current = marker;

    if (title || description) {
      const info = new maps.InfoWindow({
        content: `<div style="color:#0f172a;font-family:-apple-system,Segoe UI,sans-serif;font-size:12px;max-width:220px">
          ${title ? `<div style="font-weight:700;margin-bottom:2px">${escapeHtml(title)}</div>` : ''}
          ${description ? `<div style="opacity:0.8">${escapeHtml(description)}</div>` : ''}
        </div>`,
      });
      infoRef.current = info;
      marker.addListener('click', () => {
        info.open({ map, anchor: marker });
        if (onPress) onPress();
      });
    } else if (onPress) {
      marker.addListener('click', onPress);
    }

    return () => {
      if (infoRef.current) infoRef.current.close();
      marker.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maps]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setPosition({
        lat: coordinate.latitude,
        lng: coordinate.longitude,
      });
    }
  }, [coordinate.latitude, coordinate.longitude]);

  return null;
};

type PolylineProps = {
  coordinates: LatLng[];
  strokeColor?: string;
  strokeWidth?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

export const Polyline: React.FC<PolylineProps> = ({
  coordinates,
  strokeColor,
  strokeWidth,
}) => {
  const { map, maps } = useContext(MapCtx);
  const lineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !maps) return;
    const line = new maps.Polyline({
      path: coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })),
      strokeColor: strokeColor || '#22c55e',
      strokeWeight: strokeWidth || 3,
      strokeOpacity: 0.9,
      map,
    });
    lineRef.current = line;
    return () => line.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maps]);

  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.setPath(
        coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })),
      );
    }
  }, [coordinates]);

  return null;
};

type CircleProps = {
  center: LatLng;
  radius: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

export const Circle: React.FC<CircleProps> = ({
  center,
  radius,
  strokeColor,
  fillColor,
  strokeWidth,
}) => {
  const { map, maps } = useContext(MapCtx);
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!map || !maps) return;
    const c = new maps.Circle({
      center: { lat: center.latitude, lng: center.longitude },
      radius,
      strokeColor: strokeColor || '#22c55e',
      strokeWeight: strokeWidth || 2,
      fillColor: fillColor || '#22c55e',
      fillOpacity: 0.18,
      map,
    });
    ref.current = c;
    return () => c.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maps]);
  useEffect(() => {
    if (ref.current) {
      ref.current.setCenter({ lat: center.latitude, lng: center.longitude });
      ref.current.setRadius(radius);
    }
  }, [center.latitude, center.longitude, radius]);
  return null;
};

type PolygonProps = {
  coordinates: LatLng[];
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
};

export const Polygon: React.FC<PolygonProps> = ({
  coordinates,
  strokeColor,
  fillColor,
  strokeWidth,
}) => {
  const { map, maps } = useContext(MapCtx);
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!map || !maps) return;
    const p = new maps.Polygon({
      paths: coordinates.map((c) => ({ lat: c.latitude, lng: c.longitude })),
      strokeColor: strokeColor || '#22c55e',
      strokeWeight: strokeWidth || 2,
      fillColor: fillColor || '#22c55e',
      fillOpacity: 0.18,
      map,
    });
    ref.current = p;
    return () => p.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, maps]);
  return null;
};

export const Callout: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

// ----------------------------------------------------------------------------
// Util
// ----------------------------------------------------------------------------
function escapeHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 240,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,6,23,0.85)',
    padding: 16,
  },
  title: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 6, textAlign: 'center' },
});

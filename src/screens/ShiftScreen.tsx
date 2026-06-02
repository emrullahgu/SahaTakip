// ====================================================================
// ShiftScreen — POZ-DEV-019 (Mesai başlat/bitir + canlı tracking)
// + POZ-DEV-017 (Geofence enter/exit event'leri)
// + POZ-DEV-023 (Mesai dışı tracking toggle)
// ====================================================================
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  AppState,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { shiftsRepo, Shift } from '../services/data/shiftsRepo';
import { locationsRepo } from '../services/data/locationsRepo';
import { geofencesRepo, Geofence } from '../services/data/geofencesRepo';
import {
  requestAndGetPosition,
  startLiveTracking,
  stopLiveTracking,
  isMockLocation,
  GeoPosition,
} from '../services/location';
import { isOnlineMode } from '../services/data';

const TRACK_OFF_SHIFT_KEY = '@SahaTakip:tracking_off_shift';

export default function ShiftScreen() {
  const { session } = useAuth();
  const { showToast } = useAppContext();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = session?.user?.id ?? 'demo-user';

  const [active, setActive] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [lastPos, setLastPos] = useState<GeoPosition | null>(null);
  const [mockWarn, setMockWarn] = useState(false);
  const [fences, setFences] = useState<Geofence[]>([]);
  const [trackOffShift, setTrackOffShift] = useState(false);
  const insideRef = useRef<Set<string>>(new Set());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateTimer = () => {
    if (!active) return;
    const ms = Date.now() - new Date(active.startAt).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    setElapsed(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    );
  };

  useEffect(() => {
    (async () => {
      const [a, gs, flag] = await Promise.all([
        shiftsRepo.getActive(userId),
        geofencesRepo.list(),
        AsyncStorage.getItem(TRACK_OFF_SHIFT_KEY),
      ]);
      setActive(a);
      setFences(gs);
      setTrackOffShift(flag === '1');
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    if (!active) {
      if (tickRef.current) clearInterval(tickRef.current);
      setElapsed('00:00:00');
      return;
    }
    updateTimer();
    tickRef.current = setInterval(updateTimer, 1000);

    // Uygulama arka plandan döndüğünde süreyi eşitle
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') updateTimer();
    });

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      sub.remove();
    };
  }, [active]);

  // Live tracking — mesai aktif VEYA mesai dışı tracking açıksa
  useEffect(() => {
    const shouldTrack = !!active || trackOffShift;
    if (!shouldTrack) {
      stopLiveTracking();
      return;
    }
    startLiveTracking(async pos => {
      setLastPos(pos);
      setMockWarn(isMockLocation(pos));
      await locationsRepo.write(userId, pos);

      // POZ-DEV-017: Geofence enter/exit
      const inside = geofencesRepo.pointInside(pos.latitude, pos.longitude, fences);
      const insideIds = new Set(inside.map(f => f.id));
      for (const f of inside) {
        if (!insideRef.current.has(f.id)) geofencesRepo.logEvent(f.id, userId, 'enter');
      }
      for (const prevId of insideRef.current) {
        if (!insideIds.has(prevId)) geofencesRepo.logEvent(prevId, userId, 'exit');
      }
      insideRef.current = insideIds;
    });

    return () => {
      stopLiveTracking();
    };
  }, [active, trackOffShift, userId, fences]);

  const onStart = async () => {
    setLoading(true);
    const pos = await requestAndGetPosition();
    if (!pos) {
      Alert.alert(
        'Konum İzni',
        'Mesai başlatmak için konum izni gereklidir. İzin vermediyseniz ayarlardan açabilirsiniz.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Ayarlar', onPress: () => Linking.openSettings() }
        ]
      );
      setLoading(false);
      return;
    }
    const shift = await shiftsRepo.start(userId, pos.latitude, pos.longitude);
    setActive(shift);
    setLoading(false);
  };

  const onEnd = async () => {
    if (!active) return;
    Alert.alert('Mesaiyi Bitir', 'Vardiyayı sonlandırmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Bitir',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            // Konum alma işlemini timeout ile sınırla (hang olmasın)
            const pos = await Promise.race([
              requestAndGetPosition(),
              new Promise<null>(resolve => setTimeout(() => resolve(null), 8000))
            ]).catch(() => null);

            try {
              await shiftsRepo.end(active.id, pos?.latitude, pos?.longitude);
              setActive(null);
              showToast('Mesai başarıyla bitirildi.');
            } catch (e: any) {
              console.warn('[ShiftScreen.end] primary failed', e?.message ?? e);

              // Fallback: kullanıcının tüm açık mesailerini kapatmayı dene
              try {
                await shiftsRepo.forceEndByUser(userId, pos?.latitude, pos?.longitude);
                setActive(null);
                showToast('Mesai zorlanarak bitirildi.');
              } catch (fErr: any) {
                console.warn('[ShiftScreen.end] force fallback failed', fErr.message);
                Alert.alert(
                  'Hata',
                  `Mesai sunucuda bitirilemedi: ${e.message}\n\nLokal olarak kapatmak ister misiniz?`,
                  [
                    { text: 'Hayır', style: 'cancel' },
                    { text: 'Lokal Kapat', style: 'destructive', onPress: () => setActive(null) }
                  ]
                );
              }
            }
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const toggleOffShift = async (v: boolean) => {
    setTrackOffShift(v);
    await AsyncStorage.setItem(TRACK_OFF_SHIFT_KEY, v ? '1' : '0');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={brand.green} size="large" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <View style={[styles.bigCard, active ? styles.bigCardActive : null]}>
          <Ionicons
            name={active ? 'pulse' : 'play-circle'}
            size={56}
            color={active ? brand.green : colors.text.muted}
          />
          <Text style={styles.status}>{active ? 'MESAİ AKTİF' : 'MESAİ KAPALI'}</Text>
          {active ? (
            <>
              <Text style={styles.timer}>{elapsed}</Text>
              <Text style={styles.startedAt}>
                Başlangıç: {new Date(active.startAt).toLocaleString('tr-TR')}
              </Text>
            </>
          ) : (
            <Text style={styles.hint}>
              Sahada mesai başlatmak için aşağıdaki butona dokun.
            </Text>
          )}
        </View>

        {mockWarn && (
          <View style={styles.warnBox}>
            <Ionicons name="warning" size={16} color={colors.amber.default} />
            <Text style={styles.warnText}>
              Sahte konum tespit edildi. Yöneticiniz bilgilendirilecek.
            </Text>
          </View>
        )}

        {!isOnlineMode() && (
          <View style={styles.infoBox}>
            <Ionicons name="cloud-offline" size={14} color={colors.text.muted} />
            <Text style={styles.infoText}>
              Çevrimdışı modda — konum bilgisi sunucuya gönderilmiyor.
            </Text>
          </View>
        )}

        {lastPos && (
          <View style={styles.posCard}>
            <Text style={styles.posTitle}>Son Konum</Text>
            <Text style={styles.posCoord}>
              {lastPos.latitude.toFixed(5)}, {lastPos.longitude.toFixed(5)}
            </Text>
            <Text style={styles.posMeta}>
              Doğruluk: {lastPos.accuracy?.toFixed(0) ?? '-'} m
              {lastPos.speed != null && `  •  Hız: ${(lastPos.speed * 3.6).toFixed(0)} km/h`}
            </Text>
          </View>
        )}

        {active ? (
          <TouchableOpacity style={[styles.btn, styles.btnEnd]} onPress={onEnd} activeOpacity={0.85}>
            <Ionicons name="stop-circle" size={22} color="#fff" />
            <Text style={styles.btnText}>MESAİYİ BİTİR</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={onStart} activeOpacity={0.85}>
            <Ionicons name="play-circle" size={22} color="#fff" />
            <Text style={styles.btnText}>MESAİ BAŞLAT</Text>
          </TouchableOpacity>
        )}

        {/* POZ-DEV-023: Mesai dışı tracking */}
        <View style={styles.toggleCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Mesai Dışında Konum Gönder</Text>
            <Text style={styles.toggleSub}>
              Kapalıyken yalnız mesai aktifken konum kaydedilir.
            </Text>
          </View>
          <Switch
            value={trackOffShift}
            onValueChange={toggleOffShift}
            trackColor={{ true: brand.green, false: colors.bg.card }}
            thumbColor="#fff"
          />
        </View>

        {/* Hızlı eylemler */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => nav.navigate('CheckinScanner')}>
            <Ionicons name="qr-code-outline" size={22} color={brand.green} />
            <Text style={styles.quickTxt}>QR Check-in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => nav.navigate('NfcCheckin')}>
            <Ionicons name="radio-outline" size={22} color={brand.green} />
            <Text style={styles.quickTxt}>NFC Check-in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => nav.navigate('Geofences')}>
            <Ionicons name="locate-outline" size={22} color={brand.green} />
            <Text style={styles.quickTxt}>Bölgeler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bigCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border.primary,
  },
  bigCardActive: { borderColor: brand.green },
  status: { color: colors.text.primary, fontWeight: '900', fontSize: typography.md, letterSpacing: 1 },
  timer: { color: brand.green, fontWeight: '900', fontSize: 48, letterSpacing: 2 },
  startedAt: { color: colors.text.muted, fontSize: typography.xs },
  hint: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', marginTop: spacing.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: radius.md },
  btnStart: { backgroundColor: brand.green },
  btnEnd: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: typography.md, letterSpacing: 1 },
  warnBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: radius.sm, padding: spacing.sm },
  warnText: { color: colors.amber.default, fontSize: typography.xs, flex: 1 },
  infoBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: radius.sm, padding: spacing.sm },
  infoText: { color: colors.text.muted, fontSize: typography.xs, flex: 1 },
  posCard: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md },
  posTitle: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', textTransform: 'uppercase' },
  posCoord: { color: colors.text.primary, fontWeight: '900', fontSize: typography.md, marginTop: 4 },
  posMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.card, padding: spacing.md, borderRadius: radius.md },
  toggleTitle: { color: colors.text.primary, fontWeight: '800' },
  toggleSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  quickBtn: { flex: 1, backgroundColor: colors.bg.card, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', gap: 4 },
  quickTxt: { color: colors.text.primary, fontWeight: '700', fontSize: typography.xs, textAlign: 'center' },
});

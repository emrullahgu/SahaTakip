// PersonnelTrackingHubScreen — POZ-DEV-117 Saha takibi merkez ekranı
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { locationsRepo, shiftsRepo, isOnlineMode } from '../services/data';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Tile {
  key: keyof RootStackParamList;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  poz?: string;
}

const TILES: Tile[] = [
  { key: 'LiveTracking',       label: 'Canlı Takip',        desc: 'Aktif personel haritada',     icon: 'navigate-circle-outline', color: '#22c55e', poz: 'POZ-DEV-014' },
  { key: 'LocationHistory',    label: 'Konum Geçmişi',      desc: 'Gün bazlı rota replay',        icon: 'map-outline',             color: '#0ea5e9', poz: 'POZ-DEV-016' },
  { key: 'Shift',              label: 'Vardiya',            desc: 'Başlat / bitir / mola',        icon: 'time-outline',            color: '#8b5cf6', poz: 'POZ-DEV-019' },
  { key: 'Geofences',          label: 'Geofence',           desc: 'Bölge çiz & giriş-çıkış',     icon: 'pin-outline',             color: '#f59e0b', poz: 'POZ-DEV-017' },
  { key: 'AttendanceReport',   label: 'Puantaj',            desc: 'Aylık mesai raporu',           icon: 'calendar-outline',        color: '#ef4444', poz: 'POZ-DEV-118' },
  { key: 'MockLocationAlerts', label: 'Sahte Konum',        desc: 'Mock GPS uyarıları',           icon: 'warning-outline',         color: '#dc2626', poz: 'POZ-DEV-119' },
  { key: 'CheckinScanner',     label: 'QR Check-in',        desc: 'QR ile lokasyon doğrula',     icon: 'qr-code-outline',         color: '#16a34a', poz: 'POZ-DEV-020' },
  { key: 'NfcCheckin',         label: 'NFC Check-in',       desc: 'NFC etiket okut',             icon: 'radio-outline',           color: '#0891b2', poz: 'POZ-DEV-021' },
];

export default function PersonnelTrackingHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : width >= 600 ? 2 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const { profile } = useAuth();
  // Bordro yalnız yönetici/müdüre (maaş gizliliği); RLS de korur ama UI da gate'ler.
  const isManager = profile?.role === 'admin' || profile?.role === 'manager';
  const tiles: Tile[] = isManager
    ? [...TILES, { key: 'PayrollHub', label: 'Bordro & Puantaj', desc: 'Maaş, izin, bordro', icon: 'cash-outline', color: '#10b981', poz: 'POZ-DEV-251' }]
    : TILES;
  const online = isOnlineMode();
  const [activeCount, setActiveCount] = useState(0);
  const [myShift, setMyShift] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    try {
      const locs = await locationsRepo.latestAll();
      // 15 dk içinde sinyal verenler aktif
      const cutoff = Date.now() - 15 * 60 * 1000;
      setActiveCount(locs.filter(l => new Date(l.recordedAt).getTime() > cutoff).length);
    } catch { /* sessiz */ }
    if (profile?.id) {
      try { setMyShift(!!(await shiftsRepo.getActive(profile.id))); } catch { /* sessiz */ }
    }
  }, [profile?.id]);

  useEffect(() => { refresh(); const id = setInterval(refresh, 30_000); return () => clearInterval(id); }, [refresh]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="people-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Konum & Personel Takibi</Text>
            <Text style={styles.heroSub}>Canlı saha izleme, vardiya, puantaj ve geofence</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={online ? 'Çevrimiçi' : 'Çevrimdışı'} color={online ? '#22c55e' : '#f59e0b'} icon={online ? 'wifi' : 'cloud-offline-outline'} />
          <Pill label={`Aktif: ${activeCount}`} color="#0ea5e9" icon="pulse-outline" />
          <Pill label={myShift ? 'Mesai açık' : 'Mesai kapalı'} color={myShift ? '#22c55e' : '#64748b'} icon="time-outline" />
        </View>

        <View style={[styles.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {tiles.map(t => (
            <TouchableOpacity
              key={String(t.key)}
              style={[styles.tile, { width: tileWidth }]}
              onPress={() => {
                if (t.key === 'LocationHistory') {
                  nav.navigate('LocationHistory', { userId: profile?.id ?? '', employeeName: profile?.full_name ?? 'Ben' });
                } else {
                  nav.navigate(t.key as never);
                }
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileDesc}>{t.desc}</Text>
              {t.poz && <Text style={styles.tilePoz}>{t.poz}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#22c55e', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});

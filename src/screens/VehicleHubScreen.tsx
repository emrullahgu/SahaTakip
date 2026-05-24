// VehicleHubScreen — POZ-DEV-163 Araç & Filo merkez ekranı
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { listVehicles, listVehicleAlerts } from '../services/vehicles';
import { listLogs } from '../services/vehicleLogs';
import { listDamages } from '../services/vehicleDamages';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Tile {
  key: keyof RootStackParamList;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  poz?: string;
  params?: object;
}

const TILES: Tile[] = [
  { key: 'Vehicles',        label: 'Araç Listesi',  desc: 'Plaka & sürücü',         icon: 'car-sport-outline', color: '#0ea5e9', poz: 'POZ-DEV-060' },
  { key: 'VehicleLogs',     label: 'Yakıt & Bakım', desc: 'Km, yakıt, servis',      icon: 'speedometer-outline', color: '#22c55e', poz: 'POZ-DEV-061' },
  { key: 'VehicleDamages',  label: 'Hasar Kayıtları', desc: 'Fotoğraflı bildirim',  icon: 'alert-circle-outline', color: '#f59e0b', poz: 'POZ-DEV-062' },
  { key: 'VehicleAlerts',   label: 'Vade Uyarıları', desc: 'Muayene / sigorta',     icon: 'notifications-outline', color: '#ef4444', poz: 'POZ-DEV-164' },
  { key: 'VehicleFuelStats', label: 'Yakıt İstatistik', desc: 'Tüketim & maliyet',   icon: 'analytics-outline', color: '#ec4899', poz: 'POZ-DEV-165' },
];

export default function VehicleHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const [vCount, setVCount] = useState(0);
  const [logCount, setLogCount] = useState(0);
  const [openDamages, setOpenDamages] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [vs, logs, dms, als] = await Promise.all([
          listVehicles(), listLogs(), listDamages(), listVehicleAlerts(30),
        ]);
        setVCount(vs.length);
        setLogCount(logs.length);
        setOpenDamages(dms.filter(d => d.status !== 'repaired').length);
        setAlertCount(als.length);
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="car-sport-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Araç & Filo</Text>
            <Text style={styles.heroSub}>Plaka, yakıt, hasar, vade</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Pill label={`Araç: ${vCount}`} color="#0ea5e9" icon="car-sport-outline" />
          <Pill label={`Log: ${logCount}`} color="#22c55e" icon="speedometer-outline" />
          <Pill label={`Açık Hasar: ${openDamages}`} color={openDamages > 0 ? '#f59e0b' : '#64748b'} icon="alert-circle-outline" />
          <Pill label={`Vade: ${alertCount}`} color={alertCount > 0 ? '#ef4444' : '#64748b'} icon="notifications-outline" />
        </View>

        {alertCount > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            activeOpacity={0.85}
            onPress={() => nav.navigate('VehicleAlerts')}
          >
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertLabel}>Yaklaşan Vadeler</Text>
              <Text style={styles.alertValue}>{alertCount} araçta muayene/sigorta uyarısı</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}

        <View style={[styles.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity
              key={String(t.key)}
              style={[styles.tile, { width: tileWidth }]}
              onPress={() => nav.navigate(t.key as never)}
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
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#6366f1', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: '#ef4444', borderRadius: radius.md, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  alertLabel: { color: '#ef4444', fontWeight: '800', fontSize: typography.sm },
  alertValue: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md },
  tileIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tilePoz: { color: colors.text.faint, fontSize: 10, marginTop: 6, fontWeight: '700' },
});

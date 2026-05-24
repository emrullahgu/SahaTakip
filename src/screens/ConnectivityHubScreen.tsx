// ConnectivityHubScreen — POZ-DEV-109 Veri kalıcılığı & Auth merkez ekranı
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList } from '../types';
import { isOnlineMode, getSyncQueue } from '../services/data';
import { useAuth } from '../context/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Tile {
  key: keyof RootStackParamList;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  poz: string;
}

const TILES: Tile[] = [
  { key: 'AuditLog',      label: 'Denetim Kayıtları', desc: 'Kullanıcı işlem geçmişi',   icon: 'document-text-outline', color: '#0ea5e9', poz: 'POZ-DEV-110' },
  { key: 'SyncStatus',    label: 'Senkronizasyon',    desc: 'Bekleyen işlemler / drain', icon: 'sync-outline',          color: '#16a34a', poz: 'POZ-DEV-111' },
  { key: 'DataMigration', label: 'Veri Taşıma',       desc: 'Yerelden Supabase\'e',      icon: 'cloud-upload-outline',  color: '#8b5cf6', poz: 'POZ-DEV-112' },
  { key: 'RoleMatrix',    label: 'Rol Matrisi',       desc: 'Yetki politikaları',        icon: 'shield-outline',        color: '#f59e0b', poz: 'POZ-DEV-113' },
];

export default function ConnectivityHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : width >= 600 ? 2 : 1;
  const tileWidth = (Math.min(width, 1200) - spacing.lg * 2 - (cols - 1) * spacing.md) / cols;

  const { profile, isDemoMode } = useAuth();
  const online = isOnlineMode();
  const [queueLen, setQueueLen] = useState(0);

  const refresh = useCallback(async () => { setQueueLen((await getSyncQueue()).length); }, []);
  useEffect(() => { refresh(); const id = setInterval(refresh, 5000); return () => clearInterval(id); }, [refresh]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="cloud-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Veri Kalıcılığı & Auth</Text>
            <Text style={styles.heroSub}>Supabase entegrasyonu, roller, audit & senkronizasyon</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <StatusPill label={online ? 'Çevrimiçi' : 'Çevrimdışı'} color={online ? '#22c55e' : '#f59e0b'} icon={online ? 'wifi' : 'cloud-offline-outline'} />
          <StatusPill label={`Kuyruk: ${queueLen}`} color={queueLen > 0 ? '#f59e0b' : '#64748b'} icon="layers-outline" />
          <StatusPill label={isDemoMode ? 'Demo' : (profile?.role || 'guest').toUpperCase()} color="#8b5cf6" icon="person-outline" />
        </View>

        <View style={[styles.grid, { maxWidth: 1200, alignSelf: 'center', width: '100%' }]}>
          {TILES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tile, { width: tileWidth }]}
              onPress={() => nav.navigate(t.key as never)}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon} size={22} color="#fff" />
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileDesc}>{t.desc}</Text>
              <Text style={styles.tilePoz}>{t.poz}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ label, color, icon }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }) {
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
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#0ea5e9', borderRadius: radius.md, marginBottom: spacing.md },
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

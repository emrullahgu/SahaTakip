// GovernanceHubScreen — POZ-DEV-350 Faz 35 hub
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GovernanceHub'>;

const TILES: { key: keyof RootStackParamList; label: string; icon: string; color: string; desc: string }[] = [
  { key: 'RoleMatrixV2', label: 'Rol & İzin Matrisi', icon: 'grid-outline', color: '#8b5cf6', desc: 'Roller × kaynak × eylem' },
  { key: 'PermissionsScreen', label: 'Ekran Bazlı İzinler', icon: 'lock-closed-outline', color: '#a855f7', desc: 'Detaylı izin yönetimi' },
  { key: 'Departments', label: 'Departmanlar', icon: 'business-outline', color: '#0ea5e9', desc: 'Departman hiyerarşisi' },
  { key: 'Regions', label: 'Bölgeler', icon: 'map-outline', color: '#06b6d4', desc: 'Şube / bölge erişimi' },
  { key: 'Approvals', label: 'Onay Akışları', icon: 'checkmark-circle-outline', color: '#22c55e', desc: 'Bekleyen kritik onaylar' },
  { key: 'AuditLogV2', label: 'Audit Log', icon: 'time-outline', color: '#f59e0b', desc: 'Tüm sistem aksiyonları' },
  { key: 'SessionLogs', label: 'Oturum Geçmişi', icon: 'log-in-outline', color: '#ec4899', desc: 'Kullanıcı oturumları' },
  { key: 'SuspiciousLogins', label: 'Şüpheli Girişler', icon: 'shield-outline', color: '#ef4444', desc: 'Anormal aktiviteler' },
  { key: 'KvkkAccessLogs', label: 'KVKK Erişim', icon: 'document-lock-outline', color: '#64748b', desc: 'Kişisel veri erişim kayıtları' },
];

export default function GovernanceHubScreen() {
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 4 : 2;
  const tileW = (width - spacing.md * 2 - spacing.sm * (cols - 1)) / cols;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="shield-checkmark-outline" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroT}>Yetkilendirme & Denetim</Text>
            <Text style={s.heroS}>FAZ 35 — Rol matrisi, audit, KVKK, oturum güvenliği</Text>
          </View>
        </View>

        <View style={s.grid}>
          {TILES.map(t => (
            <TouchableOpacity key={t.key} style={[s.tile, { width: tileW, borderLeftColor: t.color }]} onPress={() => nav.navigate(t.key as never)}>
              <View style={[s.tileIcon, { backgroundColor: t.color + '22' }]}>
                <Ionicons name={t.icon as never} size={22} color={t.color} />
              </View>
              <Text style={s.tileLabel}>{t.label}</Text>
              <Text style={s.tileDesc} numberOfLines={2}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: '#7c3aed', borderRadius: radius.md },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  heroS: { color: '#fff', opacity: 0.9, fontSize: typography.sm, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderLeftWidth: 4, gap: 6, borderWidth: 1, borderColor: colors.border.primary },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  tileDesc: { color: colors.text.muted, fontSize: typography.xs },
});

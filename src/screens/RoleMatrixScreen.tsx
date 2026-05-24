// RoleMatrixScreen — POZ-DEV-113 Rol yetki politikaları matrisi
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { UserRole } from '../context/AuthContext';

interface RoleDef { key: UserRole; label: string; color: string; icon: keyof typeof Ionicons.glyphMap; }
const ROLES: RoleDef[] = [
  { key: 'admin',    label: 'Admin',    color: '#ef4444', icon: 'shield-checkmark' },
  { key: 'manager',  label: 'Manager',  color: '#0ea5e9', icon: 'briefcase' },
  { key: 'engineer', label: 'Engineer', color: '#22c55e', icon: 'construct' },
  { key: 'field',    label: 'Field',    color: '#f59e0b', icon: 'walk' },
];

interface Perm { module: string; roles: Record<UserRole, 'R' | 'W' | '-'>; }
const PERMS: Perm[] = [
  { module: 'Müşteriler',          roles: { admin: 'W', manager: 'W', engineer: 'R', field: 'R' } },
  { module: 'Teklifler',           roles: { admin: 'W', manager: 'W', engineer: 'W', field: 'R' } },
  { module: 'İş Emirleri',         roles: { admin: 'W', manager: 'W', engineer: 'W', field: 'W' } },
  { module: 'Personel',            roles: { admin: 'W', manager: 'W', engineer: 'R', field: '-' } },
  { module: 'Vardiya / Check-in',  roles: { admin: 'W', manager: 'W', engineer: 'W', field: 'W' } },
  { module: 'Konum Takibi',        roles: { admin: 'R', manager: 'R', engineer: '-', field: '-' } },
  { module: 'Raporlar',            roles: { admin: 'W', manager: 'W', engineer: 'R', field: '-' } },
  { module: 'Entegrasyonlar',      roles: { admin: 'W', manager: '-', engineer: '-', field: '-' } },
  { module: 'Yedekleme / 2FA',     roles: { admin: 'W', manager: '-', engineer: '-', field: '-' } },
  { module: 'Denetim Kayıtları',   roles: { admin: 'R', manager: 'R', engineer: '-', field: '-' } },
  { module: 'Veri Taşıma',         roles: { admin: 'W', manager: '-', engineer: '-', field: '-' } },
];

function badgeColor(p: 'R' | 'W' | '-'): { bg: string; fg: string; text: string } {
  if (p === 'W') return { bg: '#22c55e22', fg: '#22c55e', text: 'Y/O' };
  if (p === 'R') return { bg: '#0ea5e922', fg: '#0ea5e9', text: 'Oku' };
  return { bg: '#33415555', fg: '#64748b', text: '—' };
}

export default function RoleMatrixScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color="#8b5cf6" />
          <Text style={styles.infoText}>
            Bu matris uygulama içi varsayılan rol politikalarını gösterir. Supabase tarafında RLS politikaları
            <Text style={{ fontWeight: '800' }}> schema.sql</Text> içinde tanımlıdır.
          </Text>
        </View>

        <View style={styles.legend}>
          {(['W','R','-'] as const).map(p => {
            const c = badgeColor(p);
            return (
              <View key={p} style={[styles.legendItem, { borderColor: c.fg, backgroundColor: c.bg }]}>
                <Text style={[styles.legendText, { color: c.fg }]}>{c.text}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.headerRow}>
          <Text style={[styles.cellHeader, { flex: 2 }]}>Modül</Text>
          {ROLES.map(r => (
            <View key={r.key} style={[styles.roleHeader, { flex: 1 }]}>
              <Ionicons name={r.icon} size={12} color={r.color} />
              <Text style={[styles.cellHeader, { color: r.color, marginLeft: 2 }]}>{r.label}</Text>
            </View>
          ))}
        </View>

        {PERMS.map((p, i) => (
          <View key={p.module} style={[styles.dataRow, i % 2 === 0 && styles.altRow]}>
            <Text style={[styles.moduleCell, { flex: 2 }]}>{p.module}</Text>
            {ROLES.map(r => {
              const c = badgeColor(p.roles[r.key]);
              return (
                <View key={r.key} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[styles.badge, { borderColor: c.fg, backgroundColor: c.bg }]}>
                    <Text style={[styles.badgeText, { color: c.fg }]}>{c.text}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, paddingBottom: 80 },
  infoCard: { flexDirection: 'row', gap: 8, padding: spacing.md, backgroundColor: '#8b5cf622', borderWidth: 1, borderColor: '#8b5cf6', borderRadius: radius.md, marginBottom: spacing.md },
  infoText: { flex: 1, color: colors.text.primary, fontSize: typography.xs, lineHeight: 18 },
  legend: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  legendItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  legendText: { fontSize: 11, fontWeight: '800' },
  headerRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.primary, alignItems: 'center' },
  roleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cellHeader: { color: colors.text.muted, fontSize: 11, fontWeight: '800' },
  dataRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  altRow: { backgroundColor: colors.bg.secondary },
  moduleCell: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, minWidth: 40, alignItems: 'center' },
  badgeText: { fontSize: 10, fontWeight: '800' },
});

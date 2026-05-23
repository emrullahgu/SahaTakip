import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Toast from '../components/Toast';
import { RootStackParamList, TabParamList } from '../types';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { workOrders, toast } = useAppContext();
  const { profile, user, signOut, isDemoMode } = useAuth();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Test MÜHENDİS';
  const initials = displayName
    .split(' ')
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const pending = workOrders.filter(w => w.status === 'Onay Bekliyor').length;
  const completed = workOrders.filter(w => w.status === 'Faturalandırıldı').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {toast && <Toast toast={toast} />}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Merhaba 👋</Text>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.role}>
              KOBINERJI · {profile?.role === 'admin' ? 'Yönetici' : profile?.role === 'manager' ? 'Müdür' : profile?.role === 'engineer' ? 'Mühendis' : profile?.role === 'field' ? 'Saha Personeli' : 'Servis Mühendisi'}
              {isDemoMode && '  ·  DEMO'}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.amber.default }]}>{pending}</Text>
            <Text style={styles.statLabel}>Bekleyen</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.emerald.default }]}>{completed}</Text>
            <Text style={styles.statLabel}>Tamamlanan</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{workOrders.length}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionLabel}>Hızlı Erişim</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('WorkOrders')}
            activeOpacity={0.75}
          >
            <View style={[styles.gridIcon, { backgroundColor: colors.indigo.bg }]}>
              <Ionicons name="clipboard-outline" size={26} color={colors.indigo.default} />
            </View>
            <Text style={styles.gridLabel}>İş Emirlerim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Services')}
            activeOpacity={0.75}
          >
            <View style={[styles.gridIcon, { backgroundColor: colors.emerald.bg }]}>
              <Ionicons name="document-text-outline" size={26} color={colors.emerald.default} />
            </View>
            <Text style={styles.gridLabel}>Servislerim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Expenses')}
            activeOpacity={0.75}
          >
            <View style={[styles.gridIcon, { backgroundColor: colors.amber.bg }]}>
              <Ionicons name="card-outline" size={26} color={colors.amber.default} />
            </View>
            <Text style={styles.gridLabel}>Masraflarım</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Customers')}
            activeOpacity={0.75}
          >
            <View style={[styles.gridIcon, { backgroundColor: colors.indigo.bg }]}>
              <Ionicons name="people-outline" size={26} color={colors.indigo.default} />
            </View>
            <Text style={styles.gridLabel}>Müşteriler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Map')}
            activeOpacity={0.75}
          >
            <View style={[styles.gridIcon, { backgroundColor: colors.emerald.bg }]}>
              <Ionicons name="map-outline" size={26} color={colors.emerald.default} />
            </View>
            <Text style={styles.gridLabel}>Saha Haritası</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Company')}
            activeOpacity={0.75}
          >
            <View style={[styles.gridIcon, { backgroundColor: colors.blue.bg }]}>
              <Ionicons name="business-outline" size={26} color={colors.blue.default} />
            </View>
            <Text style={styles.gridLabel}>Firma Bilgisi</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Report CTA */}
        <View style={styles.cta}>
          <View style={styles.ctaHeader}>
            <Ionicons name="flash" size={14} color={colors.emerald.default} />
            <Text style={styles.ctaTitle}>HIZLI SAHA RAPORU</Text>
          </View>
          <Text style={styles.ctaDesc}>
            İş öncesi/sonrası fotoğraflı yeni bir teknik servis formu oluşturun.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => navigation.navigate('NewService')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color={colors.bg.primary} />
            <Text style={styles.ctaBtnText}>Servis Raporu Başlat</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        {workOrders.length > 0 && (
          <View>
            <Text style={styles.sectionLabel}>Son Aktiviteler</Text>
            {workOrders.slice(0, 4).map((order, idx) => (
              <View key={idx} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Ionicons name="document-text" size={18} color={colors.emerald.default} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityId}>{order.id}</Text>
                  <Text style={styles.activityClient} numberOfLines={1}>
                    {order.client}
                  </Text>
                  <Text style={styles.activityDate}>{order.date}</Text>
                </View>
                <StatusBadge status={order.status} small />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: { fontSize: typography.sm, color: colors.text.muted, fontWeight: '600' },
  name: {
    fontSize: typography.xl,
    color: colors.text.primary,
    fontWeight: '900',
    marginTop: 2,
  },
  role: { fontSize: typography.xs, color: colors.text.muted, marginTop: 3 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.bg.card,
    borderWidth: 2,
    borderColor: colors.emerald.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.primary,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: typography.xxl, fontWeight: '900' },
  statLabel: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: colors.border.primary },
  sectionLabel: {
    fontSize: typography.xs,
    color: colors.text.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  gridItem: {
    width: '47%',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  gridIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gridLabel: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  cta: {
    backgroundColor: colors.emerald.bg,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.emerald.border,
    marginBottom: spacing.xl,
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  ctaTitle: {
    fontSize: typography.xs,
    color: colors.emerald.default,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ctaDesc: {
    fontSize: typography.xs,
    color: colors.text.muted,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  ctaBtn: {
    backgroundColor: colors.emerald.default,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ctaBtnText: {
    color: colors.bg.primary,
    fontSize: typography.sm,
    fontWeight: '800',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing.md,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.emerald.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: { flex: 1 },
  activityId: {
    fontSize: typography.xs,
    color: colors.text.muted,
    fontWeight: '700',
  },
  activityClient: {
    fontSize: typography.sm,
    color: colors.text.primary,
    fontWeight: '600',
  },
  activityDate: { fontSize: typography.xs, color: colors.text.faint },
});

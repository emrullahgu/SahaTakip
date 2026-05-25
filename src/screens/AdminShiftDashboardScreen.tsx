// AdminShiftDashboardScreen — Canlı mesai paneli
// Admin/manager için: şu an mesaide olan tüm saha personelinin listesi,
// başlangıç konumu, süre, ve harita linki. 30 saniyede bir otomatik yenilenir.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { shiftsRepo, Shift } from '../services/data/shiftsRepo';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useHasRole } from '../components/RoleGuard';
import RoleLockScreen from '../components/RoleLockScreen';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ActiveRow extends Shift {
  employeeName: string;
  elapsedMin: number;
}

function fmtElapsed(min: number): string {
  if (min < 60) return `${Math.max(0, Math.floor(min))} dk`;
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${h} sa ${m} dk`;
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AdminShiftDashboardScreen() {
  const canSee = useHasRole(['admin', 'manager']);
  if (!canSee) {
    return (
      <RoleLockScreen description="Canlı mesai panelini yalnızca yönetici ve müdür görüntüleyebilir." />
    );
  }
  return <AdminShiftDashboardInner />;
}

function AdminShiftDashboardInner() {
  const nav = useNavigation<Nav>();
  const { employees } = useAppContext();
  const { isDemoMode } = useAuth();
  const [items, setItems] = useState<ActiveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const employeesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of employees) map[e.id] = e.name;
    return map;
  }, [employees]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await shiftsRepo.listActive();
      if (__DEV__) {
        console.log('[AdminShiftDashboard] listActive ->', raw.length, 'kayıt');
      }
      const now = Date.now();
      const rows: ActiveRow[] = raw.map((s) => {
        const name =
          (s.employeeId && employeesById[s.employeeId]) ||
          employeesById[s.userId] ||
          `Personel #${(s.userId || '').slice(0, 6) || '—'}`;
        const startMs = new Date(s.startAt).getTime();
        const elapsedMin = Number.isFinite(startMs) ? (now - startMs) / 60000 : 0;
        return { ...s, employeeName: name, elapsedMin };
      });
      setItems(rows);
      setLastSync(new Date());
    } finally {
      setLoading(false);
    }
  }, [employeesById]);

  useFocusEffect(
    useCallback(() => {
      load();
      intervalRef.current = setInterval(load, 30000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
      };
    }, [load]),
  );

  // Süre etiketleri canlı saysın diye 60 sn'lik tik
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const openMap = useCallback((lat?: number | null, lng?: number | null) => {
    if (lat == null || lng == null) return;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => {});
  }, []);

  const totalActive = items.length;

  const renderItem = useCallback(
    ({ item }: { item: ActiveRow }) => {
      const elapsed = (Date.now() - new Date(item.startAt).getTime()) / 60000;
      const hasLoc = item.startLat != null && item.startLng != null;
      return (
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.avatar}>
              <Ionicons name="person" size={20} color={brand.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>
                {item.employeeName}
              </Text>
              <View style={s.metaRow}>
                <Ionicons name="time-outline" size={14} color={colors.text.muted} />
                <Text style={s.meta}>Başlangıç {fmtTime(item.startAt)}</Text>
              </View>
            </View>
            <View style={s.badge}>
              <View style={s.dot} />
              <Text style={s.badgeText}>{fmtElapsed(elapsed)}</Text>
            </View>
          </View>
          {item.notes ? <Text style={s.notes}>{item.notes}</Text> : null}
          {hasLoc ? (
            <TouchableOpacity
              style={s.mapBtn}
              onPress={() => openMap(item.startLat, item.startLng)}
              activeOpacity={0.8}
            >
              <Ionicons name="location-outline" size={16} color={brand.blue} />
              <Text style={s.mapBtnText}>Başlangıç konumunu haritada gör</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.noLoc}>
              <Ionicons name="location-outline" size={14} color={colors.text.muted} />
              <Text style={s.noLocText}>Konum kaydı yok</Text>
            </View>
          )}
        </View>
      );
    },
    [openMap],
  );

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.text.muted} />
        }
        ListHeaderComponent={
          <View>
            <View style={s.hero}>
              <View style={s.heroIcon}>
                <Ionicons name="pulse" size={28} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroTitle}>Canlı Mesai Paneli</Text>
                <Text style={s.heroDesc}>
                  Şu an mesaide olan saha personelini gerçek zamanlı görüntüleyin.
                </Text>
              </View>
            </View>
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderColor: brand.green }]}>
                <Text style={s.statNum}>{totalActive}</Text>
                <Text style={s.statLabel}>Aktif Personel</Text>
              </View>
              <View style={[s.statCard, { borderColor: colors.border.primary }]}>
                <Text style={s.statNum}>
                  {lastSync ? lastSync.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </Text>
                <Text style={s.statLabel}>Son Senkron</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.historyCta}
              onPress={() => nav.navigate('ShiftHistory')}
              activeOpacity={0.85}
            >
              <View style={s.historyCtaIcon}>
                <Ionicons name="time-outline" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.historyCtaTitle}>Mesai Geçmişi</Text>
                <Text style={s.historyCtaDesc}>
                  Tamamlanan vardiyalar — personel, başlangıç/bitiş saatleri ve PDF çıktısı.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </TouchableOpacity>
            {isDemoMode ? (
              <View style={s.demoWarn}>
                <Ionicons name="information-circle-outline" size={16} color="#f59e0b" />
                <Text style={s.demoWarnText}>
                  Demo modda Supabase'e bağlı olmadığınız için liste boş görünebilir. Gerçek hesapla giriş yapınca canlı veri akacaktır.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="moon-outline"
            title="Şu an aktif mesai yok"
            description="Saha ekibi mesai başlattığında burada görüntülenecek."
          />
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { ...typography.h3, color: colors.text.primary },
  heroDesc: { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNum: { ...typography.h2, color: colors.text.primary },
  statLabel: { ...typography.caption, color: colors.text.muted, marginTop: 4 },
  demoWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#fef3c7',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  demoWarnText: { flex: 1, ...typography.caption, color: '#92400e' },
  historyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing.md,
  },
  historyCtaIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCtaTitle: { ...typography.body, color: colors.text.primary, fontWeight: '700' },
  historyCtaDesc: { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.body, color: colors.text.primary, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { ...typography.caption, color: colors.text.muted },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: brand.green },
  badgeText: { ...typography.caption, color: brand.green, fontWeight: '700' },
  notes: { ...typography.caption, color: colors.text.muted, fontStyle: 'italic' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(59,130,246,0.10)',
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  mapBtnText: { ...typography.caption, color: brand.blue, fontWeight: '600' },
  noLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noLocText: { ...typography.caption, color: colors.text.muted },
});

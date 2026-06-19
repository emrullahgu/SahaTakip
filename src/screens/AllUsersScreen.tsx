// AllUsersScreen — Admin tüm kullanıcıları listeler, rol atar, onay durumunu değiştirir.
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from 'react-native';

// react-native-web Alert butonları çalışmaz; web'de window.confirm fallback.
function confirmAction(title: string, message: string, onConfirm: () => void, confirmLabel = 'Onayla') {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: confirmLabel, style: 'default', onPress: onConfirm },
  ]);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  listAllUsers,
  setUserRole,
  setUserApprovalStatus,
  AppUser,
} from '../services/userManagement';
import type { UserRole, ApprovalStatus } from '../context/AuthContext';

const ROLES: UserRole[] = ['admin', 'manager', 'engineer', 'field'];

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  engineer: 'Mühendis',
  field: 'Saha Personeli',
};

const ROLE_COLOR: Record<UserRole, string> = {
  admin: '#ef4444',
  manager: '#f59e0b',
  engineer: '#3b82f6',
  field: '#10b981',
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
};

const STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

type StatusFilter = 'all' | ApprovalStatus;

export default function AllUsersScreen() {
  const { profile, isDemoMode } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [roleTarget, setRoleTarget] = useState<AppUser | null>(null);

  const isAuthorized = isDemoMode || profile?.role === 'admin';

  const load = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    const data = await listAllUsers();
    setUsers(data);
    setLoading(false);
    setRefreshing(false);
  }, [isAuthorized]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = users.filter(u => {
    if (filter !== 'all' && u.approval_status !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        (u.full_name || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: users.length,
    pending: users.filter(u => u.approval_status === 'pending').length,
    approved: users.filter(u => u.approval_status === 'approved').length,
    rejected: users.filter(u => u.approval_status === 'rejected').length,
  };

  const changeRole = async (u: AppUser, role: UserRole) => {
    setRoleTarget(null);
    if (u.role === role) return;
    setBusyId(u.id);
    const { error } = await setUserRole(u.id, role);
    setBusyId(null);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, role } : x)));
  };

  const changeStatus = (u: AppUser, status: ApprovalStatus) => {
    const action = status === 'approved' ? 'Onayla' : status === 'rejected' ? 'Reddet' : 'Beklet';
    confirmAction(
      action,
      `${u.full_name || u.email} kullanıcısı için "${STATUS_LABEL[status]}" durumuna geçilsin mi?`,
      async () => {
        setBusyId(u.id);
        const { error } = await setUserApprovalStatus(u.id, status);
        setBusyId(null);
        if (error) {
          Alert.alert('Hata', error);
          return;
        }
        setUsers(prev =>
          prev.map(x =>
            x.id === u.id
              ? {
                  ...x,
                  approval_status: status,
                  approved_at: status === 'approved' ? new Date().toISOString() : x.approved_at,
                }
              : x,
          ),
        );
      },
      action,
    );
  };

  if (!isAuthorized) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.text.faint} />
          <Text style={styles.emptyTitle}>Yetki Yok</Text>
          <Text style={styles.emptySub}>Tüm kullanıcı listesine yalnızca admin erişebilir.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Kullanıcılar</Text>
        <Text style={styles.subtitle}>{filtered.length} / {users.length} kullanıcı</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="İsim veya e-posta ara…"
          placeholderTextColor={colors.text.faint}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.tabRow}>
        {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(t => {
          const active = filter === t;
          const label = t === 'all' ? 'Tümü' : STATUS_LABEL[t];
          const cnt = counts[t];
          return (
            <TouchableOpacity key={t} style={[styles.tab, active && styles.tabActive]} onPress={() => setFilter(t)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{cnt}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.emerald.default} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={56} color={colors.text.faint} />
          <Text style={styles.emptyTitle}>Sonuç yok</Text>
          <Text style={styles.emptySub}>Filtre veya arama kriterini değiştirin.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald.default} />
          }
        >
          {filtered.map(u => {
            const busy = busyId === u.id;
            const initials = (u.full_name || u.email || '?')
              .split(/\s+/)
              .map(p => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            const isMe = u.id === profile?.id;
            return (
              <View key={u.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: ROLE_COLOR[u.role] + '33', borderColor: ROLE_COLOR[u.role] }]}>
                    <Text style={[styles.avatarText, { color: ROLE_COLOR[u.role] }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {u.full_name || '(Adsız)'}
                      </Text>
                      {isMe && <Text style={styles.meBadge}>Sen</Text>}
                    </View>
                    <Text style={styles.email} numberOfLines={1}>{u.email}</Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.pill, { backgroundColor: ROLE_COLOR[u.role] + '22', borderColor: ROLE_COLOR[u.role] }]}>
                        <Ionicons name="shield-outline" size={11} color={ROLE_COLOR[u.role]} />
                        <Text style={[styles.pillText, { color: ROLE_COLOR[u.role] }]}>{ROLE_LABEL[u.role]}</Text>
                      </View>
                      <View style={[styles.pill, { backgroundColor: STATUS_COLOR[u.approval_status] + '22', borderColor: STATUS_COLOR[u.approval_status] }]}>
                        <Ionicons name="checkmark-circle-outline" size={11} color={STATUS_COLOR[u.approval_status]} />
                        <Text style={[styles.pillText, { color: STATUS_COLOR[u.approval_status] }]}>{STATUS_LABEL[u.approval_status]}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {busy ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.emerald.default} />
                  </View>
                ) : (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
                      onPress={() => setRoleTarget(u)}
                      disabled={isMe}
                    >
                      <Ionicons name="swap-vertical-outline" size={14} color="#fff" />
                      <Text style={styles.actionText}>Rol</Text>
                    </TouchableOpacity>
                    {u.approval_status !== 'approved' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => changeStatus(u, 'approved')}
                      >
                        <Ionicons name="checkmark-outline" size={14} color="#fff" />
                        <Text style={styles.actionText}>Onayla</Text>
                      </TouchableOpacity>
                    )}
                    {u.approval_status === 'approved' && !isMe && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                        onPress={() => changeStatus(u, 'pending')}
                      >
                        <Ionicons name="pause-outline" size={14} color="#fff" />
                        <Text style={styles.actionText}>Beklet</Text>
                      </TouchableOpacity>
                    )}
                    {u.approval_status !== 'rejected' && !isMe && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                        onPress={() => changeStatus(u, 'rejected')}
                      >
                        <Ionicons name="close-outline" size={14} color="#fff" />
                        <Text style={styles.actionText}>Reddet</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Rol seçme modal */}
      <Modal visible={!!roleTarget} transparent animationType="fade" onRequestClose={() => setRoleTarget(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setRoleTarget(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rol Ata</Text>
            <Text style={styles.modalSub}>{roleTarget?.full_name || roleTarget?.email}</Text>
            {ROLES.map(r => {
              const active = roleTarget?.role === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleRow, active && { backgroundColor: ROLE_COLOR[r] + '22', borderColor: ROLE_COLOR[r] }]}
                  onPress={() => roleTarget && changeRole(roleTarget, r)}
                >
                  <Ionicons name="shield-outline" size={16} color={ROLE_COLOR[r]} />
                  <Text style={[styles.roleRowText, { color: ROLE_COLOR[r] }]}>{ROLE_LABEL[r]}</Text>
                  {active && <Ionicons name="checkmark" size={16} color={ROLE_COLOR[r]} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setRoleTarget(null)}>
              <Text style={styles.modalCancelText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  subtitle: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.bg.secondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: typography.sm, padding: 0 },
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary,
  },
  tabActive: { backgroundColor: colors.emerald.default, borderColor: colors.emerald.default },
  tabText: { color: colors.text.muted, fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: colors.bg.primary },
  tabBadgeActive: { backgroundColor: 'rgba(0,0,0,0.25)' },
  tabBadgeText: { color: colors.text.muted, fontSize: 10, fontWeight: '700' },
  tabBadgeTextActive: { color: '#fff' },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  cardTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  avatarText: { fontSize: typography.sm, fontWeight: '800' },
  name: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  meBadge: {
    color: '#fff', fontSize: 10, fontWeight: '800',
    backgroundColor: colors.emerald.default,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6,
  },
  email: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1,
  },
  pillText: { fontSize: 10, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm,
  },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  emptySub: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  modalCard: {
    backgroundColor: colors.bg.secondary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  modalTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  modalSub: { color: colors.text.muted, fontSize: typography.xs, marginBottom: spacing.sm },
  roleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary,
    backgroundColor: colors.bg.primary,
  },
  roleRowText: { flex: 1, fontSize: typography.sm, fontWeight: '700' },
  modalCancel: { alignItems: 'center', padding: 10, marginTop: 6 },
  modalCancelText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
});

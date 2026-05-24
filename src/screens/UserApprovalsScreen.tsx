// UserApprovalsScreen — Admin/Manager yeni kayıt başvurularını onaylar/reddeder.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';

// react-native-web'de Alert.alert butonları çalışmaz; web'de window.confirm fallback.
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
  listPendingUsers,
  approveUser,
  rejectUser,
  PendingUser,
} from '../services/userApprovals';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  engineer: 'Mühendis',
  field: 'Saha Personeli',
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function UserApprovalsScreen() {
  const { profile, isDemoMode } = useAuth();
  const [items, setItems] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAuthorized =
    isDemoMode || profile?.role === 'admin' || profile?.role === 'manager';

  const load = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    const data = await listPendingUsers();
    setItems(data);
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

  const onApprove = (u: PendingUser) => {
    confirmAction(
      'Onayla',
      `${u.full_name || u.email} kullanıcısına erişim verilsin mi?`,
      async () => {
        setBusyId(u.id);
        const { error } = await approveUser(u.id);
        setBusyId(null);
        if (error) {
          Alert.alert('Hata', error);
          return;
        }
        setItems(prev => prev.filter(x => x.id !== u.id));
      },
    );
  };

  const openReject = (u: PendingUser) => {
    setRejectTarget(u);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    const { error } = await rejectUser(rejectTarget.id, rejectReason.trim());
    setBusyId(null);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    setItems(prev => prev.filter(x => x.id !== rejectTarget.id));
    setRejectTarget(null);
    setRejectReason('');
  };

  if (!isAuthorized) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.text.faint} />
          <Text style={styles.emptyTitle}>Yetki Yok</Text>
          <Text style={styles.emptySub}>
            Kullanıcı onay ekranına yalnızca admin / yönetici erişebilir.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kullanıcı Onayları</Text>
          <Text style={styles.subtitle}>
            {items.length} bekleyen başvuru
          </Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="hourglass-outline" size={14} color={colors.amber.default} />
          <Text style={styles.badgeText}>Bekliyor</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.emerald.default} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={56} color={colors.emerald.default} />
          <Text style={styles.emptyTitle}>Bekleyen başvuru yok</Text>
          <Text style={styles.emptySub}>
            Yeni bir kullanıcı kaydolduğunda burada görünür.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald.default} />
          }
        >
          {items.map(u => {
            const busy = busyId === u.id;
            const initials = (u.full_name || u.email || '?')
              .split(/\s+/)
              .map(p => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
            return (
              <View key={u.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {u.full_name || '(Adsız)'}
                    </Text>
                    <Text style={styles.email} numberOfLines={1}>
                      {u.email}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={styles.metaPill}>
                        <Ionicons name="shield-outline" size={11} color={colors.text.muted} />
                        <Text style={styles.metaText}>{ROLE_LABEL[u.role] || u.role}</Text>
                      </View>
                      <View style={styles.metaPill}>
                        <Ionicons name="calendar-outline" size={11} color={colors.text.muted} />
                        <Text style={styles.metaText}>{fmtDate(u.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn, busy && styles.btnDisabled]}
                    onPress={() => openReject(u)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#fff" />
                    <Text style={styles.btnText}>Reddet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn, busy && styles.btnDisabled]}
                    onPress={() => onApprove(u)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={styles.btnText}>Onayla</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Reject reason modal */}
      <Modal
        visible={!!rejectTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectTarget(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Başvuruyu Reddet</Text>
            <Text style={styles.modalSub}>
              {rejectTarget?.full_name || rejectTarget?.email} kullanıcısına gönderilecek
              isteğe bağlı bir gerekçe yazabilirsiniz.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Gerekçe (opsiyonel)"
              placeholderTextColor={colors.text.faint}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setRejectTarget(null)}
              >
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={confirmReject}
              >
                <Text style={styles.modalConfirmText}>Reddet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  title: {
    fontSize: typography.lg,
    color: colors.text.primary,
    fontWeight: '800',
  },
  subtitle: { fontSize: typography.xs, color: colors.text.muted, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.amber.bg,
    borderColor: colors.amber.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: typography.xs,
    color: colors.amber.default,
    fontWeight: '700',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: {
    fontSize: typography.md,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: typography.sm,
    color: colors.text.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  list: { padding: spacing.lg, paddingBottom: 80 },
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.indigo.bg,
    borderWidth: 1,
    borderColor: colors.indigo.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.indigo.default, fontWeight: '800', fontSize: typography.sm },
  name: { fontSize: typography.md, color: colors.text.primary, fontWeight: '700' },
  email: { fontSize: typography.sm, color: colors.text.secondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  metaText: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  approveBtn: { backgroundColor: colors.emerald.default },
  rejectBtn: { backgroundColor: '#dc2626' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.bg.secondary,
    padding: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalTitle: {
    fontSize: typography.lg,
    color: colors.text.primary,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: typography.sm,
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalCancel: { backgroundColor: colors.bg.primary, borderWidth: 1, borderColor: colors.border.primary },
  modalCancelText: { color: colors.text.primary, fontWeight: '700' },
  modalConfirm: { backgroundColor: '#dc2626' },
  modalConfirmText: { color: '#fff', fontWeight: '800' },
});

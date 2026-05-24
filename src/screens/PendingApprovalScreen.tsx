// PendingApprovalScreen — kullanıcı oturum açmış ama profilin approval_status'ü 'pending' veya 'rejected'.
// Kullanıcı hiçbir şey yapamaz; sadece "Çıkış Yap" seçeneği vardır.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function PendingApprovalScreen() {
  const { profile, user, signOut } = useAuth();
  const status = profile?.approval_status;
  const isRejected = status === 'rejected';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={[styles.iconWrap, isRejected ? styles.iconWrapRejected : styles.iconWrapPending]}>
          <Ionicons
            name={isRejected ? 'close-circle-outline' : 'hourglass-outline'}
            size={56}
            color={isRejected ? '#dc2626' : colors.amber.default}
          />
        </View>

        <Text style={styles.title}>
          {isRejected ? 'Erişim Reddedildi' : 'Onay Bekleniyor'}
        </Text>

        <Text style={styles.subtitle}>
          {isRejected
            ? 'Hesap erişim talebiniz yönetici tarafından reddedildi.'
            : 'Yeni hesabınız yönetici onayı bekliyor. Onaylandıktan sonra giriş yapabilirsiniz.'}
        </Text>

        {isRejected && profile?.rejection_reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Neden</Text>
            <Text style={styles.reasonText}>{profile.rejection_reason}</Text>
          </View>
        ) : null}

        <View style={styles.infoBox}>
          <Ionicons name="person-outline" size={14} color={colors.text.muted} />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={signOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <Text style={styles.help}>
          Sistem yöneticinizle iletişime geçip onayınızı hızlandırabilirsiniz.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  iconWrapPending: { backgroundColor: colors.amber.bg, borderColor: colors.amber.border },
  iconWrapRejected: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
  title: { fontSize: typography.xl, color: colors.text.primary, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    fontSize: typography.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 360,
  },
  reasonBox: {
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    maxWidth: 360,
  },
  reasonLabel: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', marginBottom: 4 },
  reasonText: { color: colors.text.primary, fontSize: typography.sm },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.primary,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  infoText: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.emerald.default,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  help: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', maxWidth: 320, marginTop: spacing.sm },
});

// AppHeader — rol-bazlı landing'ler için ortak üst bar (profil + çıkış).
// Yönetici Dashboard gibi kendi header'ı olmayan ekranlara eklenir; böylece her
// rolün ana ekranında profil fotoğrafı/ayarı ve ÇIKIŞ erişimi tutarlı kalır.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Yönetici', manager: 'Müdür', engineer: 'Mühendis', field: 'Saha Personeli',
};

export default function AppHeader({ title }: { title?: string }) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { profile, user, signOut, isDemoMode } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Kullanıcı';
  const initials = useMemo(
    () => displayName.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'K',
    [displayName],
  );
  const role = profile?.role ?? (isDemoMode ? 'admin' : 'field');

  const confirmLogout = () =>
    Alert.alert('Çıkış', 'Oturumu kapatmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <View style={[styles.row, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity style={styles.avatarWrap} onPress={() => nav.navigate('Profile')} activeOpacity={0.8} accessibilityLabel="Profil">
        {profile?.avatar_url
          ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} resizeMode="cover" />
          : <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{title ?? displayName}</Text>
        <Text style={styles.role} numberOfLines={1}>
          {ROLE_LABEL[role] ?? 'Personel'}{isDemoMode ? '  ·  DEMO' : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={() => nav.navigate('Profile')} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Profil ayarları">
        <Ionicons name="person-circle-outline" size={24} color={colors.text.muted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={confirmLogout} style={styles.iconBtn} hitSlop={8} accessibilityLabel="Çıkış yap">
        <Ionicons name="log-out-outline" size={22} color={colors.text.muted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    backgroundColor: colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: colors.border.primary,
  },
  avatarWrap: { },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.primary, overflow: 'hidden' },
  avatarText: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm },
  name: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  role: { color: colors.text.muted, fontSize: typography.xs, marginTop: 1 },
  iconBtn: { padding: 6 },
});

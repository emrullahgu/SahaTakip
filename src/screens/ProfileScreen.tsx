// ProfileScreen — POZ-DEV-305 Kullanıcı profil yönetimi
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { useAuth, UserRole } from '../context/AuthContext';
import type { RootStackParamList } from '../types';

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Yönetici',
  manager: 'Müdür',
  engineer: 'Mühendis',
  field: 'Saha Personeli',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { user, profile, signOut, updateProfile, isOffline, isDemoMode } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile]);

  const onSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName.trim() || null, phone: phone.trim() || null });
    setSaving(false);
    if (error) return Alert.alert('Hata', error);
    Alert.alert('Tamam', 'Profil güncellendi');
  };

  const initials = (fullName || profile?.full_name || user?.email || 'U')
    .split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{fullName || profile?.full_name || 'İsimsiz'}</Text>
            <Text style={s.email}>{user?.email || (isDemoMode ? 'Demo Kullanıcı' : '—')}</Text>
            {profile?.role && (
              <View style={[s.rolePill, { backgroundColor: '#0ea5e9' + '22', borderColor: '#0ea5e9' }]}>
                <Text style={[s.rolePillText, { color: '#0ea5e9' }]}>{ROLE_LABEL[profile.role]}</Text>
              </View>
            )}
          </View>
        </View>

        {(isOffline || isDemoMode) && (
          <View style={s.warnBox}>
            <Ionicons name="warning-outline" size={16} color="#f59e0b" />
            <Text style={s.warnText}>{isDemoMode ? 'Demo modda — değişiklikler bulutla senkronlanmaz.' : 'Supabase yapılandırılmamış.'}</Text>
          </View>
        )}

        <Text style={s.sectionTitle}>Kişisel Bilgiler</Text>
        <Text style={s.label}>Ad Soyad</Text>
        <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>Telefon</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+90 5xx ..." placeholderTextColor={colors.text.faint} keyboardType="phone-pad" />

        <TouchableOpacity style={s.btnSave} onPress={onSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={s.btnSaveText}>Kaydet</Text></>}
        </TouchableOpacity>

        <Text style={s.sectionTitle}>Hesap</Text>
        <TouchableOpacity style={s.row} onPress={() => nav.navigate('ChangePassword' as never)}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.text.primary} />
          <Text style={s.rowText}>Şifreyi Değiştir</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.row} onPress={() => nav.navigate('Notifications' as never)}>
          <Ionicons name="notifications-outline" size={20} color={colors.text.primary} />
          <Text style={s.rowText}>Bildirimler</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.btnSignOut}
          onPress={() => Alert.alert('Çıkış', 'Oturumu kapatmak istiyor musunuz?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Çıkış', style: 'destructive', onPress: () => signOut() },
          ])}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={s.btnSignOutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 80 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  email: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  rolePill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, marginTop: 6 },
  rolePillText: { fontSize: typography.xs, fontWeight: '700' },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, backgroundColor: '#f59e0b22', borderRadius: radius.md, borderWidth: 1, borderColor: '#f59e0b' },
  warnText: { color: '#f59e0b', fontSize: typography.sm, flex: 1 },
  sectionTitle: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm, marginTop: spacing.md },
  label: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.md },
  btnSave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  btnSaveText: { color: '#fff', fontWeight: '700', fontSize: typography.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  rowText: { color: colors.text.primary, fontSize: typography.md, flex: 1, fontWeight: '600' },
  btnSignOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ef4444', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  btnSignOutText: { color: '#fff', fontWeight: '700', fontSize: typography.md },
});

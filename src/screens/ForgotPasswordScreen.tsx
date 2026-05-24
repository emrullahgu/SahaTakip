// ForgotPasswordScreen — POZ-DEV-302
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordScreen() {
  const nav = useNavigation();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) return Alert.alert('Eksik', 'E-posta giriniz');
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) return Alert.alert('Hata', error);
    setSent(true);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.content}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          <Text style={s.backText}>Geri</Text>
        </TouchableOpacity>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="lock-closed-outline" size={28} color="#fff" /></View>
          <Text style={s.title}>Şifremi Unuttum</Text>
          <Text style={s.subtitle}>E-posta adresinize sıfırlama bağlantısı göndereceğiz.</Text>
        </View>
        {sent ? (
          <View style={s.successBox}>
            <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
            <Text style={s.successText}>Sıfırlama bağlantısı e-postanıza gönderildi. Lütfen gelen kutunuzu kontrol edin.</Text>
            <TouchableOpacity style={s.btn} onPress={() => nav.goBack()}>
              <Text style={s.btnText}>Giriş ekranına dön</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={s.label}>E-posta</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@firma.com"
              placeholderTextColor={colors.text.faint}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={s.btn} onPress={onSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sıfırlama Bağlantısı Gönder</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: colors.text.primary, fontSize: typography.sm },
  hero: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  subtitle: { color: colors.text.muted, textAlign: 'center', fontSize: typography.sm, paddingHorizontal: spacing.md },
  label: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', marginTop: spacing.md },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.md },
  btn: { backgroundColor: '#0ea5e9', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: typography.md },
  successBox: { alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: '#22c55e' },
  successText: { color: colors.text.primary, textAlign: 'center', fontSize: typography.sm },
});

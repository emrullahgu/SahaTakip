// Faz 48 — CpLoginScreen (POZ-DEV-181)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getCpBranding } from '../services/customerPortal';
import type { CpBrandingConfig } from '../types';

export default function CpLoginScreen() {
  const nav = useNavigation<any>();
  const [brand, setBrand] = useState<CpBrandingConfig | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);

  useFocusEffect(useCallback(() => { (async () => setBrand(await getCpBranding()))(); }, []));

  const login = () => {
    if (!email || !password) { Alert.alert('Eksik bilgi', 'Email ve şifre gerekli.'); return; }
    nav.navigate('CpDashboard');
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.brand}>
          <Text style={[s.logo, { color: brand?.primaryColor ?? '#0ea5e9' }]}>{brand?.logoEmoji ?? '⚡'}</Text>
          <Text style={s.brandName}>{brand?.brandName ?? 'Müşteri Portalı'}</Text>
          <Text style={s.greet}>{brand?.greeting ?? 'Hoş geldiniz.'}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.lbl}>E-posta</Text>
          <View style={s.inputRow}>
            <Ionicons name="mail" size={18} color={colors.text.muted} />
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="ornek@firma.com" placeholderTextColor={colors.text.faint} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <Text style={s.lbl}>Şifre</Text>
          <View style={s.inputRow}>
            <Ionicons name="lock-closed" size={18} color={colors.text.muted} />
            <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.text.faint} secureTextEntry={!show} />
            <TouchableOpacity onPress={() => setShow(v => !v)}>
              <Ionicons name={show ? 'eye-off' : 'eye'} size={18} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.checkRow} onPress={() => setRemember(v => !v)}>
            <Ionicons name={remember ? 'checkbox' : 'square-outline'} size={20} color={brand?.primaryColor ?? '#0ea5e9'} />
            <Text style={s.checkT}>Beni hatırla</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.loginBtn, { backgroundColor: brand?.primaryColor ?? '#0ea5e9' }]} onPress={login}>
            <Ionicons name="log-in" size={18} color="#fff" />
            <Text style={s.loginT}>Giriş Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.forgot}>
            <Text style={[s.forgotT, { color: brand?.secondaryColor ?? '#22c55e' }]}>Şifremi unuttum</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>{brand?.footerText ?? '© 2024 SahaTakip'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.md, flexGrow: 1, justifyContent: 'center' },
  brand: { alignItems: 'center', gap: 6, paddingVertical: spacing.lg },
  logo: { fontSize: 64 },
  brandName: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '800' },
  greet: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  lbl: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, backgroundColor: colors.bg.primary },
  input: { flex: 1, color: colors.text.primary, fontSize: typography.base, paddingVertical: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkT: { color: colors.text.primary, fontSize: typography.sm },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.sm, marginTop: spacing.sm },
  loginT: { color: '#fff', fontSize: typography.base, fontWeight: '800' },
  forgot: { alignSelf: 'center', marginTop: 4 },
  forgotT: { fontSize: typography.sm, fontWeight: '600' },
  footer: { color: colors.text.faint, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.md },
});

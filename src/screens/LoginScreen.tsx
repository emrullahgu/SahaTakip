import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const REMEMBER_KEY = '@sahatakip:rememberMe';
const SAVED_EMAIL_KEY = '@sahatakip:lastEmail';

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { signIn, enterDemoMode, isOffline } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const rememberRef = useRef(true);

  // Kayıtlı e-posta ve "beni hatırla" tercihini yükle
  useEffect(() => {
    (async () => {
      try {
        const [savedEmail, savedRemember] = await Promise.all([
          AsyncStorage.getItem(SAVED_EMAIL_KEY),
          AsyncStorage.getItem(REMEMBER_KEY),
        ]);
        const remember = savedRemember === null ? true : savedRemember === '1';
        setRememberMe(remember);
        rememberRef.current = remember;
        if (remember && savedEmail) setEmail(savedEmail);
      } catch {}
    })();
  }, []);

  // "Beni Hatırla" kapalıysa uygulama arka plana alındığında oturumu kapat
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'background' && !rememberRef.current) {
        supabase.auth.signOut().catch(() => {});
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const toggleRemember = async () => {
    const next = !rememberMe;
    setRememberMe(next);
    rememberRef.current = next;
    try {
      await AsyncStorage.setItem(REMEMBER_KEY, next ? '1' : '0');
      if (!next) await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
    } catch {}
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Eksik bilgi', 'E-posta ve şifre giriniz.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Giriş başarısız', error);
      return;
    }
    try {
      await AsyncStorage.setItem(REMEMBER_KEY, rememberMe ? '1' : '0');
      if (rememberMe) {
        await AsyncStorage.setItem(SAVED_EMAIL_KEY, email.trim());
      } else {
        await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
      }
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brand}>SahaTakip</Text>
            <Text style={styles.slogan}>SAHADA · TAKİPTE · KONTROLDE</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>E-posta</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.text.faint} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@SahaTakip.com"
                placeholderTextColor={colors.text.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <Text style={[styles.label, { marginTop: spacing.md }]}>Şifre</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.text.faint} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.text.faint}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                <Ionicons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.text.faint}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={toggleRemember}
              activeOpacity={0.7}
            >
              <Ionicons
                name={rememberMe ? 'checkbox' : 'square-outline'}
                size={20}
                color={rememberMe ? brand.green : colors.text.faint}
              />
              <Text style={styles.rememberText}>Beni Hatırla</Text>
              <Text style={styles.rememberHint}>(şifre tekrar sorulmasın)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Giriş Yap</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Hesabınız yok mu? Kaydolun</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 6 }]}
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: '#0ea5e9' }]}>Şifremi unuttum</Text>
            </TouchableOpacity>

            {/* Offline / Demo */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>veya</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={enterDemoMode}
              activeOpacity={0.85}
            >
              <Ionicons name="play-circle-outline" size={18} color={brand.blue} />
              <Text style={styles.demoBtnText}>Demo Modda Dene</Text>
            </TouchableOpacity>

            {isOffline && (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={14} color={colors.amber.default} />
                <Text style={styles.offlineText}>
                  Supabase yapılandırılmamış. Sadece demo mod kullanılabilir.
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.footer}>SahaTakipMühendislik © 2025</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingTop: spacing.xl, minHeight: '100%' },

  logoWrap: { alignItems: 'center', marginVertical: spacing.xl },
  logo: { width: 110, height: 110 },
  brand: { fontSize: 28, color: colors.text.primary, fontWeight: '900', marginTop: spacing.sm },
  slogan: { fontSize: 10, color: brand.green, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },

  form: { marginTop: spacing.lg },
  label: { fontSize: typography.xs, color: colors.text.muted, fontWeight: '700', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  input: { flex: 1, color: colors.text.primary, fontSize: typography.sm, paddingVertical: 2 },

  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: 4,
  },
  rememberText: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  rememberHint: { color: colors.text.faint, fontSize: 11, fontWeight: '500' },

  primaryBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: brand.green,
    borderRadius: radius.md,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },

  secondaryBtn: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm },
  secondaryBtnText: { color: brand.blueLight, fontSize: typography.xs, fontWeight: '600' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.primary },
  dividerText: { color: colors.text.faint, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  demoBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.indigo.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  demoBtnText: { color: brand.blueLight, fontWeight: '700', fontSize: typography.sm },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.amber.bg,
    borderColor: colors.amber.border,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  offlineText: { fontSize: 10, color: colors.amber.default, flex: 1, lineHeight: 14 },

  footer: { textAlign: 'center', color: colors.text.faint, fontSize: 10, marginTop: spacing.xl },
});

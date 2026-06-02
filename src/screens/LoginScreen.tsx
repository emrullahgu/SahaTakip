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
  Animated,
  Easing,
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

  // ===== Yaratıcı animasyonlar =====
  const fade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;
  const sloganProgress = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    // Giriş sahnesi: logo zıplayarak gelir, ardından slogan harf harf yıkanır,
    // sonra form aşağıdan yukarı kayar.
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(sloganProgress, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(formY, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();

    // Logo: yumuşak yukarı-aşağı salınım
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(logoFloat, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Logo arkasında radar dalgası (SAHADA TAKİP metaforu)
    Animated.loop(
      Animated.timing(ringPulse, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true })
    ).start();

    // Arka plan orb’leri (yavaş sürüklenir)
    Animated.loop(Animated.timing(orb1, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true })).start();
    Animated.loop(Animated.timing(orb2, { toValue: 1, duration: 11000, easing: Easing.inOut(Easing.quad), useNativeDriver: true })).start();
    Animated.loop(Animated.timing(orb3, { toValue: 1, duration: 13000, easing: Easing.inOut(Easing.quad), useNativeDriver: true })).start();
  }, []);

  const logoTranslateY = logoFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.35, 0] });
  const ring2Scale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] });
  const ring2Opacity = ringPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] });

  const SLOGAN_TEXT = 'SAHADA · TAKİPTE · KONTROLDE';
  const sloganChars = SLOGAN_TEXT.split('');


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
      {/* Arka plan: yavaş sürüklenen renkli orb’ler */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbGreen,
          {
            transform: [
              { translateX: orb1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-20, 40, -10] }) },
              { translateY: orb1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -30, 20] }) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbBlue,
          {
            transform: [
              { translateX: orb2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [10, -40, 30] }) },
              { translateY: orb2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 30, -20] }) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbIndigo,
          {
            transform: [
              { translateX: orb3.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 25, -25] }) },
              { translateY: orb3.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -25, 15] }) },
            ],
          },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo + radar halkaları */}
          <Animated.View style={[styles.logoWrap, { opacity: fade }]}>
            <View style={styles.logoStage}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.radarRing,
                  { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.radarRing,
                  styles.radarRing2,
                  { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] },
                ]}
              />
              <Animated.View
                style={{ transform: [{ scale: logoScale }, { translateY: logoTranslateY }] }}
              >
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
            <Animated.Text
              style={[
                styles.brand,
                {
                  opacity: fade,
                  transform: [
                    { translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                  ],
                },
              ]}
            >
              SahaTakip
            </Animated.Text>
            <View style={styles.sloganRow}>
              {sloganChars.map((ch, i) => {
                const t = i / sloganChars.length;
                const charOpacity = sloganProgress.interpolate({
                  inputRange: [Math.max(0, t - 0.05), Math.min(1, t + 0.05)],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                });
                const charY = sloganProgress.interpolate({
                  inputRange: [Math.max(0, t - 0.05), Math.min(1, t + 0.05)],
                  outputRange: [6, 0],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.Text
                    key={`${i}-${ch}`}
                    style={[styles.slogan, { opacity: charOpacity, transform: [{ translateY: charY }] }]}
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </Animated.Text>
                );
              })}
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.form, { opacity: fade, transform: [{ translateY: formY }] }]}>
            <Text style={styles.label}>E-posta</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.text.faint} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={`ornek@${BRAND.company.website.replace(/^www\./, '')}`}
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
          </Animated.View>

          <Text style={styles.footer}>{BRAND.company.name} © {BRAND.company.copyrightYear}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary, overflow: 'hidden' },
  content: { padding: spacing.lg, paddingTop: spacing.xl, minHeight: '100%' },

  // Arka plan orb’leri
  orb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.18,
  },
  orbGreen: { top: -80, left: -90, backgroundColor: brand.green },
  orbBlue: { top: 180, right: -110, backgroundColor: brand.blue },
  orbIndigo: { bottom: -100, left: -60, backgroundColor: '#6366f1' },

  logoWrap: { alignItems: 'center', marginVertical: spacing.xl },
  logoStage: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  radarRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: brand.green,
  },
  radarRing2: { borderColor: brand.blue },
  logo: { width: 110, height: 110 },
  brand: { fontSize: 28, color: colors.text.primary, fontWeight: '900', marginTop: spacing.sm },
  sloganRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  slogan: { fontSize: 10, color: brand.green, fontWeight: '800', letterSpacing: 1.5 },

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

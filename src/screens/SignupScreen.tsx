import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../config/brand';
import { addNotification } from '../services/notifications';
import type { AuthStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

// react-native-web Alert.alert butonlarının onPress'i çalışmaz; web'de window.alert kullan.
function notify(title: string, message: string, onClose?: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-alert
      window.alert(`${title}\n\n${message}`);
    }
    onClose?.();
    return;
  }
  Alert.alert(title, message, [{ text: 'Tamam', onPress: onClose }]);
}

export default function SignupScreen() {
  const navigation = useNavigation<NavProp>();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      notify('Eksik bilgi', 'Tüm alanları doldurunuz.');
      return;
    }
    if (password.length < 6) {
      notify('Hata', 'Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== pwd2) {
      notify('Hata', 'Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);
    if (error) {
      notify('Kayıt başarısız', error);
      return;
    }
    try {
      await addNotification({
        type: 'signup',
        title: 'Yeni kullanıcı kaydı',
        message: `${fullName.trim()} (${email.trim()}) hesabını oluşturdu`,
        channels: ['email'],
        recipient: 'admin',
      });
    } catch {
      /* notify hatası akışı durdurmasın */
    }
    notify(
      'Kayıt alındı',
      'Hesabınız oluşturuldu.\n\n1) E-posta kutunuza gelen doğrulama bağlantısına tıklayın.\n2) Hesabınızın yetkili (admin) tarafından onaylanması beklenmektedir.\n3) Onay verildikten sonra giriş yapabilirsiniz.',
      () => navigation.goBack(),
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Yeni Hesap</Text>
            <View style={{ width: 22 }} />
          </View>

          <Text style={styles.subtitle}>
            Saha takip için hesap oluşturun. Yönetici onayı sonrası rolünüz tanımlanacak.
          </Text>

          {/* Admin onayı bilgilendirme bannerı */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={brand.blueLight} />
            <Text style={styles.infoBannerText}>
              Hesap oluşturduktan sonra <Text style={styles.infoBannerBold}>yetkili (admin) onayı</Text>{' '}
              beklemeniz gerekmektedir. E-posta doğrulaması ve admin onayı tamamlanana kadar giriş yapılamaz.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field
              icon="person-outline"
              label="Ad Soyad"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ahmet Mühendis"
            />
            <Field
              icon="mail-outline"
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              placeholder={`ornek@${BRAND.company.website.replace(/^www\./, '')}`}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon="lock-closed-outline"
              label="Şifre (min 6 karakter)"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
            <Field
              icon="lock-closed-outline"
              label="Şifre Tekrarı"
              value={pwd2}
              onChangeText={setPwd2}
              placeholder="••••••••"
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Hesap Oluştur</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Zaten hesabınız var mı? Giriş yapın</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  icon,
  label,
  ...inputProps
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={colors.text.faint} />
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.text.faint}
          autoCapitalize="words"
          {...inputProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingTop: spacing.md, minHeight: '100%' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: { padding: 4 },
  title: { fontSize: typography.lg, color: colors.text.primary, fontWeight: '900' },
  subtitle: { color: colors.text.muted, fontSize: typography.xs, lineHeight: 18, marginBottom: spacing.md },

  infoBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoBannerText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.xs,
    lineHeight: 18,
  },
  infoBannerBold: { fontWeight: '800', color: brand.blueLight },

  form: { marginTop: spacing.sm },
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
});

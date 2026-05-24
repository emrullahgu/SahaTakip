// ResetPasswordScreen — POZ-DEV-303 (deep-link sıfırlama akışı sonrası yeni şifre)
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordScreen() {
  const nav = useNavigation();
  const { updatePassword } = useAuth();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (p1.length < 6) return Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
    if (p1 !== p2) return Alert.alert('Hata', 'Şifreler eşleşmiyor');
    setLoading(true);
    const { error } = await updatePassword(p1);
    setLoading(false);
    if (error) return Alert.alert('Hata', error);
    Alert.alert('Tamam', 'Şifreniz güncellendi', [{ text: 'OK', onPress: () => nav.goBack() }]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.content}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
          <Text style={s.backText}>Geri</Text>
        </TouchableOpacity>
        <View style={s.hero}>
          <View style={s.heroIcon}><Ionicons name="key-outline" size={28} color="#fff" /></View>
          <Text style={s.title}>Yeni Şifre</Text>
          <Text style={s.subtitle}>Yeni şifrenizi belirleyin.</Text>
        </View>
        <Text style={s.label}>Yeni şifre</Text>
        <TextInput style={s.input} value={p1} onChangeText={setP1} secureTextEntry placeholderTextColor={colors.text.faint} />
        <Text style={s.label}>Yeni şifre (tekrar)</Text>
        <TextInput style={s.input} value={p2} onChangeText={setP2} secureTextEntry placeholderTextColor={colors.text.faint} />
        <TouchableOpacity style={s.btn} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Şifreyi Güncelle</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: colors.text.primary, fontSize: typography.sm },
  hero: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  subtitle: { color: colors.text.muted, textAlign: 'center', fontSize: typography.sm },
  label: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', marginTop: spacing.md },
  input: { backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text.primary, fontSize: typography.md },
  btn: { backgroundColor: '#a855f7', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: typography.md },
});

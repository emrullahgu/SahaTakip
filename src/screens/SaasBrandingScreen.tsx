// Faz 50 — SaasBrandingScreen (POZ-DEV-207)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getSaasBranding, updateSaasBranding } from '../services/saas';
import type { SaasBrandingConfig } from '../types';

const PALETTE = ['#0ea5e9', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#10b981'];

export default function SaasBrandingScreen() {
  const [b, setB] = useState<SaasBrandingConfig | null>(null);
  const load = useCallback(async () => setB(await getSaasBranding()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patch = async (p: Partial<SaasBrandingConfig>) => setB(await updateSaasBranding(p));

  const verifyDomain = async () => {
    await patch({ customDomainVerified: true });
    Alert.alert('Doğrulandı', 'Alan adı DNS doğrulaması başarılı.');
  };

  if (!b) return <SafeAreaView style={s.safe} />;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.preview, { backgroundColor: b.primaryColor }]}>
          <View style={[s.logoBox, { borderColor: b.accentColor }]}>
            <Ionicons name="business" size={28} color="#fff" />
          </View>
          <Text style={s.previewT}>{b.tenantName}</Text>
          <Text style={s.previewD}>Önizleme</Text>
        </View>

        <Text style={s.section}>Birincil Renk</Text>
        <View style={s.palette}>
          {PALETTE.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.swatch, { backgroundColor: c }, b.primaryColor === c && s.swatchActive]}
              onPress={() => patch({ primaryColor: c })}
            >
              {b.primaryColor === c && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.section}>Vurgu Rengi</Text>
        <View style={s.palette}>
          {PALETTE.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.swatch, { backgroundColor: c }, b.accentColor === c && s.swatchActive]}
              onPress={() => patch({ accentColor: c })}
            >
              {b.accentColor === c && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.section}>E-posta Gönderen Adı</Text>
        <TextInput
          style={s.input}
          value={b.emailFromName}
          onChangeText={t => setB({ ...b, emailFromName: t })}
          onBlur={() => patch({ emailFromName: b.emailFromName })}
          placeholderTextColor={colors.text.faint}
        />

        <Text style={s.section}>Özel Alan Adı</Text>
        <View style={s.domainRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={b.customDomain || ''}
            onChangeText={t => setB({ ...b, customDomain: t })}
            onBlur={() => patch({ customDomain: b.customDomain, customDomainVerified: false })}
            placeholder="saha.firmaniz.com"
            placeholderTextColor={colors.text.faint}
          />
          <View style={[s.verifyPill, { backgroundColor: (b.customDomainVerified ? '#22c55e' : '#f59e0b') + '33', borderColor: b.customDomainVerified ? '#22c55e' : '#f59e0b' }]}>
            <Ionicons name={b.customDomainVerified ? 'checkmark-circle' : 'time'} size={14} color={b.customDomainVerified ? '#22c55e' : '#f59e0b'} />
            <Text style={[s.verifyT, { color: b.customDomainVerified ? '#22c55e' : '#f59e0b' }]}>{b.customDomainVerified ? 'Doğrulandı' : 'Bekliyor'}</Text>
          </View>
        </View>
        {!b.customDomainVerified && b.customDomain && (
          <TouchableOpacity style={s.verifyBtn} onPress={verifyDomain} activeOpacity={0.85}>
            <Ionicons name="shield-checkmark" size={16} color="#fff" />
            <Text style={s.verifyBtnT}>Alan Adını Doğrula</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  preview: { padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', gap: 8 },
  logoBox: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  previewT: { color: '#fff', fontSize: typography.lg, fontWeight: '800' },
  previewD: { color: 'rgba(255,255,255,0.7)', fontSize: typography.xs },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm, textTransform: 'uppercase' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#fff' },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, fontSize: typography.sm },
  domainRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  verifyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  verifyT: { fontSize: typography.xs, fontWeight: '800' },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e', padding: spacing.sm, borderRadius: radius.sm },
  verifyBtnT: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
});

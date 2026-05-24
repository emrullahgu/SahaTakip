// Faz 48 — CpShareLinkSecurityScreen (POZ-DEV-190)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getCpSecurity, updateCpSecurity } from '../services/customerPortal';
import type { CpShareLinkSecurityPolicy } from '../types';

const ACTION_COLOR: Record<'view' | 'download' | 'fail', string> = {
  view: '#0ea5e9', download: '#22c55e', fail: '#ef4444',
};
const ACTION_ICON: Record<'view' | 'download' | 'fail', string> = {
  view: 'eye', download: 'download', fail: 'close-circle',
};
const ACTION_LABEL: Record<'view' | 'download' | 'fail', string> = {
  view: 'Görüntüleme', download: 'İndirme', fail: 'Başarısız',
};

export default function CpShareLinkSecurityScreen() {
  const [p, setP] = useState<CpShareLinkSecurityPolicy | null>(null);

  useFocusEffect(useCallback(() => { (async () => setP(await getCpSecurity()))(); }, []));

  if (!p) return <SafeAreaView style={s.safe} />;

  const save = async () => {
    await updateCpSecurity(p);
    Alert.alert('Kaydedildi', 'Güvenlik politikası güncellendi.');
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="shield-checkmark" size={40} color="#14b8a6" />
          <Text style={s.heroT}>Paylaşımlı Link Güvenliği</Text>
          <Text style={s.heroS}>Süre, token, erişim logu</Text>
        </View>

        <Text style={s.section}>Politika</Text>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowT}>Varsayılan süre (saat)</Text>
            <Text style={s.rowD}>Link kaç saat geçerli olsun</Text>
          </View>
          <TextInput
            style={s.numInput}
            keyboardType="numeric"
            value={String(p.defaultExpiryHours)}
            onChangeText={t => setP({ ...p, defaultExpiryHours: Math.max(1, parseInt(t || '0', 10) || 0) })}
          />
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowT}>Şifre koruması zorunlu</Text>
            <Text style={s.rowD}>Tüm linkler şifre ister</Text>
          </View>
          <Switch value={p.requirePassword} onValueChange={v => setP({ ...p, requirePassword: v })} thumbColor={p.requirePassword ? '#14b8a6' : '#64748b'} />
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowT}>PDF filigran</Text>
            <Text style={s.rowD}>Görüntüleyenin IP ve tarih bilgisi</Text>
          </View>
          <Switch value={p.watermarkPdfs} onValueChange={v => setP({ ...p, watermarkPdfs: v })} thumbColor={p.watermarkPdfs ? '#14b8a6' : '#64748b'} />
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowT}>Tüm erişimleri logla</Text>
            <Text style={s.rowD}>Açma, indirme, başarısız denemeler</Text>
          </View>
          <Switch value={p.logAllAccess} onValueChange={v => setP({ ...p, logAllAccess: v })} thumbColor={p.logAllAccess ? '#14b8a6' : '#64748b'} />
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowT}>Maks. indirme sayısı</Text>
            <Text style={s.rowD}>Link başına izin verilen indirme</Text>
          </View>
          <TextInput
            style={s.numInput}
            keyboardType="numeric"
            value={String(p.maxDownloads)}
            onChangeText={t => setP({ ...p, maxDownloads: Math.max(0, parseInt(t || '0', 10) || 0) })}
          />
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowT}>IP kısıtlaması</Text>
            <Text style={s.rowD}>Sadece kayıtlı IP'lerden erişim</Text>
          </View>
          <Switch value={p.ipRestriction} onValueChange={v => setP({ ...p, ipRestriction: v })} thumbColor={p.ipRestriction ? '#14b8a6' : '#64748b'} />
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={save}>
          <Ionicons name="save" size={18} color="#fff" />
          <Text style={s.saveT}>Politikayı Kaydet</Text>
        </TouchableOpacity>

        <Text style={s.section}>Son Erişimler ({p.recentLogs.length})</Text>
        {p.recentLogs.map(log => (
          <View key={log.id} style={[s.log, { borderLeftColor: ACTION_COLOR[log.action] }]}>
            <Ionicons name={ACTION_ICON[log.action] as any} size={18} color={ACTION_COLOR[log.action]} />
            <View style={{ flex: 1 }}>
              <Text style={s.logT}>{log.resource}</Text>
              <Text style={s.logM}>{log.viewerIp} · {new Date(log.at).toLocaleString('tr-TR')}</Text>
            </View>
            <Text style={[s.logA, { color: ACTION_COLOR[log.action] }]}>{ACTION_LABEL[log.action]}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: '#14b8a622', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#14b8a6', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroS: { color: colors.text.muted, fontSize: typography.sm },
  section: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  rowT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  rowD: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  numInput: { backgroundColor: colors.bg.primary, color: colors.text.primary, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, minWidth: 60, textAlign: 'center', fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.sm, borderRadius: radius.md, backgroundColor: '#14b8a6', marginTop: spacing.sm },
  saveT: { color: '#fff', fontSize: typography.base, fontWeight: '800' },
  log: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  logT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  logM: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  logA: { fontSize: typography.xs, fontWeight: '800' },
});

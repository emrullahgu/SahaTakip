// ShareLinkDetailScreen — POZ-DEV-405
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, ShareLink, ShareLinkAccessLog } from '../types';
import { getShareLink, listShareLinkLogs, recordShareLinkAccess, revokeShareLink, LINK_RESOURCE_LABEL, LINK_RESOURCE_COLOR } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ShareLinkDetail'>;

const RESULT_LABEL: Record<ShareLinkAccessLog['result'], string> = { opened: 'Açıldı', denied: 'Reddedildi', expired: 'Süre Doldu' };
const RESULT_COLOR: Record<ShareLinkAccessLog['result'], string> = { opened: '#22c55e', denied: '#ef4444', expired: '#f59e0b' };

export default function ShareLinkDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { linkId } = useRoute<R>().params;
  const [link, setLink] = useState<ShareLink | undefined>();
  const [logs, setLogs] = useState<ShareLinkAccessLog[]>([]);

  const load = useCallback(async () => {
    setLink(await getShareLink(linkId));
    setLogs(await listShareLinkLogs(linkId));
  }, [linkId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!link) return <SafeAreaView style={s.safe}><Text style={s.empty}>Link bulunamadı.</Text></SafeAreaView>;

  const seed = async () => {
    await recordShareLinkAccess(link.id, 'opened', 'simüle');
    await recordShareLinkAccess(link.id, Math.random() > 0.5 ? 'opened' : 'denied');
    load();
  };
  const revoke = () => Alert.alert('İptal et', 'Link iptal edilecek.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'İptal Et', style: 'destructive', onPress: async () => { await revokeShareLink(link.id); load(); } },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
        <View style={s.hero}>
          <View style={[s.icoBox, { backgroundColor: LINK_RESOURCE_COLOR[link.resource] + '33' }]}>
            <Ionicons name="link-outline" size={32} color={LINK_RESOURCE_COLOR[link.resource]} />
          </View>
          <Text style={s.title}>{link.title}</Text>
          <Text style={s.sub}>{LINK_RESOURCE_LABEL[link.resource]} · {link.opens} açılım</Text>
        </View>

        <Row k="Token" v={link.token} mono />
        <Row k="Kaynak ID" v={link.resourceId} />
        <Row k="Oluşturuldu" v={new Date(link.createdAt).toLocaleString('tr-TR')} />
        {link.expiresAt && <Row k="Sona Erer" v={new Date(link.expiresAt).toLocaleString('tr-TR')} />}
        {link.maxOpens && <Row k="Max Açılım" v={String(link.maxOpens)} />}
        {link.password && <Row k="Şifre" v={'•'.repeat(link.password.length)} />}
        <Row k="Durum" v={link.status} />

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0ea5e9' }]} onPress={() => navigation.navigate('ShareLinkForm', { linkId: link.id })}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={s.btnT}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#8b5cf6' }]} onPress={seed}>
            <Ionicons name="flask-outline" size={16} color="#fff" />
            <Text style={s.btnT}>Erişim Simüle</Text>
          </TouchableOpacity>
          {link.status === 'active' && (
            <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={revoke}>
              <Ionicons name="close-circle-outline" size={16} color="#fff" />
              <Text style={s.btnT}>İptal Et</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.section}>Erişim Geçmişi ({logs.length})</Text>
        {logs.length === 0 ? <Text style={s.empty}>Henüz erişim yok.</Text> : logs.map(l => (
          <View key={l.id} style={[s.card, { borderLeftColor: RESULT_COLOR[l.result] }]}>
            <Ionicons name={l.result === 'opened' ? 'eye-outline' : l.result === 'denied' ? 'close-circle-outline' : 'time-outline'} size={18} color={RESULT_COLOR[l.result]} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={s.t}>{RESULT_LABEL[l.result]}</Text>
              <Text style={s.subSmall}>{new Date(l.occurredAt).toLocaleString('tr-TR')}{l.note ? ` · ${l.note}` : ''}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowK}>{k}</Text>
      <Text style={[s.rowV, mono && { fontFamily: 'monospace' }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  hero: { backgroundColor: colors.bg.secondary, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border.primary },
  icoBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  sub: { color: colors.text.muted, fontSize: typography.sm, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  rowK: { color: colors.text.muted, fontSize: typography.xs },
  rowV: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  section: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, marginBottom: 6 },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  subSmall: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 20 },
});

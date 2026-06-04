// ApprovalDetailScreen — POZ-DEV-358
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { getApproval, decideApproval, APPROVAL_KIND_LABEL, APPROVAL_STATUS_LABEL, APPROVAL_STATUS_COLOR } from '../services/governance';
import { useAuth } from '../context/AuthContext';
import { recordAudit } from '../services/governance';
import EmptyState from '../components/EmptyState';
import type { ApprovalRequest, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ApprovalDetail'>;
type R = RouteProp<RootStackParamList, 'ApprovalDetail'>;

export default function ApprovalDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const { profile } = useAuth();
  const [item, setItem] = useState<ApprovalRequest | undefined>();
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try { setItem(await getApproval(route.params.requestId)); }
    finally { setLoaded(true); }
  }, [route.params.requestId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!loaded) {
    return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 48 }} color={colors.text.muted} /></SafeAreaView>;
  }
  if (!item) {
    return (
      <SafeAreaView style={s.safe}>
        <EmptyState
          icon="checkmark-done-outline"
          title="Onay bulunamadı"
          subtitle="Talep silinmiş veya erişim izniniz olmayabilir."
          actionLabel="Geri Dön"
          onAction={() => nav.goBack()}
        />
      </SafeAreaView>
    );
  }

  const act = async (next: 'approved' | 'rejected') => {
    await decideApproval(item.id, next, profile?.id, undefined);
    await recordAudit({
      actorId: profile?.id, actorName: profile?.full_name || undefined,
      action: 'permission_change', resource: 'system', resourceId: item.id,
      note: `Onay ${next === 'approved' ? 'onaylandı' : 'reddedildi'}: ${item.title}`,
    });
    Alert.alert('Tamam', next === 'approved' ? 'Onaylandı' : 'Reddedildi');
    nav.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: APPROVAL_STATUS_COLOR[item.status] }]}>
          <Ionicons name="checkmark-circle-outline" size={28} color="#fff" />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={s.heroT}>{item.title}</Text>
            <Text style={s.heroS}>{APPROVAL_KIND_LABEL[item.kind]} · {APPROVAL_STATUS_LABEL[item.status]}</Text>
          </View>
        </View>

        {item.description ? <View style={s.card}><Text style={s.cardT}>Açıklama</Text><Text style={s.cardV}>{item.description}</Text></View> : null}

        <View style={s.card}>
          <Row label="Talep eden" value={item.requestedByName || item.requestedBy || '—'} />
          <Row label="Kaynak" value={`${item.resource || '—'}${item.resourceId ? ' · ' + item.resourceId : ''}`} />
          <Row label="Oluşturuldu" value={new Date(item.createdAt).toLocaleString('tr-TR')} />
          {item.decidedAt ? <Row label="Karar" value={new Date(item.decidedAt).toLocaleString('tr-TR')} /> : null}
          {item.decisionNote ? <Row label="Not" value={item.decisionNote} /> : null}
        </View>

        {item.status === 'pending' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actBtn, { backgroundColor: '#22c55e' }]} onPress={() => act('approved')}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.actTxt}>Onayla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actBtn, { backgroundColor: '#ef4444' }]} onPress={() => act('rejected')}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={s.actTxt}>Reddet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowL}>{label}</Text>
      <Text style={s.rowV} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md },
  heroT: { color: '#fff', fontSize: typography.md, fontWeight: '800' },
  heroS: { color: '#fff', opacity: 0.9, fontSize: typography.sm, marginTop: 2 },
  card: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  cardT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  cardV: { color: colors.text.primary, fontSize: typography.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowL: { color: colors.text.muted, fontSize: typography.sm },
  rowV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, borderRadius: radius.md },
  actTxt: { color: '#fff', fontWeight: '800', fontSize: typography.md },
});

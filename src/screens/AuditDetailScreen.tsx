// AuditDetailScreen — POZ-DEV-360 Eski/yeni değer karşılaştırma
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { getAuditEntry, AUDIT_ACTION_LABEL, AUDIT_ACTION_COLOR } from '../services/governance';
import type { AuditLogEntry, RootStackParamList } from '../types';

type R = RouteProp<RootStackParamList, 'AuditDetail'>;

export default function AuditDetailScreen() {
  const route = useRoute<R>();
  const [item, setItem] = useState<AuditLogEntry | undefined>();

  const load = useCallback(async () => { setItem(await getAuditEntry(route.params.entryId)); }, [route.params.entryId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!item) return <SafeAreaView style={s.safe}><Text style={s.empty}>Kayıt bulunamadı.</Text></SafeAreaView>;

  const beforeKeys = Object.keys(item.before || {});
  const afterKeys = Object.keys(item.after || {});
  const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: AUDIT_ACTION_COLOR[item.action] }]}>
          <Ionicons name="time-outline" size={28} color="#fff" />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={s.heroT}>{AUDIT_ACTION_LABEL[item.action]}</Text>
            <Text style={s.heroS}>{item.resource}{item.resourceId ? ' · ' + item.resourceId : ''}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Row label="Aktör" value={item.actorName || item.actorId || '—'} />
          <Row label="Tarih" value={new Date(item.occurredAt).toLocaleString('tr-TR')} />
          {item.ip ? <Row label="IP" value={item.ip} /> : null}
          {item.userAgent ? <Row label="UA" value={item.userAgent} /> : null}
          {item.note ? <Row label="Not" value={item.note} /> : null}
        </View>

        {allKeys.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardT}>Değişiklik Karşılaştırma</Text>
            {allKeys.map(k => {
              const b = (item.before as any)?.[k];
              const a = (item.after as any)?.[k];
              const changed = JSON.stringify(b) !== JSON.stringify(a);
              return (
                <View key={k} style={s.diffRow}>
                  <Text style={s.diffKey}>{k}</Text>
                  <View style={s.diffSide}>
                    <Text style={s.diffLabel}>ESKI</Text>
                    <Text style={[s.diffVal, changed && { color: '#ef4444' }]} numberOfLines={2}>{b === undefined ? '—' : String(b)}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={colors.text.muted} />
                  <View style={s.diffSide}>
                    <Text style={s.diffLabel}>YENI</Text>
                    <Text style={[s.diffVal, changed && { color: '#22c55e' }]} numberOfLines={2}>{a === undefined ? '—' : String(a)}</Text>
                  </View>
                </View>
              );
            })}
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
      <Text style={s.rowV} numberOfLines={3}>{value}</Text>
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
  card: { backgroundColor: colors.bg.secondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border.primary, gap: 8 },
  cardT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowL: { color: colors.text.muted, fontSize: typography.sm },
  rowV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: spacing.sm },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border.primary },
  diffKey: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700', width: 80 },
  diffSide: { flex: 1 },
  diffLabel: { color: colors.text.faint, fontSize: 9, fontWeight: '700' },
  diffVal: { color: colors.text.primary, fontSize: typography.xs },
});

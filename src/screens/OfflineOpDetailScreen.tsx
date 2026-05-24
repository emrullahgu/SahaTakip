// OfflineOpDetailScreen — POZ-DEV-382
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { getOp, deleteOp, OP_KIND_LABEL, OP_STATUS_LABEL, OP_STATUS_COLOR } from '../services/offline';
import type { OfflineOperation, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OfflineOpDetail'>;
type R = RouteProp<RootStackParamList, 'OfflineOpDetail'>;

export default function OfflineOpDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<R>();
  const [op, setOp] = useState<OfflineOperation | undefined>();

  const load = useCallback(async () => { setOp(await getOp(route.params.opId)); }, [route.params.opId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!op) return <SafeAreaView style={s.safe}><Text style={s.empty}>İşlem bulunamadı.</Text></SafeAreaView>;

  const doDelete = () => {
    Alert.alert('Sil', 'Bu işlemi kuyruktan silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteOp(op.id); nav.goBack(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={[s.hero, { backgroundColor: OP_STATUS_COLOR[op.status] }]}>
          <Ionicons name="cloud-offline-outline" size={28} color="#fff" />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={s.heroT}>{op.description || OP_KIND_LABEL[op.kind]}</Text>
            <Text style={s.heroS}>{OP_KIND_LABEL[op.kind]} · {OP_STATUS_LABEL[op.status]}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Row label="Kaynak" value={`${op.resource}${op.resourceId ? ' · ' + op.resourceId : ''}`} />
          <Row label="Oluşturuldu" value={new Date(op.createdAt).toLocaleString('tr-TR')} />
          <Row label="Deneme" value={String(op.attempts)} />
          {op.syncedAt ? <Row label="Senkron" value={new Date(op.syncedAt).toLocaleString('tr-TR')} /> : null}
          {op.authorName ? <Row label="Oluşturan" value={op.authorName} /> : null}
          {op.lastError ? <Row label="Hata" value={op.lastError} /> : null}
        </View>

        <View style={s.card}>
          <Text style={s.cardT}>Payload</Text>
          <Text style={s.code}>{JSON.stringify(op.payload, null, 2)}</Text>
        </View>

        {op.status === 'conflict' && (
          <TouchableOpacity style={[s.actBtn, { backgroundColor: '#a855f7' }]} onPress={() => nav.navigate('ConflictResolver', { opId: op.id })}>
            <Ionicons name="git-compare-outline" size={18} color="#fff" />
            <Text style={s.actTxt}>Çakışmayı Çöz</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.actBtn, { backgroundColor: '#ef4444' }]} onPress={doDelete}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={s.actTxt}>Kuyruktan Sil</Text>
        </TouchableOpacity>
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
  code: { color: colors.text.primary, fontSize: 11, fontFamily: 'Courier' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowL: { color: colors.text.muted, fontSize: typography.sm },
  rowV: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: spacing.sm },
  actBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md, borderRadius: radius.md },
  actTxt: { color: '#fff', fontWeight: '800', fontSize: typography.md },
});

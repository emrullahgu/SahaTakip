// ShareLinksScreen — POZ-DEV-403
import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import type { RootStackParamList, ShareLink, ShareLinkResource } from '../types';
import { listShareLinks, revokeShareLink, deleteShareLink, LINK_RESOURCE_LABEL, LINK_RESOURCE_COLOR } from '../services/customerExperience';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'ShareLinks'>;

const FILTERS: Array<{ key: ShareLinkResource | 'all'; label: string }> = [
  { key: 'all', label: 'Tümü' }, { key: 'quote', label: 'Teklif' }, { key: 'work_order', label: 'İş Emri' },
  { key: 'report', label: 'Rapor' }, { key: 'document', label: 'Belge' },
];

function statusColor(l: ShareLink): string {
  if (l.status === 'revoked') return '#ef4444';
  if (l.status === 'expired') return '#f59e0b';
  if (l.expiresAt && new Date(l.expiresAt) < new Date()) return '#f59e0b';
  return '#22c55e';
}

export default function ShareLinksScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const initial = route.params?.resource;
  const [filter, setFilter] = useState<ShareLinkResource | 'all'>(initial || 'all');
  const [links, setLinks] = useState<ShareLink[]>([]);
  const load = useCallback(async () => { setLinks(await listShareLinks()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => filter === 'all' ? links : links.filter(l => l.resource === filter), [filter, links]);

  const revoke = (id: string) => Alert.alert('İptal et', 'Bu link iptal edilecek.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'İptal Et', style: 'destructive', onPress: async () => { await revokeShareLink(id); load(); } },
  ]);
  const remove = (id: string) => Alert.alert('Sil', 'Kalıcı silinecek.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => { await deleteShareLink(id); load(); } },
  ]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.chips}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, filter === f.key && s.chipOn]}>
            <Text style={[s.chipT, filter === f.key && s.chipTOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={l => l.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 120 }}
        ListEmptyComponent={<Text style={s.empty}>Link yok. + ile oluştur.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('ShareLinkDetail', { linkId: item.id })} onLongPress={() => remove(item.id)}>
            <View style={[s.icoBox, { backgroundColor: LINK_RESOURCE_COLOR[item.resource] + '33' }]}>
              <Ionicons name="link-outline" size={20} color={LINK_RESOURCE_COLOR[item.resource]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.t}>{item.title}</Text>
              <Text style={s.sub}>{LINK_RESOURCE_LABEL[item.resource]} · {item.opens} açılım{item.expiresAt ? ` · ${new Date(item.expiresAt).toLocaleDateString('tr-TR')}` : ''}</Text>
              <View style={s.tags}>
                <Text style={[s.tag, { backgroundColor: statusColor(item) + '33', color: statusColor(item) }]}>{item.status}</Text>
                {item.password && <Text style={[s.tag, { backgroundColor: '#a855f733', color: '#a855f7' }]}>Şifreli</Text>}
                {item.maxOpens && <Text style={[s.tag, { backgroundColor: '#0ea5e933', color: '#0ea5e9' }]}>Max {item.maxOpens}</Text>}
              </View>
            </View>
            {item.status === 'active' && (
              <TouchableOpacity onPress={() => revoke(item.id)}>
                <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('ShareLinkForm')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipOn: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  icoBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  tag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 80 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});

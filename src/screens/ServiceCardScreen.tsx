// Faz 46 — ServiceCardScreen (POZ-DEV-170 dijital servis karnesi)
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EqAsset, EqServiceCardEvent, EqServiceCardEventKind } from '../types';
import { buildEqServiceCard, listEqAssets, EQ_TYPE_COLOR, EQ_TYPE_ICON, EQ_TYPE_LABEL, EQ_STATUS_COLOR, EQ_STATUS_LABEL } from '../services/equipment';

const KIND_ICON: Record<EqServiceCardEventKind, string> = {
  install: 'construct', maintenance: 'build', fault: 'warning', warranty: 'shield-checkmark', inspection: 'search',
};
const KIND_COLOR: Record<EqServiceCardEventKind, string> = {
  install: '#0ea5e9', maintenance: '#22c55e', fault: '#ef4444', warranty: '#8b5cf6', inspection: '#a855f7',
};

export default function ServiceCardScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const presetId = route.params?.assetId as string | undefined;
  const [assets, setAssets] = useState<EqAsset[]>([]);
  const [asset, setAsset] = useState<EqAsset | null>(null);
  const [events, setEvents] = useState<EqServiceCardEvent[]>([]);

  const load = useCallback(async () => {
    const list = await listEqAssets();
    setAssets(list);
    const a = list.find(x => x.id === (presetId || asset?.id)) || list[0] || null;
    setAsset(a);
    if (a) setEvents(await buildEqServiceCard(a.id));
  }, [presetId, asset?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const selectAsset = async (a: EqAsset) => {
    setAsset(a);
    setEvents(await buildEqServiceCard(a.id));
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {assets.map(a => (
          <TouchableOpacity key={a.id} onPress={() => selectAsset(a)} style={[s.chip, asset?.id === a.id && { backgroundColor: EQ_TYPE_COLOR[a.type], borderColor: EQ_TYPE_COLOR[a.type] }]}>
            <Ionicons name={EQ_TYPE_ICON[a.type] as any} size={12} color={asset?.id === a.id ? '#fff' : EQ_TYPE_COLOR[a.type]} />
            <Text style={[s.chipT, asset?.id === a.id && { color: '#fff' }]}>{a.code}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {asset && (
        <View style={s.header}>
          <View style={[s.headIcon, { backgroundColor: EQ_TYPE_COLOR[asset.type] + '33' }]}>
            <Ionicons name={EQ_TYPE_ICON[asset.type] as any} size={32} color={EQ_TYPE_COLOR[asset.type]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.hT}>{asset.code} · {asset.name}</Text>
            <Text style={s.hM}>{EQ_TYPE_LABEL[asset.type]} · {asset.brand} {asset.model}</Text>
            <Text style={s.hM}>SN: {asset.serialNo} · {asset.capacity || '—'}</Text>
            <Text style={s.hM}>{asset.customerName} · {asset.location}</Text>
          </View>
          <View style={[s.status, { backgroundColor: EQ_STATUS_COLOR[asset.status] }]}>
            <Text style={s.statusT}>{EQ_STATUS_LABEL[asset.status]}</Text>
          </View>
        </View>
      )}

      <View style={s.actionsRow}>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => asset && nav.navigate('AssetQr', { assetId: asset.id })}>
          <Ionicons name="qr-code" size={16} color="#fff" />
          <Text style={s.actionT}>QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#22c55e' }]} onPress={() => asset && nav.navigate('AssetMaintenanceHistory', { assetId: asset.id })}>
          <Ionicons name="construct" size={16} color="#fff" />
          <Text style={s.actionT}>Bakım</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => asset && nav.navigate('AssetFaultHistory', { assetId: asset.id })}>
          <Ionicons name="warning" size={16} color="#fff" />
          <Text style={s.actionT}>Arıza</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.section}>Zaman çizelgesi</Text>
      <FlatList
        data={events}
        keyExtractor={e => e.id}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 4 }}
        renderItem={({ item }) => (
          <View style={s.tlRow}>
            <View style={[s.tlDot, { backgroundColor: KIND_COLOR[item.kind] }]}>
              <Ionicons name={KIND_ICON[item.kind] as any} size={14} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.tlT}>{item.label}</Text>
              <Text style={s.tlM}>{new Date(item.at).toLocaleDateString('tr-TR')}{item.by ? ` · ${item.by}` : ''}{item.cost ? ` · ₺${item.cost.toLocaleString('tr-TR')}` : ''}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>Bu varlık için kayıt yok.</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  chips: { padding: spacing.sm, gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.bg.secondary, borderRadius: 14, marginRight: 4, borderWidth: 1, borderColor: colors.border.primary },
  chipT: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, margin: spacing.md, marginTop: 4, marginBottom: 4, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  headIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  hT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  hM: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 10, borderRadius: radius.sm },
  actionT: { color: '#fff', fontWeight: '800', fontSize: typography.xs },
  section: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', paddingHorizontal: spacing.md, paddingBottom: 4 },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  tlDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tlT: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  tlM: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});

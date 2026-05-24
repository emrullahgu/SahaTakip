// AuditLogV2Screen — POZ-DEV-359 Detaylı audit log
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, radius, typography } from '../theme';
import { listAudit, clearAudit, recordAudit, AUDIT_ACTION_LABEL, AUDIT_ACTION_COLOR } from '../services/governance';
import type { AuditLogEntry, AuditAction, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AuditLogV2'>;

const ACTION_FILTERS: { key: AuditAction | 'all'; label: string }[] = [
  { key: 'all', label: 'Tümü' }, { key: 'create', label: 'Oluştur' }, { key: 'update', label: 'Güncelle' },
  { key: 'delete', label: 'Sil' }, { key: 'login', label: 'Giriş' }, { key: 'permission_change', label: 'Yetki' },
];

export default function AuditLogV2Screen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [filter, setFilter] = useState<AuditAction | 'all'>('all');

  const load = useCallback(async () => { setItems(await listAudit()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => filter === 'all' ? items : items.filter(i => i.action === filter), [items, filter]);

  const seedDemo = async () => {
    await recordAudit({ action: 'create', resource: 'customer', resourceId: 'M-105', actorName: 'Ahmet', note: 'Yeni müşteri eklendi' });
    await recordAudit({ action: 'update', resource: 'work_order', resourceId: 'IE-220', actorName: 'Mehmet', before: { status: 'open' }, after: { status: 'done' } });
    await recordAudit({ action: 'delete', resource: 'task', resourceId: 'G-77', actorName: 'Ahmet' });
    await recordAudit({ action: 'login', resource: 'system', actorName: 'Mehmet' });
    load();
  };

  const doClear = () => {
    Alert.alert('Temizle', 'Tüm audit kayıtları silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Temizle', style: 'destructive', onPress: async () => { await clearAudit(); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.toolbarT}>{items.length} kayıt</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#8b5cf6' }]} onPress={seedDemo}>
            <Ionicons name="flask-outline" size={14} color="#fff" />
            <Text style={s.btnTxt}>Demo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#ef4444' }]} onPress={doClear}>
            <Ionicons name="trash-outline" size={14} color="#fff" />
            <Text style={s.btnTxt}>Temizle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bar} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
        {ACTION_FILTERS.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[s.chip, filter === f.key && { backgroundColor: '#f59e0b' }]}>
            <Text style={[s.chipTxt, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Audit kaydı yok.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => nav.navigate('AuditDetail', { entryId: item.id })}>
            <View style={[s.actionDot, { backgroundColor: AUDIT_ACTION_COLOR[item.action] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.t}>{AUDIT_ACTION_LABEL[item.action]} · {item.resource}{item.resourceId ? ' · ' + item.resourceId : ''}</Text>
              <Text style={s.sub}>{item.actorName || '—'} · {new Date(item.occurredAt).toLocaleString('tr-TR')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  toolbarT: { color: colors.text.muted, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  btnTxt: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  bar: { maxHeight: 50 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.bg.secondary },
  chipTxt: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  actionDot: { width: 10, height: 10, borderRadius: 5 },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});

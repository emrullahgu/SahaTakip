// KvkkAccessLogsScreen — POZ-DEV-363
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listKvkk, recordKvkk, KVKK_KIND_LABEL, KVKK_KIND_COLOR } from '../services/governance';
import type { KvkkAccessLog } from '../types';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

export default function KvkkAccessLogsScreen() {
  const [items, setItems] = useState<KvkkAccessLog[]>([]);

  const load = useCallback(async () => { setItems(await listKvkk()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const seedDemo = async () => {
    await recordKvkk({ actorName: 'Ahmet', subjectId: 'M-101', subjectName: 'Aysel Demir', kind: 'view', fields: ['ad_soyad', 'tc_kimlik', 'telefon'], reason: 'Müşteri detay görüntüleme' });
    await recordKvkk({ actorName: 'Mehmet', subjectId: 'M-102', subjectName: 'Hasan Kara', kind: 'export', fields: ['tüm veri'], reason: 'KVKK veri talebi' });
    await recordKvkk({ actorName: 'Admin', subjectId: 'M-103', subjectName: 'Ali Veli', kind: 'delete', reason: 'KVKK silme talebi' });
    load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.toolbar}>
        <Text style={s.toolbarT}>{items.length} KVKK erişim kaydı</Text>
        <TouchableOpacity style={s.btn} onPress={seedDemo}>
          <Ionicons name="flask-outline" size={14} color="#fff" />
          <Text style={s.btnTxt}>Demo Veri</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState
            icon="document-lock-outline"
            title="KVKK kaydı yok"
            subtitle="Hassas verilere erişim logları burada listelenir."
            actionLabel="+ Demo Veri Oluştur"
            onAction={seedDemo}
          />
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={[s.iconWrap, { backgroundColor: KVKK_KIND_COLOR[item.kind as keyof typeof KVKK_KIND_COLOR] + '22' }]}>
              <Ionicons name="document-lock-outline" size={22} color={KVKK_KIND_COLOR[item.kind as keyof typeof KVKK_KIND_COLOR]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.t}>{KVKK_KIND_LABEL[item.kind as keyof typeof KVKK_KIND_LABEL]} — {item.subjectName || item.subjectId}</Text>
              <Text style={s.sub}>{item.actorName || '—'} · {new Date(item.occurredAt).toLocaleString('tr-TR')}</Text>
              {item.fields && item.fields.length > 0 ? <Text style={s.fields}>{item.fields.join(', ')}</Text> : null}
              {item.reason ? <Text style={s.reason}>{item.reason}</Text> : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  toolbarT: { color: colors.text.muted, fontSize: typography.sm },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8b5cf6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  btnTxt: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  fields: { color: colors.text.primary, fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' },
  reason: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});

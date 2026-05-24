// RestoreTestsScreen — Faz 40
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { RestoreTest } from '../types';
import { listRestoreTests, runRestoreTest, listBackups } from '../services/platform';

export default function RestoreTestsScreen() {
  const [items, setItems] = useState<RestoreTest[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setItems(await listRestoreTests()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async () => {
    setBusy(true);
    try {
      const backups = await listBackups();
      const latest = backups.find(b => b.status === 'success');
      if (!latest) { Alert.alert('Hata', 'Başarılı bir yedek bulunamadı.'); return; }
      const r = await runRestoreTest(latest.id);
      Alert.alert(r.success ? 'Başarılı' : 'Başarısız', `${r.durationSec}sn · ${r.message || ''}`);
      load();
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={s.empty}>Restore testi yok.</Text>}
        renderItem={({ item }) => {
          const color = item.success ? '#22c55e' : '#ef4444';
          return (
            <View style={[s.card, { borderLeftColor: color }]}>
              <View style={s.row}>
                <Ionicons name={item.success ? 'checkmark-circle' : 'close-circle'} size={22} color={color} />
                <View style={{ flex: 1 }}>
                  <Text style={s.n}>{new Date(item.runAt).toLocaleString('tr-TR')}</Text>
                  <Text style={s.sub}>{item.durationSec}sn · {item.message || ''}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
      <TouchableOpacity style={s.fab} onPress={run} disabled={busy}>
        <Ionicons name={busy ? 'hourglass-outline' : 'play'} size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});

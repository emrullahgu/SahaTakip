// ExecutiveSummaryScreen — POZ-DEV-442
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { ExecutiveSummary } from '../types';
import { listExecutiveSummaries, generateExecutiveSummary } from '../services/bi';

export default function ExecutiveSummaryScreen() {
  const [items, setItems] = useState<ExecutiveSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setItems(await listExecutiveSummaries()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const generate = async () => {
    setBusy(true);
    try {
      await generateExecutiveSummary();
      await load();
    } catch (e: any) {
      Alert.alert('Hata', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.bar}>
        <Text style={s.title}>Yönetim Özetleri</Text>
        <TouchableOpacity onPress={generate} disabled={busy} style={[s.gen, busy && { opacity: 0.6 }]}>
          <Ionicons name="sparkles-outline" size={16} color="#fff" />
          <Text style={s.genT}>{busy ? 'Oluşturuluyor…' : 'Yeni Özet'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={s.empty}>Henüz özet yok. "Yeni Özet" ile oluşturabilirsin.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="document-text-outline" size={20} color="#a855f7" />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={s.h}>Yönetim Özeti · {item.period}</Text>
                <Text style={s.d}>{new Date(item.generatedAt).toLocaleString('tr-TR')}</Text>
              </View>
            </View>
            {item.highlights.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={[s.sec, { color: '#22c55e' }]}>Öne Çıkanlar</Text>
                {item.highlights.map((h, i) => (
                  <Text key={i} style={s.li}>• {h}</Text>
                ))}
              </View>
            )}
            {item.warnings.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={[s.sec, { color: '#ef4444' }]}>Uyarılar</Text>
                {item.warnings.map((w, i) => (
                  <Text key={i} style={s.li}>• {w}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  gen: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a855f7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, gap: 6 },
  genT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center' },
  h: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  d: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  sec: { fontSize: typography.sm, fontWeight: '700', marginBottom: 4 },
  li: { color: colors.text.primary, fontSize: typography.xs, marginBottom: 2 },
});

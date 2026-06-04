// AiWorkOrderSummaryScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiWorkOrderSummary } from '../types';
import { listWoSummaries, summarizeWorkOrder } from '../services/aiAssistant';

export default function AiWorkOrderSummaryScreen() {
  const [items, setItems] = useState<AiWorkOrderSummary[]>([]);
  const [woId, setWoId] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setItems(await listWoSummaries()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onGen = async () => {
    if (!woId.trim()) return;
    setBusy(true);
    try {
      await summarizeWorkOrder(woId.trim()); setWoId(''); load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'İş emri özeti üretilemedi.');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.head}>
        <TextInput style={s.input} value={woId} onChangeText={setWoId} placeholder="İş emri no (örn: WO-2024-0451)" placeholderTextColor={colors.text.faint} />
        <TouchableOpacity
          style={[s.btn, (busy || !woId.trim()) && { opacity: 0.5 }]}
          onPress={onGen}
          disabled={busy || !woId.trim()}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !woId.trim(), busy }}
          accessibilityLabel="İş emri için AI özeti üret"
        >
          <Ionicons name={busy ? 'hourglass-outline' : 'sparkles'} size={18} color="#fff" />
          <Text style={s.btnT}>{busy ? 'Üretiliyor…' : 'Özet Üret'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.wo}>{item.workOrderId}</Text>
            <Text style={s.sum}>{item.summary}</Text>
            <View style={s.hl}>
              {item.highlights.map(h => (
                <View key={h} style={s.tag}><Ionicons name="checkmark" size={10} color="#8b5cf6" /><Text style={s.tagT}>{h}</Text></View>
              ))}
            </View>
            <Text style={s.tm}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  head: { padding: spacing.sm, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#8b5cf6', padding: spacing.sm, borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '700' },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  wo: { color: '#8b5cf6', fontSize: typography.sm, fontWeight: '800' },
  sum: { color: colors.text.primary, fontSize: typography.sm },
  hl: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: '#8b5cf6' },
  tagT: { color: '#8b5cf6', fontSize: 10, fontWeight: '700' },
  tm: { color: colors.text.faint, fontSize: 10 },
});

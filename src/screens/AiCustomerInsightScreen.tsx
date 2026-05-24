// AiCustomerInsightScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiCustomerInsight } from '../types';
import { listCustomerInsights, generateCustomerInsight } from '../services/aiAssistant';

export default function AiCustomerInsightScreen() {
  const [items, setItems] = useState<AiCustomerInsight[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setItems(await listCustomerInsights()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onGen = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await generateCustomerInsight('cust-' + Date.now(), name); setName(''); load(); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.head}>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Müşteri adı" placeholderTextColor={colors.text.faint} />
        <TouchableOpacity style={[s.btn, busy && { opacity: 0.5 }]} onPress={onGen} disabled={busy}>
          <Ionicons name={busy ? 'hourglass-outline' : 'sparkles'} size={18} color="#fff" />
          <Text style={s.btnT}>Özet Üret</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <Ionicons name="person-circle" size={32} color="#a855f7" />
              <View style={{ flex: 1 }}>
                <Text style={s.n}>{item.customerName}</Text>
                <Text style={s.sum}>{item.summary}</Text>
              </View>
            </View>
            <View style={s.metrics}>
              <View style={s.m}>
                <Text style={s.mV}>{item.quotesCount}</Text>
                <Text style={s.mL}>Teklif</Text>
              </View>
              <View style={s.m}>
                <Text style={s.mV}>{item.workOrdersCount}</Text>
                <Text style={s.mL}>İş Emri</Text>
              </View>
              <View style={s.m}>
                <Text style={[s.mV, { color: '#22c55e' }]}>₺{(item.totalRevenue / 1000).toFixed(0)}K</Text>
                <Text style={s.mL}>Ciro</Text>
              </View>
            </View>
            {item.lastVisitAt && <Text style={s.tm}>Son ziyaret: {new Date(item.lastVisitAt).toLocaleDateString('tr-TR')}</Text>}
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
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#a855f7', padding: spacing.sm, borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '700' },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  n: { color: colors.text.primary, fontSize: typography.md, fontWeight: '700' },
  sum: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  m: { flex: 1, padding: spacing.sm, backgroundColor: colors.bg.primary, borderRadius: radius.sm, alignItems: 'center' },
  mV: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  mL: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10 },
});

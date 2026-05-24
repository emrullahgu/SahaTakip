// Faz 44 — SmartRouteSuggestScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { SmartRouteSuggestion } from '../types';
import { listRoutes, generateRoute } from '../services/liveOps';
import EmptyState from '../components/EmptyState';
import { FLATLIST_DEFAULTS } from '../utils/perf';

export default function SmartRouteSuggestScreen() {
  const [items, setItems] = useState<SmartRouteSuggestion[]>([]);
  const [name, setName] = useState('');
  const [count, setCount] = useState('3');
  const load = useCallback(async () => { setItems(await listRoutes()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onGen = async () => {
    if (!name.trim()) { Alert.alert('Eksik', 'Personel adı girin.'); return; }
    await generateRoute(name, Math.max(2, Math.min(6, Number(count) || 3)));
    setName(''); load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.genBox}>
        <TextInput style={[s.input, { flex: 2 }]} value={name} onChangeText={setName} placeholder="Personel adı" placeholderTextColor={colors.text.faint} />
        <TextInput style={[s.input, { flex: 1 }]} value={count} onChangeText={setCount} keyboardType="numeric" placeholder="Durak" placeholderTextColor={colors.text.faint} />
        <TouchableOpacity style={s.genBtn} onPress={onGen}>
          <Ionicons name="git-network" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        {...FLATLIST_DEFAULTS}
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        ListEmptyComponent={
          <EmptyState
            icon="git-network-outline"
            title="Rota önerisi yok"
            subtitle="Personel için akıllı rota oluşturmak üzere yukarıdaki formu kullanın."
          />
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.head}>
              <Ionicons name="person" size={18} color="#0ea5e9" />
              <Text style={s.pn}>{item.personnelName}</Text>
              <View style={s.savings}>
                <Ionicons name="trending-down" size={12} color="#22c55e" />
                <Text style={s.savingsT}>{item.savingsMin}dk tasarruf</Text>
              </View>
            </View>
            <View style={s.metrics}>
              <View style={s.met}><Text style={s.mv}>{item.totalKm.toFixed(1)}</Text><Text style={s.ml}>km</Text></View>
              <View style={s.met}><Text style={s.mv}>{item.totalMin}</Text><Text style={s.ml}>dk</Text></View>
              <View style={s.met}><Text style={s.mv}>{item.stops.length}</Text><Text style={s.ml}>durak</Text></View>
            </View>
            {item.stops.map((st: any, i: number) => (
              <View key={`${item.id}-${i}`} style={s.stop}>
                <View style={s.stopNum}><Text style={s.stopNumT}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stopT}>{st.customerName}</Text>
                  <Text style={s.stopA}>{st.jobId} · {st.address}</Text>
                </View>
                <Text style={s.stopE}>{st.etaMin}dk · {st.distanceKm}km</Text>
              </View>
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  genBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  genBtn: { paddingHorizontal: spacing.md, backgroundColor: '#8b5cf6', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  card: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pn: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800', flex: 1 },
  savings: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#22c55e22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  savingsT: { color: '#22c55e', fontSize: 10, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginVertical: 4 },
  met: { flex: 1, padding: 6, backgroundColor: colors.bg.primary, borderRadius: radius.sm, alignItems: 'center' },
  mv: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  ml: { color: colors.text.muted, fontSize: 10 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  stopNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
  stopNumT: { color: '#fff', fontSize: typography.xs, fontWeight: '800' },
  stopT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  stopA: { color: colors.text.muted, fontSize: 10 },
  stopE: { color: '#0ea5e9', fontSize: 10, fontWeight: '700' },
});

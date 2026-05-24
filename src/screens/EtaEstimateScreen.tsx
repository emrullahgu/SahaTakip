// Faz 44 — EtaEstimateScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { EtaEstimateRecord } from '../types';
import { listEta, calculateEta } from '../services/liveOps';

export default function EtaEstimateScreen() {
  const [items, setItems] = useState<EtaEstimateRecord[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dist, setDist] = useState('10');
  const load = useCallback(async () => { setItems(await listEta()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onCalc = async () => {
    if (!from.trim() || !to.trim()) { Alert.alert('Eksik', 'Nereden/Nereye girin.'); return; }
    await calculateEta(from, to, Number(dist) || 10);
    setFrom(''); setTo(''); load();
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.card}>
        <Text style={s.h}>ETA Hesaplama</Text>
        <TextInput style={s.input} value={from} onChangeText={setFrom} placeholder="Nereden..." placeholderTextColor={colors.text.faint} />
        <TextInput style={s.input} value={to} onChangeText={setTo} placeholder="Nereye..." placeholderTextColor={colors.text.faint} />
        <TextInput style={s.input} value={dist} onChangeText={setDist} keyboardType="numeric" placeholder="Mesafe (km)" placeholderTextColor={colors.text.faint} />
        <TouchableOpacity style={s.btn} onPress={onCalc}>
          <Ionicons name="time" size={18} color="#fff" />
          <Text style={s.btnT}>Hesapla</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const trafficPct = item.baseMin === 0 ? 0 : (item.trafficMin / item.baseMin) * 100;
          const cong = trafficPct > 50 ? '#ef4444' : trafficPct > 30 ? '#f59e0b' : '#22c55e';
          return (
            <View style={[s.row, { borderLeftColor: cong }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.r1}>{item.fromLabel} → {item.toLabel}</Text>
                <Text style={s.r2}>{item.distanceKm} km · Baz {item.baseMin}dk · Trafik +{item.trafficMin}dk</Text>
              </View>
              <View style={[s.eta, { backgroundColor: cong }]}>
                <Text style={s.etaV}>{item.etaMin}</Text>
                <Text style={s.etaL}>dk</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { margin: spacing.md, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, gap: spacing.sm },
  h: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  input: { backgroundColor: colors.bg.primary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.sm, backgroundColor: '#f59e0b', borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  r1: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  r2: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  eta: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  etaV: { color: '#fff', fontSize: typography.lg, fontWeight: '800' },
  etaL: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

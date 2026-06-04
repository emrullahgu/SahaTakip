// AiPozSuggestScreen — Faz 41
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { AiPozSuggestion } from '../types';
import { listPozSuggestions, suggestPoz, acceptPoz } from '../services/aiAssistant';

export default function AiPozSuggestScreen() {
  const [items, setItems] = useState<AiPozSuggestion[]>([]);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setItems(await listPozSuggestions()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSuggest = async () => {
    if (!desc.trim()) return;
    setBusy(true);
    try {
      await suggestPoz(desc); setDesc(''); load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'POZ önerisi alınamadı.');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.head}>
        <TextInput style={s.input} value={desc} onChangeText={setDesc} placeholder="İş tanımı girin (örn: 50kVA trafo bakımı)" placeholderTextColor={colors.text.faint} multiline />
        <TouchableOpacity
          style={[s.btn, (busy || !desc.trim()) && { opacity: 0.5 }]}
          onPress={onSuggest}
          disabled={busy || !desc.trim()}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !desc.trim(), busy }}
          accessibilityLabel="İş tanımından POZ öner"
        >
          <Ionicons name={busy ? 'hourglass-outline' : 'sparkles'} size={18} color="#fff" />
          <Text style={s.btnT}>{busy ? 'Öneriliyor…' : 'POZ Öner'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => {
          const cPct = Math.round(item.confidence * 100);
          const cColor = cPct > 85 ? '#22c55e' : cPct > 70 ? '#eab308' : '#f97316';
          return (
            <View style={s.card}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.code}>{item.pozCode}</Text>
                  <Text style={s.name}>{item.pozName}</Text>
                  <Text style={s.desc}>{item.description}</Text>
                </View>
                <View style={[s.conf, { backgroundColor: cColor }]}><Text style={s.confT}>%{cPct}</Text></View>
              </View>
              <View style={s.actions}>
                <Text style={s.price}>₺{item.unitPrice.toLocaleString('tr-TR')}</Text>
                {item.accepted === true ? (
                  <View style={s.acc}><Ionicons name="checkmark-circle" size={14} color="#22c55e" /><Text style={s.accT}>Kabul</Text></View>
                ) : item.accepted === false ? (
                  <View style={s.rej}><Ionicons name="close-circle" size={14} color="#ef4444" /><Text style={s.rejT}>Red</Text></View>
                ) : (
                  <View style={s.aRow}>
                    <TouchableOpacity style={s.aBtn} onPress={async () => { await acceptPoz(item.id, true); load(); }}>
                      <Ionicons name="checkmark" size={14} color="#22c55e" />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.aBtn} onPress={async () => { await acceptPoz(item.id, false); load(); }}>
                      <Ionicons name="close" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
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
  head: { padding: spacing.sm, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  input: { backgroundColor: colors.bg.secondary, color: colors.text.primary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, minHeight: 50 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10b981', padding: spacing.sm, borderRadius: radius.sm },
  btnT: { color: '#fff', fontWeight: '700' },
  card: { padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', gap: spacing.sm },
  code: { color: '#10b981', fontSize: typography.xs, fontWeight: '800' },
  name: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700', marginTop: 2 },
  desc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  conf: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  confT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  price: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  aRow: { flexDirection: 'row', gap: 6 },
  aBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.primary },
  acc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accT: { color: '#22c55e', fontSize: typography.xs, fontWeight: '700' },
  rej: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rejT: { color: '#ef4444', fontSize: typography.xs, fontWeight: '700' },
});

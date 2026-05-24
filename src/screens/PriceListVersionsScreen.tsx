// Faz 43 — PriceListVersionsScreen
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { PriceListVersion } from '../types';
import { listPriceVersions, setCurrentPriceVersion } from '../services/smartQuote';

export default function PriceListVersionsScreen() {
  const [items, setItems] = useState<PriceListVersion[]>([]);
  const load = useCallback(async () => { setItems(await listPriceVersions()); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onActivate = (id: string) => {
    Alert.alert('Aktif Fiyat Listesi', 'Bu versiyon güncel olarak işaretlensin mi?', [
      { text: 'Vazgeç' },
      { text: 'Onayla', onPress: async () => { await setCurrentPriceVersion(id); load(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <View style={[s.card, item.isCurrent && { borderColor: '#22c55e', borderWidth: 2 }]}>
            <Ionicons name="pricetag" size={22} color={item.isCurrent ? '#22c55e' : colors.text.muted} />
            <View style={{ flex: 1 }}>
              <View style={s.row}>
                <Text style={s.name}>{item.name}</Text>
                {item.isCurrent && <View style={s.active}><Text style={s.activeT}>GÜNCEL</Text></View>}
              </View>
              <Text style={s.ver}>Versiyon: {item.version}</Text>
              <Text style={s.cnt}>{item.itemCount} kalem</Text>
              <Text style={s.tm}>Aktif: {new Date(item.activeFrom).toLocaleDateString('tr-TR')}</Text>
            </View>
            {!item.isCurrent && (
              <TouchableOpacity style={s.btn} onPress={() => onActivate(item.id)}>
                <Text style={s.btnT}>Aktif Et</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800', flex: 1 },
  active: { backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  activeT: { color: '#fff', fontSize: 10, fontWeight: '800' },
  ver: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  cnt: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  tm: { color: colors.text.faint, fontSize: 10, marginTop: 2 },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: '#0ea5e9' },
  btnT: { color: '#fff', fontSize: typography.xs, fontWeight: '700' },
});

// Faz 42 — FieldChecklistScreen: zorunlu kontroller
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import type { FieldChecklistItem, RootStackParamList } from '../types';
import { listChecklist, toggleChecklist, CHECK_TYPE_LABEL, CHECK_TYPE_ICON } from '../services/fieldOps';

type R = RouteProp<RootStackParamList, 'FieldChecklist'>;

export default function FieldChecklistScreen() {
  const route = useRoute<R>();
  const [items, setItems] = useState<FieldChecklistItem[]>([]);
  const load = useCallback(async () => { setItems(await listChecklist(route.params.jobId)); }, [route.params.jobId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const completed = items.filter(i => i.done).length;
  const required = items.filter(i => i.required).length;
  const requiredDone = items.filter(i => i.required && i.done).length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <View style={s.summary}>
        <Text style={s.summaryT}>{completed} / {items.length} tamamlandı</Text>
        <Text style={s.summaryR}>Zorunlu: {requiredDone}/{required}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, item.done && s.cardDone]} onPress={async () => { await toggleChecklist(item.id); load(); }}>
            <Ionicons name={(item.done ? 'checkmark-circle' : 'ellipse-outline') as any} size={26} color={item.done ? '#22c55e' : colors.text.muted} />
            <View style={s.icon}><Ionicons name={CHECK_TYPE_ICON[item.type] as any} size={18} color="#0ea5e9" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, item.done && s.labelDone]}>{item.label}</Text>
              <Text style={s.type}>{CHECK_TYPE_LABEL[item.type]}{item.required && ' · Zorunlu'}</Text>
              {item.doneAt && <Text style={s.tm}>{new Date(item.doneAt).toLocaleTimeString('tr-TR')}</Text>}
            </View>
            {item.required && !item.done && <View style={s.req}><Text style={s.reqT}>!</Text></View>}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  summary: { padding: spacing.md, backgroundColor: colors.bg.secondary, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
  summaryT: { color: colors.text.primary, fontSize: typography.md, fontWeight: '800' },
  summaryR: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary },
  cardDone: { opacity: 0.6 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  labelDone: { textDecorationLine: 'line-through' },
  type: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  tm: { color: colors.text.faint, fontSize: 10 },
  req: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  reqT: { color: '#fff', fontWeight: '800' },
});

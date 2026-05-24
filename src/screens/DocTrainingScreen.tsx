// Faz 54 — DocTrainingScreen (POZ-DEV-251)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listDocTraining, DOC_AUDIENCE_LABEL, DOC_AUDIENCE_COLOR } from '../services/docs';
import type { DocTrainingScript } from '../types';

export default function DocTrainingScreen() {
  const [items, setItems] = useState<DocTrainingScript[]>([]);
  useFocusEffect(useCallback(() => { (async () => setItems(await listDocTraining()))(); }, []));

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="play-circle" size={48} color="#ec4899" />
          <Text style={s.heroT}>Eğitim Videosu Senaryoları</Text>
          <Text style={s.heroD}>{items.length} senaryo • Rol bazlı ekran kayıt planı</Text>
        </View>

        {items.map(t => {
          const color = DOC_AUDIENCE_COLOR[t.targetRole];
          return (
            <View key={t.id} style={[s.card, { borderLeftColor: color }]}>
              <View style={s.headRow}>
                <View style={[s.tag, { backgroundColor: color + '33', borderColor: color }]}>
                  <Text style={[s.tagT, { color }]}>{DOC_AUDIENCE_LABEL[t.targetRole]}</Text>
                </View>
                <View style={s.dur}>
                  <Ionicons name="time" size={12} color="#ec4899" />
                  <Text style={s.durT}>{t.totalMin} dk</Text>
                </View>
              </View>
              <Text style={s.title}>{t.title}</Text>
              <View style={s.scenesBox}>
                {t.scenes.map(sc => (
                  <View key={sc.order} style={s.sceneRow}>
                    <View style={[s.orderBox, { backgroundColor: color }]}><Text style={s.orderT}>{sc.order}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sceneT}>{sc.text}</Text>
                      <Text style={s.sceneDur}>{sc.durationSec}sn</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: spacing.md, gap: spacing.sm },
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#ec4899', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  card: { backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  tagT: { fontSize: 10, fontWeight: '800' },
  dur: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  durT: { color: '#ec4899', fontSize: typography.xs, fontWeight: '700' },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '800' },
  scenesBox: { backgroundColor: colors.bg.primary, padding: 8, borderRadius: 6, gap: 8 },
  sceneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderBox: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  orderT: { color: '#fff', fontSize: 11, fontWeight: '800' },
  sceneT: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '700' },
  sceneDur: { color: colors.text.muted, fontSize: 10, marginTop: 1 },
});

// FormStatsScreen — POZ-DEV-151 Form istatistik özeti (kategori + şablon)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../theme';
import { RootStackParamList, FormResponse, FormTemplate } from '../types';
import { listResponses } from '../services/formResponses';
import { listTemplates } from '../services/formTemplates';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface TplStat {
  templateId: string;
  name: string;
  category: string;
  count: number;
  lastUpdated?: string;
}

export default function FormStatsScreen() {
  const nav = useNavigation<Nav>();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [resps, tpls] = await Promise.all([listResponses(), listTemplates()]);
      setResponses(resps);
      setTemplates(tpls);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { byCategory, byTemplate, totalAll } = useMemo(() => {
    const cats = new Map<string, number>();
    const tplMap = new Map<string, TplStat>();
    for (const t of templates) {
      tplMap.set(t.id, { templateId: t.id, name: t.name, category: t.category, count: 0 });
    }
    for (const r of responses) {
      const tpl = tplMap.get(r.templateId);
      if (tpl) {
        tpl.count += 1;
        if (!tpl.lastUpdated || r.updatedAt > tpl.lastUpdated) tpl.lastUpdated = r.updatedAt;
        cats.set(tpl.category, (cats.get(tpl.category) || 0) + 1);
      } else {
        cats.set('Diğer', (cats.get('Diğer') || 0) + 1);
      }
    }
    const catList = Array.from(cats.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
    const tplList = Array.from(tplMap.values()).sort((a, b) => b.count - a.count);
    return { byCategory: catList, byTemplate: tplList, totalAll: responses.length };
  }, [responses, templates]);

  const maxCat = byCategory[0]?.count || 1;
  const maxTpl = byTemplate[0]?.count || 1;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color="#f59e0b" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.text.muted} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="stats-chart-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Form İstatistik</Text>
            <Text style={styles.heroSub}>{totalAll} yanıt · {templates.length} şablon</Text>
          </View>
        </View>

        <Text style={styles.section}>Kategori Bazlı</Text>
        {byCategory.length === 0 ? (
          <Text style={styles.empty}>Henüz veri yok</Text>
        ) : (
          byCategory.map(c => (
            <View key={c.category} style={styles.barRow}>
              <View style={[styles.dot, { backgroundColor: catColor(c.category) }]} />
              <View style={{ flex: 1 }}>
                <View style={styles.barTopRow}>
                  <Text style={styles.barLabel}>{c.category}</Text>
                  <Text style={styles.barCount}>{c.count}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(c.count / maxCat) * 100}%`, backgroundColor: catColor(c.category) }]} />
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={styles.section}>Şablon Bazlı (en çok kullanılan)</Text>
        {byTemplate.filter(t => t.count > 0).length === 0 ? (
          <Text style={styles.empty}>Henüz şablon kullanımı yok</Text>
        ) : (
          byTemplate.filter(t => t.count > 0).map(t => (
            <TouchableOpacity
              key={t.templateId}
              style={styles.tplRow}
              activeOpacity={0.85}
              onPress={() => nav.navigate('FormResponses', { templateId: t.templateId })}
            >
              <View style={[styles.tplBadge, { backgroundColor: catColor(t.category) }]}>
                <Text style={styles.tplBadgeText}>{t.count}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tplName} numberOfLines={1}>{t.name}</Text>
                <Text style={styles.tplMeta}>{t.category}{t.lastUpdated ? ` · ${new Date(t.lastUpdated).toLocaleDateString('tr-TR')}` : ''}</Text>
                <View style={[styles.barTrack, { marginTop: 4 }]}>
                  <View style={[styles.barFill, { width: `${(t.count / maxTpl) * 100}%`, backgroundColor: catColor(t.category) }]} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function catColor(cat: string): string {
  switch (cat) {
    case 'Denetim': return '#0ea5e9';
    case 'Bakım': return '#22c55e';
    case 'Arıza Tespit': return '#ef4444';
    case 'Montaj': return '#8b5cf6';
    case 'Teslimat': return '#f59e0b';
    default: return '#64748b';
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, backgroundColor: '#f59e0b', borderRadius: radius.md, marginBottom: spacing.md },
  heroIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: typography.xs, marginTop: 2 },
  section: { color: colors.text.primary, fontWeight: '800', fontSize: typography.sm, marginTop: spacing.md, marginBottom: spacing.xs },
  empty: { color: colors.text.muted, fontSize: typography.xs, padding: spacing.md, textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  barTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  barCount: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },
  barTrack: { height: 6, backgroundColor: colors.bg.primary, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  tplRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bg.secondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.primary, marginBottom: spacing.xs },
  tplBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tplBadgeText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  tplName: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  tplMeta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
});

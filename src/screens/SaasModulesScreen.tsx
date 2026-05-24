// Faz 50 — SaasModulesScreen (POZ-DEV-203)
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../theme';
import { listSaasModules, toggleSaasModule, SAAS_PLAN_LABEL, SAAS_PLAN_COLOR } from '../services/saas';
import type { SaasModuleToggle } from '../types';
import EmptyState from '../components/EmptyState';

const CAT_LABEL: Record<SaasModuleToggle['category'], string> = {
  core: 'Çekirdek', finance: 'Finans', field: 'Saha', analytics: 'Analitik', integration: 'Entegrasyon', ai: 'AI',
};
const CAT_ICON: Record<SaasModuleToggle['category'], string> = {
  core: 'cube', finance: 'cash', field: 'navigate', analytics: 'analytics', integration: 'git-network', ai: 'sparkles',
};
const CAT_COLOR: Record<SaasModuleToggle['category'], string> = {
  core: '#64748b', finance: '#22c55e', field: '#0ea5e9', analytics: '#a855f7', integration: '#f59e0b', ai: '#ec4899',
};

export default function SaasModulesScreen() {
  const [items, setItems] = useState<SaasModuleToggle[]>([]);
  const load = useCallback(async () => setItems(await listSaasModules()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (id: string) => { await toggleSaasModule(id); await load(); };

  const grouped = useMemo(() => items.reduce<Record<string, SaasModuleToggle[]>>((acc, m) => {
    (acc[m.category] ||= []).push(m); return acc;
  }, {}), [items]);

  const enabledCount = items.filter(m => m.enabled).length;

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <Ionicons name="apps" size={48} color="#a855f7" />
          <Text style={s.heroT}>Modül Yönetimi</Text>
          <Text style={s.heroD}>{enabledCount} / {items.length} modül aktif</Text>
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon="apps-outline"
            title="Modül bulunamadı"
            subtitle="Sistemde yapılandırılabilecek modül kaydı bulunmuyor."
          />
        ) : Object.entries(grouped).map(([cat, list]) => {
          const c = CAT_COLOR[cat as SaasModuleToggle['category']];
          return (
            <View key={cat} style={{ gap: 6 }}>
              <View style={s.catHead}>
                <Ionicons name={CAT_ICON[cat as SaasModuleToggle['category']] as any} size={16} color={c} />
                <Text style={[s.catT, { color: c }]}>{CAT_LABEL[cat as SaasModuleToggle['category']]}</Text>
              </View>
              {list.map(m => (
                <View key={m.id} style={[s.row, { borderLeftColor: m.enabled ? '#22c55e' : '#64748b' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>{m.name}</Text>
                    <Text style={s.desc}>{m.description}</Text>
                    <View style={s.planRow}>
                      {m.availableIn.map(p => (
                        <View key={p} style={[s.planPill, { backgroundColor: SAAS_PLAN_COLOR[p] + '33', borderColor: SAAS_PLAN_COLOR[p] }]}>
                          <Text style={[s.planT, { color: SAAS_PLAN_COLOR[p] }]}>{SAAS_PLAN_LABEL[p]}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Switch
                    value={m.enabled}
                    onValueChange={() => toggle(m.id)}
                    trackColor={{ true: '#22c55e', false: '#475569' }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
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
  heroCard: { backgroundColor: colors.bg.secondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#a855f7', alignItems: 'center', gap: 4 },
  heroT: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '800' },
  heroD: { color: colors.text.muted, fontSize: typography.sm },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  catT: { fontSize: typography.sm, fontWeight: '800', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg.secondary, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border.primary, borderLeftWidth: 4 },
  label: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '700' },
  desc: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  planRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  planPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  planT: { fontSize: 10, fontWeight: '800' },
});
